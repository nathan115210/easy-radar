import type { NewsItem, NewsStatesFile } from "../../shared/schemas/index.js";
import { isLiveTombstone } from "../cleanup/tombstone.js";
import type { ValidationIssue } from "./validation-issue.js";

/**
 * An ignored item's state entry outlives its news.json entry for 48h
 * (PRD §10) so the collection overlap window can't immediately re-add it —
 * that's the one kind of "orphaned" state entry validation must tolerate.
 * Past 48h it's stale and #24's cleanup rules (scripts/cleanup) are
 * responsible for removing it; validation doesn't delete anything itself.
 */

/**
 * Checks that news.json and news-states.json agree with each other
 * (PRD §17): every active item has a state entry, and every state entry
 * either corresponds to an active item or is a still-live ignore
 * tombstone. Anything else is desynchronized data.
 */
export function validateStateSync(
  items: readonly NewsItem[],
  statesFile: NewsStatesFile,
  now: Date = new Date(),
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const itemIds = new Set(items.map((item) => item.id));

  for (const item of items) {
    if (!(item.id in statesFile.items)) {
      issues.push({
        check: "state-missing-for-item",
        message: `Active item "${item.id}" has no entry in news-states.json`,
      });
    }
  }

  for (const [id, state] of Object.entries(statesFile.items)) {
    if (itemIds.has(id)) {
      continue;
    }
    if (isLiveTombstone(state, now)) {
      continue;
    }
    issues.push({
      check: "state-orphaned-entry",
      message: `State entry "${id}" has no matching active item and is not a live ignore tombstone`,
    });
  }

  return issues;
}
