import type { NewsItem } from "../../shared/schemas/index.js";
import type { ValidationIssue } from "./validation-issue.js";

const DETERMINISTIC_ID_PATTERN = /^[0-9a-f]{16}$/;

/**
 * Checks the invariants schema validation alone can't catch (PRD §17): no
 * duplicate active items, and every id looks like a real deterministic id
 * (#7's computeDeterministicId output shape) rather than something
 * hand-written or corrupted. Each issue names the offending item id.
 */
export function validateNewsInvariants(items: readonly NewsItem[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    if (!DETERMINISTIC_ID_PATTERN.test(item.id)) {
      issues.push({
        check: "news-id-format",
        message: `Item "${item.id}" (source "${item.sourceId}") does not look like a deterministic id`,
      });
    }

    if (seenIds.has(item.id)) {
      issues.push({
        check: "news-duplicate-id",
        message: `Duplicate active item id "${item.id}"`,
      });
    }
    seenIds.add(item.id);
  }

  return issues;
}
