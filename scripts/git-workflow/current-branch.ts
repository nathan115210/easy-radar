import { defaultGitExec, type GitExec } from "./git-exec.js";
import { GitWorkflowSafetyError } from "./errors.js";

export async function getCurrentBranch(
  dir: string,
  exec: GitExec = defaultGitExec,
): Promise<string> {
  const { stdout } = await exec(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

/**
 * The one guard that keeps every write in this module structurally
 * confined to the `data` branch (PRD §16: "No automated process ever
 * writes to `main`"): every commit/push operation calls this first and
 * refuses to proceed if the worktree isn't on `branch`, rather than
 * trusting the caller passed the right directory.
 */
export async function assertOnBranch(
  dir: string,
  branch: string,
  exec: GitExec = defaultGitExec,
): Promise<void> {
  const current = await getCurrentBranch(dir, exec);
  if (current !== branch) {
    throw new GitWorkflowSafetyError(
      `Refusing to operate: expected the worktree at "${dir}" to be on "${branch}", but it's on "${current}".`,
    );
  }
}
