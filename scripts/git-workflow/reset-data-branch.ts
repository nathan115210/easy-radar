import { defaultGitExec, type GitExec } from "./git-exec.js";
import { assertOnBranch } from "./current-branch.js";

export type ResetDataBranchOptions = {
  branch?: string;
  exec?: GitExec;
};

/**
 * Manual recovery only (PRD §16: "Recovery from a bad automated change is
 * `git reset` on `data`. `main` is never involved."). Nothing in this
 * module calls this on any automated path — `finishDataBranchWrite` never
 * reaches for it, and there's no retry logic that falls back to it. It
 * exists so a human operator (or a future admin command) has a single,
 * branch-guarded way to run the recovery PRD §16 describes, rather than
 * reaching for a bare `git reset --hard` that isn't confined to `data`.
 */
export async function resetDataBranch(
  dir: string,
  ref: string,
  options: ResetDataBranchOptions = {},
): Promise<void> {
  const branch = options.branch ?? "data";
  const exec = options.exec ?? defaultGitExec;

  await assertOnBranch(dir, branch, exec);
  await exec(dir, ["reset", "--hard", ref]);
}
