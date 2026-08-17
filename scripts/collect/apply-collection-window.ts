import type { NewsItem, SourceConfig, SourceCursor } from "../../shared/schemas/index.js";
import { applyUndatedBaseline } from "./undated-baseline.js";
import { computeWindowStart, isWithinWindow } from "./window.js";

export type SourceCollectionCycleResult = {
  items: NewsItem[];
  updatedCursor: SourceCursor;
};

/**
 * Ties the collection window, gap recovery, and undated-source baseline
 * (PRD §11.2, §11.3) into one per-source step: given everything an adapter
 * returned for this run and the source's previous cursor, decides what
 * should actually be imported and what the new cursor should be.
 *
 * Deliberately adapter- and engine-agnostic — it only consumes NewsItems
 * and a cursor, so it composes with #8's engine and #9/#10's adapters
 * without depending on either. Wiring this into the full collect → merge
 * → write pipeline is #12's job.
 */
export function applyCollectionWindow(
  rawItems: readonly NewsItem[],
  source: Pick<SourceConfig, "initialSyncFrom">,
  previousCursor: SourceCursor | undefined,
  now: Date,
): SourceCollectionCycleResult {
  const windowStart = computeWindowStart(previousCursor, source.initialSyncFrom, now);
  const withinWindow = rawItems.filter((item) => isWithinWindow(item, windowStart));

  const isInitialSync = previousCursor === undefined;
  const { itemsToImport, updatedKnownUndatedIds } = applyUndatedBaseline(
    withinWindow,
    isInitialSync,
    previousCursor?.knownUndatedIds ?? [],
  );

  const lastItemDate = itemsToImport.reduce<string | undefined>(
    (latest, item) => (!latest || item.date > latest ? item.date : latest),
    previousCursor?.lastItemDate,
  );

  const updatedCursor: SourceCursor = {
    lastRunAt: now.toISOString(),
    ...(lastItemDate ? { lastItemDate } : {}),
    ...(updatedKnownUndatedIds.length > 0 ? { knownUndatedIds: updatedKnownUndatedIds } : {}),
  };

  return { items: itemsToImport, updatedCursor };
}
