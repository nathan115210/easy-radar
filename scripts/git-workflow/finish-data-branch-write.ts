import { defaultGitExec, type GitExec } from "./git-exec.js";
import { commitDataChanges } from "./commit-data-changes.js";
import { fetchAndRebase } from "./fetch-and-rebase.js";
import { pushWithRetry } from "./push-with-retry.js";

export type FinishDataBranchWriteOptions = {
  remote?: string;
  branch?: string;
  exec?: GitExec;
};

export type FinishDataBranchWriteResult = { committed: boolean; pushed: boolean };

/**
 * The one entry point both `Finish reading` (#21) and the cloud collection
 * pipeline (#45) call once their data files are already written to disk
 * under `<dir>/data/*.json`. Order matters: the working-tree edits are
 * committed *first* — whatever is currently on disk becomes a single local
 * commit — and only then does the worktree sync against the remote tip.
 * Rebasing before committing would require a clean working tree, which
 * ordinary uncommitted edits (e.g. the reading-state changes a session
 * accumulates before "Finish reading") aren't; committing first makes the
 * sync a normal, safe commit replay instead.
 *
 * When there's nothing to commit, this is a genuine no-op: no commit, no
 * push, no network call at all (PRD §20 acceptance: "Running twice with no
 * data change produces no second commit").
 */
export async function finishDataBranchWrite(
  dir: string,
  message: string,
  options: FinishDataBranchWriteOptions = {},
): Promise<FinishDataBranchWriteResult> {
  const remote = options.remote ?? "origin";
  const branch = options.branch ?? "data";
  const exec = options.exec ?? defaultGitExec;

  const { committed } = await commitDataChanges(dir, message, { branch, exec });
  if (!committed) {
    return { committed: false, pushed: false };
  }

  await fetchAndRebase(dir, { remote, branch, exec });
  await pushWithRetry(dir, { remote, branch, exec });

  return { committed: true, pushed: true };
}
