import { readNews, readNewsStates } from "../../server/storage/index.js";
import { validateNewsInvariants } from "./news-invariants.js";
import { validateStateSync } from "./state-sync.js";
import type { ValidationIssue } from "./validation-issue.js";

/**
 * Reads news.json and news-states.json from a data directory and runs the
 * data-only invariant checks (PRD §17). Schema validity is already
 * enforced by readNews/readNewsStates (#6) — a schema mismatch surfaces as
 * a thrown error, not a ValidationIssue, since it means the file itself is
 * unreadable rather than merely violating a cross-file invariant.
 */
export async function validateData(
  dataDir: string,
  now: Date = new Date(),
): Promise<ValidationIssue[]> {
  const [items, statesFile] = await Promise.all([readNews(dataDir), readNewsStates(dataDir)]);

  return [...validateNewsInvariants(items), ...validateStateSync(items, statesFile, now)];
}
