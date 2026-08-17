import { access } from "node:fs/promises";
import { DataBranchDivergedError } from "../git-workflow/errors.js";
import { defaultGitExec, type GitExec } from "../git-workflow/git-exec.js";
import { ensureDataBranch } from "../git-workflow/ensure-data-branch.js";

export type SyncWorktreeOptions = {
  repoDir?: string;
  remote?: string;
  branch?: string;
  mainBranch?: string;
  exec?: GitExec;
};

export type SyncWorktreeResult =
  { outcome: "created" } | { outcome: "synced" } | { outcome: "offline" };

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function localBranchExists(repoDir: string, branch: string, exec: GitExec): Promise<boolean> {
  try {
    await exec(repoDir, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * `pnpm start`'s data sync (PRD §15.2): the one step that makes cloud
 * collection visible locally with no manual action. Two cases:
 *
 * - No `worktreeDir` yet: bootstrap it (#20's `ensureDataBranch`, then
 *   `git worktree add`), which is also how a fresh clone gets going on its
 *   very first `pnpm start`.
 * - `worktreeDir` already exists: fetch, then fast-forward only. A failed
 *   fetch (no network) is swallowed — the app starts on last-known-local
 *   data and the status alert reflects staleness normally (PRD §7.1). A
 *   failed fast-forward (real divergence, or uncommitted reading-state
 *   changes the merge would need to touch) is never resolved automatically
 *   — it's reported to the caller so startup fails closed instead of
 *   discarding local state.
 */
export async function syncWorktree(
  worktreeDir: string,
  options: SyncWorktreeOptions = {},
): Promise<SyncWorktreeResult> {
  const repoDir = options.repoDir ?? process.cwd();
  const remote = options.remote ?? "origin";
  const branch = options.branch ?? "data";
  const mainBranch = options.mainBranch ?? "main";
  const exec = options.exec ?? defaultGitExec;

  if (!(await pathExists(worktreeDir))) {
    await ensureDataBranch(repoDir, { remote, mainBranch, branch, exec });
    const hasLocalBranch = await localBranchExists(repoDir, branch, exec);
    if (hasLocalBranch) {
      await exec(repoDir, ["worktree", "add", worktreeDir, branch]);
    } else {
      await exec(repoDir, ["worktree", "add", worktreeDir, "-b", branch, `${remote}/${branch}`]);
    }
    return { outcome: "created" };
  }

  try {
    await exec(worktreeDir, ["fetch", remote, branch]);
  } catch {
    return { outcome: "offline" };
  }

  try {
    await exec(worktreeDir, ["merge", "--ff-only", `${remote}/${branch}`]);
  } catch (error) {
    throw new DataBranchDivergedError(
      `The local "${branch}" worktree at "${worktreeDir}" could not be fast-forwarded onto ` +
        `"${remote}/${branch}". This means it has diverged, or has uncommitted reading-state ` +
        `changes that the update would overwrite. Nothing was discarded. Resolve manually in ` +
        `"${worktreeDir}" (start with "git status") and run "pnpm start" again.\n${(error as Error).message}`,
    );
  }

  return { outcome: "synced" };
}
