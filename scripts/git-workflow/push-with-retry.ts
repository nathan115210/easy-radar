import { defaultGitExec, type GitExec } from "./git-exec.js";
import { assertOnBranch } from "./current-branch.js";
import { fetchAndRebase } from "./fetch-and-rebase.js";
import { GitPushAbortedError } from "./errors.js";

export type PushWithRetryOptions = {
  remote?: string;
  branch?: string;
  exec?: GitExec;
};

/**
 * Pushes `branch`, and on rejection — someone else landed a commit on the
 * remote tip since the last sync, the one realistic race given `data`'s
 * writers "effectively never run concurrently" (PRD §20) — rebases onto
 * the new tip and retries exactly once. A rebase conflict on that retry
 * surfaces as `DataBranchDivergedError` from `fetchAndRebase` itself
 * (still fail-closed). A second plain push rejection aborts outright:
 * never a third attempt, never `--force`. Local commits are untouched
 * either way, so nothing here can lose the caller's work.
 */
export async function pushWithRetry(
  dir: string,
  options: PushWithRetryOptions = {},
): Promise<void> {
  const remote = options.remote ?? "origin";
  const branch = options.branch ?? "data";
  const exec = options.exec ?? defaultGitExec;

  await assertOnBranch(dir, branch, exec);

  try {
    await exec(dir, ["push", remote, branch]);
    return;
  } catch (firstError) {
    await fetchAndRebase(dir, { remote, branch, exec });

    try {
      await exec(dir, ["push", remote, branch]);
      return;
    } catch (secondError) {
      throw new GitPushAbortedError(
        `Push to "${remote}/${branch}" was rejected twice; local commits in "${dir}" are ` +
          `left intact. First failure: ${(firstError as Error).message}. ` +
          `After rebase and retry: ${(secondError as Error).message}.`,
      );
    }
  }
}
