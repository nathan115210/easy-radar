import {
  ensureDataFiles,
  readCollectionCursors,
  readCollectionStatus,
  readNews,
  readNewsStates,
  syncNewsStatesWithItems,
  writeCollectionCursors,
  writeCollectionStatus,
  writeNews,
  writeNewsStates,
} from "../../server/storage/index.js";
import type {
  CollectionStatusFile,
  NewsItem,
  SourceConfig,
  SourceCursor,
} from "../../shared/schemas/index.js";
import { applyCollectionWindow } from "./apply-collection-window.js";
import { runCleanup } from "../cleanup/run-cleanup.js";
import { resolveDuplicates, type DedupCandidate } from "./dedup.js";
import type { AdapterRegistry } from "./engine/adapter.js";
import { ConfigInvalidError } from "./engine/errors.js";
import { summarizeOutcomes } from "./engine/log-summary.js";
import { runCollection } from "./engine/run-collection.js";
import { buildSourceStatuses } from "./engine/source-status.js";
import { checkCursorRegression, checkVolumeGuard, type GuardResult } from "./guards.js";
import { mergeNewsItems } from "./merge-news.js";
import { validateNewsInvariants } from "../validate/news-invariants.js";
import { validateStateSync } from "../validate/state-sync.js";
import { formatIssues } from "../validate/validation-issue.js";

export type CollectPipelineOptions = {
  sources: readonly SourceConfig[];
  registry: AdapterRegistry;
  dataDir: string;
  now?: () => Date;
  concurrency?: number;
  timeoutMs?: number;
  retries?: number;
  retryBaseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  volumeGuardThreshold?: number;
};

export type CollectPipelineResult = {
  summary: string;
  exitCode: 0 | 1;
  wroteDataFiles: boolean;
  rejection?: { reason: string; detail: string };
};

/**
 * The one collector every execution path runs (manual, the AGY Skill,
 * cloud) — load config, collect, dedup, classify, synchronize state,
 * validate, write. Cleanup (#24: ignore tombstones, read-item expiry)
 * runs immediately after state sync and before validation (PRD §18.5 step
 * 4), so validation and the guards below see the cleaned data, not the
 * pre-cleanup merge. Data validation (#13: no duplicate active items,
 * state/news sync) runs inline here, before any write, and a failure is
 * treated exactly like a guard rejection: publish collection-status.json
 * with the precise reason, leave news.json untouched (PRD §17, §18.5 step
 * 7b). Deliberately not in this pipeline: the full change-guard system
 * with the `allow_large_change` escape hatch (#44) — this includes only
 * the minimal volume/cursor-regression checks #12's own acceptance
 * criteria need.
 */
export async function runCollectPipeline(
  options: CollectPipelineOptions,
): Promise<CollectPipelineResult> {
  const now = options.now ?? ((): Date => new Date());

  // Config validity (an unsupported adapter) is checked before anything is
  // written, including the first-run empty-file bootstrap below — a
  // config-invalid run must leave the data directory exactly as it found it.
  let engineResult: Awaited<ReturnType<typeof runCollection>>;
  try {
    engineResult = await runCollection({
      sources: options.sources,
      registry: options.registry,
      concurrency: options.concurrency,
      timeoutMs: options.timeoutMs,
      retries: options.retries,
      retryBaseDelayMs: options.retryBaseDelayMs,
      now: options.now,
      sleep: options.sleep,
    });
  } catch (error) {
    if (error instanceof ConfigInvalidError) {
      return {
        summary: `Config invalid, collection stopped before any fetch: ${error.message}`,
        exitCode: 1,
        wroteDataFiles: false,
      };
    }
    throw error;
  }

  await ensureDataFiles(options.dataDir);

  const previousCursorsFile = await readCollectionCursors(options.dataDir);
  const previousStatusFile = await readCollectionStatus(options.dataDir);

  const windowedItems: NewsItem[] = [];
  const updatedCursors: Record<string, SourceCursor> = { ...previousCursorsFile.cursors };

  for (const outcome of engineResult.outcomes) {
    if (outcome.outcome !== "succeeded") {
      continue;
    }
    const previousCursor = previousCursorsFile.cursors[outcome.source.id];
    const { items, updatedCursor } = applyCollectionWindow(
      outcome.items,
      outcome.source,
      previousCursor,
      now(),
    );
    windowedItems.push(...items);
    updatedCursors[outcome.source.id] = updatedCursor;
  }

  // Deduplicate across every source in this run (PRD §11.4): the most
  // specific source wins when several resolve the same canonical URL.
  const sourcesById = new Map(options.sources.map((source) => [source.id, source]));
  const candidates: DedupCandidate[] = windowedItems.map((item) => ({
    sourceId: item.sourceId,
    dedupKey: item.id,
    specificity: Object.keys(sourcesById.get(item.sourceId)?.filters ?? {}).length,
  }));
  const survivingIds = new Set(
    resolveDuplicates(candidates).map((candidate) => candidate.dedupKey),
  );
  const dedupedItems = windowedItems.filter((item) => survivingIds.has(item.id));

  const existingNews = await readNews(options.dataDir);
  const { mergedNews, addedItems } = mergeNewsItems(existingNews, dedupedItems);

  const existingStates = await readNewsStates(options.dataDir);
  const syncedStates = syncNewsStatesWithItems(existingStates, mergedNews, now());

  const cleaned = runCleanup(mergedNews, syncedStates, now());

  const validationIssues = [
    ...validateNewsInvariants(cleaned.items),
    ...validateStateSync(cleaned.items, cleaned.statesFile, now()),
  ];

  const guardResults: GuardResult[] = [
    checkVolumeGuard(addedItems.length, options.volumeGuardThreshold),
    checkCursorRegression(previousCursorsFile.cursors, updatedCursors),
    validationIssues.length > 0
      ? {
          rejected: true,
          reason: "validation-failed",
          detail: formatIssues(validationIssues),
        }
      : { rejected: false },
  ];
  const rejection = guardResults.find((result) => result.rejected);

  const succeeded = engineResult.outcomes.filter((o) => o.outcome === "succeeded").length;
  const failed = engineResult.outcomes.filter((o) => o.outcome === "failed").length;
  const planned = engineResult.outcomes.filter((o) => o.outcome === "planned").length;

  const statusFile: CollectionStatusFile = {
    schemaVersion: 1,
    lastRunAt: now().toISOString(),
    coverage: {
      succeeded,
      failed,
      planned,
      added: addedItems.length,
      total: options.sources.length,
    },
    sources: buildSourceStatuses(engineResult.outcomes, previousStatusFile.sources),
    ...(rejection?.rejected
      ? { rejected: { reason: rejection.reason, detail: rejection.detail } }
      : {}),
  };
  await writeCollectionStatus(options.dataDir, statusFile);

  const summaryLines = [summarizeOutcomes(engineResult.outcomes, addedItems.length)];
  const cleanedCount =
    cleaned.prunedTombstoneIds.length +
    cleaned.reAddedIgnoredIds.length +
    cleaned.expiredReadIds.length;
  if (cleanedCount > 0) {
    summaryLines.push(
      `Cleanup: ${cleaned.prunedTombstoneIds.length} tombstone(s) pruned, ` +
        `${cleaned.reAddedIgnoredIds.length} re-added ignored item(s) scrubbed, ` +
        `${cleaned.expiredReadIds.length} read item(s) expired`,
    );
  }

  if (rejection?.rejected) {
    summaryLines.push(`REJECTED: ${rejection.reason} — ${rejection.detail}`);
    summaryLines.push("news.json left untouched; only collection-status.json was written.");
    return {
      summary: summaryLines.join("\n"),
      exitCode: 0,
      wroteDataFiles: false,
      rejection: { reason: rejection.reason, detail: rejection.detail },
    };
  }

  await writeNews(options.dataDir, cleaned.items);
  await writeNewsStates(options.dataDir, cleaned.statesFile);
  await writeCollectionCursors(options.dataDir, { schemaVersion: 1, cursors: updatedCursors });

  return { summary: summaryLines.join("\n"), exitCode: 0, wroteDataFiles: true };
}
