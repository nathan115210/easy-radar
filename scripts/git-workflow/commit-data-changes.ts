import { defaultGitExec, type GitExec } from "./git-exec.js";
import { assertOnBranch } from "./current-branch.js";

export type CommitDataChangesOptions = {
  branch?: string;
  exec?: GitExec;
};

export type CommitDataChangesResult = { committed: boolean };

/**
 * Stages and commits changes under `data/` only — never `git add -A` or
 * `git add .` — so this function structurally cannot pick up anything
 * outside the one directory the `data` branch is allowed to contain (PRD
 * §16: "`data` ... No code"). `assertOnBranch` refuses to run at all if the
 * worktree isn't on `branch`, so there's no path from here to `main`.
 *
 * Produces no commit when nothing under `data/` actually changed (PRD §20
 * acceptance: "Running twice with no data change produces no second
 * commit"), which is the common case for `Finish reading` when the user
 * only read items that were already read, or for a collection run that
 * found nothing new.
 */
export async function commitDataChanges(
  dir: string,
  message: string,
  options: CommitDataChangesOptions = {},
): Promise<CommitDataChangesResult> {
  const branch = options.branch ?? "data";
  const exec = options.exec ?? defaultGitExec;

  await assertOnBranch(dir, branch, exec);
  await exec(dir, ["add", "-A", "--", "data"]);

  try {
    await exec(dir, ["diff", "--cached", "--quiet", "--", "data"]);
    return { committed: false };
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (code !== 1) {
      throw error;
    }
  }

  await exec(dir, ["commit", "-m", message]);
  return { committed: true };
}
