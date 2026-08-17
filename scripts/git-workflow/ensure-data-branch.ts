import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ensureDataFiles } from "../../server/storage/init.js";
import { defaultGitExec, type GitExec } from "./git-exec.js";

export type EnsureDataBranchOptions = {
  remote?: string;
  mainBranch?: string;
  branch?: string;
  exec?: GitExec;
};

export type EnsureDataBranchResult = { created: boolean };

async function remoteBranchExists(
  repoDir: string,
  remote: string,
  branch: string,
  exec: GitExec,
): Promise<boolean> {
  try {
    await exec(repoDir, ["ls-remote", "--exit-code", "--heads", remote, branch]);
    return true;
  } catch {
    return false;
  }
}

/**
 * The `data` branch's one-time bootstrap (PRD §20: "Ensure the `data`
 * branch exists; create it from `main` on first run with an empty `data/`
 * payload"). Runs against `repoDir` (the ordinary `main` checkout) without
 * ever checking it out to `data` — checking out `data` in the main working
 * tree would delete the application from disk (PRD §15.1) — instead using
 * a throwaway `git worktree` that's removed again once the branch is
 * pushed. The new branch shares `main`'s history (so it has a sensible
 * merge base for the first real rebase) but its tree contains only the
 * four empty `data/*.json` files: no code ever lands on `data`, not even
 * transiently.
 */
export async function ensureDataBranch(
  repoDir: string,
  options: EnsureDataBranchOptions = {},
): Promise<EnsureDataBranchResult> {
  const remote = options.remote ?? "origin";
  const mainBranch = options.mainBranch ?? "main";
  const branch = options.branch ?? "data";
  const exec = options.exec ?? defaultGitExec;

  await exec(repoDir, ["fetch", remote, mainBranch]);

  if (await remoteBranchExists(repoDir, remote, branch, exec)) {
    return { created: false };
  }

  const scratch = await mkdtemp(path.join(tmpdir(), "easy-radar-data-branch-"));
  try {
    await exec(repoDir, ["worktree", "add", "-b", branch, scratch, `${remote}/${mainBranch}`]);
    await exec(scratch, ["rm", "-rq", "."]);
    await ensureDataFiles(path.join(scratch, "data"));
    await exec(scratch, ["add", "-A", "--", "data"]);
    await exec(scratch, ["commit", "-m", "Initialize data branch"]);
    await exec(scratch, ["push", "-u", remote, branch]);
  } finally {
    await exec(repoDir, ["worktree", "remove", "--force", scratch]).catch(() => undefined);
    await rm(scratch, { recursive: true, force: true });
  }

  return { created: true };
}
