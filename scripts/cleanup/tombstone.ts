import type { NewsState } from "../../shared/schemas/index.js";

/**
 * The 48-hour ignore tombstone (PRD §10): long enough that the 36-hour
 * collection window can't immediately re-add an item the user just
 * ignored, short enough that a genuinely re-published item (same
 * deterministic id, republished later) can be collected again afterward.
 */
export const TOMBSTONE_TTL_MS = 48 * 60 * 60 * 1000;

/** True while `state` is still within its 48h ignore tombstone window. */
export function isLiveTombstone(state: NewsState, now: Date): boolean {
  if (state.state !== "ignored" || !state.ignoredAt) {
    return false;
  }
  return now.getTime() - Date.parse(state.ignoredAt) < TOMBSTONE_TTL_MS;
}
