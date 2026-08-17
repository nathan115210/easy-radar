import type { RunRejectionReason, SourceCursor } from "../../shared/schemas/index.js";

export type GuardResult =
  { rejected: false } | { rejected: true; reason: RunRejectionReason; detail: string };

const DEFAULT_VOLUME_GUARD_THRESHOLD = 200;

/**
 * PRD §18.6's statistical backstop against a run that's well-formed but
 * substantively wrong (a redesigned site parsed as 150 news items, a
 * cursor collapse re-importing full history). The full guard system,
 * including the `allow_large_change` escape hatch, is #44's job — this is
 * the minimal check #12's own acceptance criteria need: a guard-rejected
 * run must leave news.json untouched and still publish status.
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
