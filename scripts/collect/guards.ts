import type { NewsItem, RunRejectionReason, SourceCursor } from "../../shared/schemas/index.js";

export type GuardResult =
  { rejected: false } | { rejected: true; reason: RunRejectionReason; detail: string };

/**
 * Calibrated against roughly 150 monitored sources producing a few dozen
 * items on a normal day, leaving three-to-five-fold headroom (PRD §18.6).
 * An estimate, not a measurement — revisit after several weeks of real
 * data (#43).
 */
export const DEFAULT_VOLUME_GUARD_THRESHOLD = 200;

/**
 * PRD §18.6's statistical backstop against a run that's well-formed but
 * substantively wrong (a redesigned site parsed as 150 news items, a
 * cursor collapse re-importing full history). Bypassable only through the
 * explicit `allow_large_change` escape hatch (#44) — never automatically,
 * and never by the `schedule` trigger.
 */
export function checkVolumeGuard(
  addedCount: number,
  threshold: number = DEFAULT_VOLUME_GUARD_THRESHOLD,
): GuardResult {
  if (addedCount > threshold) {
    return {
      rejected: true,
      reason: "volume-guard",
      detail: `${addedCount} items added, exceeds threshold of ${threshold}`,
    };
  }
  return { rejected: false };
}

/**
 * A cursor's lastRunAt must never move backward (PRD §18.6) — that would
 * signal a corrupted cursor causing repeated re-collection. Compared as
 * ISO 8601 strings, which sort lexicographically in chronological order.
 */
export function checkCursorRegression(
  previousCursors: Readonly<Record<string, SourceCursor>>,
  updatedCursors: Readonly<Record<string, SourceCursor>>,
): GuardResult {
  for (const [sourceId, updated] of Object.entries(updatedCursors)) {
    const previous = previousCursors[sourceId];
    if (previous && updated.lastRunAt < previous.lastRunAt) {
      return {
        rejected: true,
        reason: "cursor-regression",
        detail: `Source "${sourceId}" cursor regressed from ${previous.lastRunAt} to ${updated.lastRunAt}`,
      };
    }
  }
  return { rejected: false };
}

function newsItemsEqual(a: NewsItem, b: NewsItem): boolean {
  return (
    a.id === b.id &&
    a.sourceId === b.sourceId &&
    a.heading === b.heading &&
    a.label === b.label &&
    a.link === b.link &&
    a.date === b.date &&
    a.dateBasis === b.dateBasis &&
    a.category === b.category &&
    a.tags.length === b.tags.length &&
    a.tags.every((tag, index) => tag === b.tags[index])
  );
}

/**
 * Active item metadata is append-only (PRD §8): once written, an existing
 * item's fields never change, and it's never removed except by §10
 * cleanup. Anything else disappearing or changing is anomalous — the
 * canonical failure this catches is a source rewriting or re-slugging
 * items it already reported (PRD §18.6). `legitimatelyRemovedIds` is
 * exactly the set of ids the cleanup step (#24) itself removed this run,
 * so a legitimate ignore-tombstone scrub or read-item expiry never trips
 * this guard — only a disappearance or edit cleanup didn't cause does.
 * Not bypassable by `allow_large_change`, which waives only the volume
 * guard.
 */
export function checkActiveItemMutationGuard(
  previousItems: readonly NewsItem[],
  currentItems: readonly NewsItem[],
  legitimatelyRemovedIds: ReadonlySet<string>,
): GuardResult {
  const currentById = new Map(currentItems.map((item) => [item.id, item]));

  for (const previous of previousItems) {
    const current = currentById.get(previous.id);
    if (!current) {
      if (legitimatelyRemovedIds.has(previous.id)) {
        continue;
      }
      return {
        rejected: true,
        reason: "active-item-mutation",
        detail: `Active item "${previous.id}" was deleted outside of cleanup`,
      };
    }
    if (!newsItemsEqual(previous, current)) {
      return {
        rejected: true,
        reason: "active-item-mutation",
        detail: `Active item "${previous.id}" was modified; item metadata is append-only`,
      };
    }
  }

  return { rejected: false };
}
