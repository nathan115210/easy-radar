import type { NewsItem, NewsStatesFile } from "../../shared/schemas/index.js";
import { isReadExpired } from "./month-expiry.js";
import { isLiveTombstone } from "./tombstone.js";

export type CleanupResult = {
  items: NewsItem[];
  statesFile: NewsStatesFile;
  /** Expired ignore tombstones removed from news-states.json. */
  prunedTombstoneIds: string[];
  /** Active items scrubbed because they reappeared while still tombstoned. */
  reAddedIgnoredIds: string[];
  /** `read` items past the two-calendar-month window, removed from both files. */
  expiredReadIds: string[];
};

/**
 * The collection pipeline's cleanup step (PRD §10, §18.5 step 4): runs
 * immediately after collection/merge and before validation. Order matters:
 *
 * 1. Prune expired ignore tombstones first, so an id whose 48h window has
 *    already passed is treated as ordinary — a reappearance of that id is
 *    a genuine republish, not a re-add to scrub.
 * 2. Only *then* scrub any active item that still has a live tombstone —
 *    that's the 36h collection overlap re-adding something the user just
 *    ignored, which is exactly what the tombstone exists to catch.
 * 3. Expire `read` items past two calendar months, from both files.
 *
 * Unread items never match any of these conditions, so they're retained
 * regardless of age (PRD §10) without needing special-case code for it.
 * Pure and synchronous — the caller (pipeline or standalone CLI) owns all
 * file I/O — so every rule here is unit-testable without touching disk.
 */
export function runCleanup(
  items: readonly NewsItem[],
  statesFile: NewsStatesFile,
  now: Date = new Date(),
): CleanupResult {
  const states = { ...statesFile.items };

  const prunedTombstoneIds: string[] = [];
  for (const [id, state] of Object.entries(states)) {
    if (state.state === "ignored" && !isLiveTombstone(state, now)) {
      delete states[id];
      prunedTombstoneIds.push(id);
    }
  }

  const removeFromNews = new Set<string>();
  const reAddedIgnoredIds: string[] = [];
  for (const item of items) {
    if (states[item.id]?.state === "ignored") {
      removeFromNews.add(item.id);
      reAddedIgnoredIds.push(item.id);
    }
  }

  const expiredReadIds: string[] = [];
  for (const [id, state] of Object.entries(states)) {
    if (isReadExpired(state, now)) {
      removeFromNews.add(id);
      delete states[id];
      expiredReadIds.push(id);
    }
  }

  return {
    items: items.filter((item) => !removeFromNews.has(item.id)),
    statesFile: { schemaVersion: statesFile.schemaVersion, items: states },
    prunedTombstoneIds,
    reAddedIgnoredIds,
    expiredReadIds,
  };
}
