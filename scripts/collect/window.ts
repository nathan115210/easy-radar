import type { NewsItem, SourceCursor } from "../../shared/schemas/index.js";

/** Normal runs inspect the previous 36 hours (PRD §11.2). */
export const COLLECTION_WINDOW_HOURS = 36;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The lower bound of what a run should accept. On a source's first sync
 * (no cursor yet), that's the approved `initialSyncFrom` cutoff — not
 * capped at 36h, since a first sync is a deliberate historical backfill,
 * not a routine check.
 *
 * On every later run, the bound is the earlier of "36 hours ago" and the
 * cursor's position (`lastRunAt`). When the cursor is recent (the normal
 * case), that's just the 36h window, which exists as a safety overlap for
 * late-published items — real duplicates are caught downstream by id-based
 * dedup. When the cursor is old (a week-long holiday, a paused schedule),
 * the window naturally extends back to the cursor instead of skipping the
 * gap — this is gap recovery (PRD §11.2, §16), with no separate code path.
 */
export function computeWindowStart(
  cursor: SourceCursor | undefined,
  initialSyncFrom: string,
  now: Date,
): Date {
  if (!cursor) {
    return new Date(`${initialSyncFrom}T00:00:00.000Z`);
  }

  const windowFloor = new Date(now.getTime() - COLLECTION_WINDOW_HOURS * 60 * 60 * 1000);
  const cursorPosition = new Date(cursor.lastRunAt);
  return cursorPosition.getTime() < windowFloor.getTime() ? cursorPosition : windowFloor;
}

/** Item dates are day-granularity (YYYY-MM-DD), so the window compares at that resolution. */
export function isWithinWindow(item: Pick<NewsItem, "date">, windowStart: Date): boolean {
  return item.date >= toDateOnly(windowStart);
}
