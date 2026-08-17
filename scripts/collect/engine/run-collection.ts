import type { NewsItem, SourceConfig, SourceCursor } from "../../../shared/schemas/index.js";
import type { AdapterRegistry } from "./adapter.js";
import { runWithConcurrency } from "./concurrency.js";
import { ConfigInvalidError } from "./errors.js";
import { withRetries } from "./retry.js";
import { withTimeout } from "./timeout.js";

export type SourceOutcome =
  | { source: SourceConfig; outcome: "planned" }
  | {
      source: SourceConfig;
      outcome: "succeeded";
      items: NewsItem[];
      cursorFragment?: Record<string, unknown>;
      attemptedAt: string;
      succeededAt: string;
    }
  | {
      source: SourceConfig;
      outcome: "failed";
      failureClass: "runtime-failing";
      reason: string;
      attemptedAt: string;
    };

export type CollectionRunOptions = {
  sources: readonly SourceConfig[];
  registry: AdapterRegistry;
  concurrency?: number;
  timeoutMs?: number;
  retries?: number;
  retryBaseDelayMs?: number;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  /** Previous cursors, keyed by source id — passed through to each adapter (see `AdapterContext.previousCursor`). */
  previousCursors?: Readonly<Record<string, SourceCursor>>;
};

export type CollectionRunResult = {
  outcomes: SourceOutcome[];
  items: NewsItem[];
};

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;

/**
 * An unsupported adapter (a source naming an adapter that isn't
 * registered) is a config-invalid failure (PRD §7.2) — collection must
 * stop before any fetch, and before any file is even created, so a
 * config-invalid run leaves the data directory exactly as it found it
 * (`runCollectPipeline` needs to check this before it touches disk at
 * all, which is why it's callable standalone rather than only inline in
 * `runCollection` below).
 */
export function validateAdapterConfig(
  sources: readonly SourceConfig[],
  registry: AdapterRegistry,
): void {
  const collectible = sources.filter((source) => source.status !== "planned");
  const unsupported = collectible.filter((source) => !registry.has(source.adapter));
  if (unsupported.length > 0) {
    const names = unsupported.map((source) => `"${source.id}" (adapter "${source.adapter}")`);
    throw new ConfigInvalidError(
      `Unsupported adapter configuration, collection stopped before any fetch: ${names.join(", ")}`,
    );
  }
}

/**
 * Drives every collectible source through its registered adapter (PRD §11,
 * §14.4). `Planned` sources are skipped entirely — not fetched, not
 * counted as failed (§7.4). Every other source is attempted with bounded
 * concurrency, a hard per-source timeout, and retries with backoff; a
 * runtime failure is isolated to that source and never rejects the run.
 */
export async function runCollection(options: CollectionRunOptions): Promise<CollectionRunResult> {
  const now = options.now ?? ((): Date => new Date());
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;

  validateAdapterConfig(options.sources, options.registry);
  const collectible = options.sources.filter((source) => source.status !== "planned");

  const planned: SourceOutcome[] = options.sources
    .filter((source) => source.status === "planned")
    .map((source) => ({ source, outcome: "planned" as const }));

  const attempted = await runWithConcurrency(
    collectible,
    concurrency,
    async (source): Promise<SourceOutcome> => {
      const attemptedAt = now().toISOString();
      // Presence was already checked above; the registry entry is guaranteed here.
      const adapter = options.registry.get(source.adapter);
      if (!adapter) {
        throw new Error(`Unreachable: adapter "${source.adapter}" missing after validation`);
      }

      try {
        const previousCursor = options.previousCursors?.[source.id];
        const items = await withRetries(
          () =>
            withTimeout((signal) => adapter.collect({ source, signal, previousCursor }), timeoutMs),
          { retries, baseDelayMs: retryBaseDelayMs, sleep: options.sleep },
        );
        const cursorFragment = adapter.deriveCursorFragment?.(items, previousCursor);
        return {
          source,
          outcome: "succeeded",
          items,
          ...(cursorFragment ? { cursorFragment } : {}),
          attemptedAt,
          succeededAt: now().toISOString(),
        };
      } catch (error) {
        return {
          source,
          outcome: "failed",
          failureClass: "runtime-failing",
          reason: (error as Error).message,
          attemptedAt,
        };
      }
    },
  );

  const outcomes = [...planned, ...attempted];
  const items = attempted.flatMap((outcome) =>
    outcome.outcome === "succeeded" ? outcome.items : [],
  );

  return { outcomes, items };
}
