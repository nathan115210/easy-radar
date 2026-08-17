import {
  DataBranchDivergedError,
  GitPushAbortedError,
  finishDataBranchWrite,
} from "../../scripts/git-workflow/index.js";
import { formatIssues, type ValidationIssue } from "../../scripts/validate/validation-issue.js";
import { validateData } from "../../scripts/validate/validate-data.js";

export type FinishReadingOutcome =
  | { outcome: "invalid"; message: string }
  | { outcome: "diverged"; message: string }
  | { outcome: "push-aborted"; message: string }
  | { outcome: "success"; committed: boolean; pushed: boolean };

/**
 * `Finish reading` (PRD §6.3): validate the on-disk state, then hand off
 * to #20's `finishDataBranchWrite` to commit and push. There is no pull
 * request and no redirect — this either succeeds (with or without
 * anything to actually push) or fails closed, and either way the caller
 * reports inline in the same session. A validation failure never reaches
 * git at all: pushing invalid state to the shared `data` branch would be
 * strictly worse than leaving the session's local files as they are.
 */
export async function finishReading(
  worktreeDir: string,
  dataDir: string,
  now: Date = new Date(),
): Promise<FinishReadingOutcome> {
  const issues: ValidationIssue[] = await validateData(dataDir, now);
  if (issues.length > 0) {
    return { outcome: "invalid", message: formatIssues(issues) };
  }

  try {
    const result = await finishDataBranchWrite(worktreeDir, `Finish reading: ${now.toISOString()}`);
    return { outcome: "success", ...result };
  } catch (error) {
    if (error instanceof DataBranchDivergedError) {
      return { outcome: "diverged", message: error.message };
    }
    if (error instanceof GitPushAbortedError) {
      return { outcome: "push-aborted", message: error.message };
    }
    throw error;
  }
}
