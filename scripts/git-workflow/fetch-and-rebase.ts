import { defaultGitExec, type GitExec } from "./git-exec.js";
import { DataBranchDivergedError } from "./errors.js";

export type FetchAndRebaseOptions = {
  remote?: string;
  branch?: string;
  exec?: GitExec;
};

/**
 * "Remote is authoritative" (PRD §16): brings the worktree's `data` branch
 * up to date with `<remote>/<branch>` before any push. When the worktree
 * has no unpushed local commits this is a plain fast-forward; when it does
 * (typically one just-made "Finish reading" commit), git replays it on top
 * of the new tip. A conflict — the fail-closed path — always means
 * `news-states.json` was touched on both sides (PRD §20: "the one file
 * both writers touch"), since every other data file is append-only or
 * single-writer. The rebase is always aborted back to a clean state before
 * throwing, so the worktree is never left mid-rebase.
 */
export async function fetchAndRebase(
  dir: string,
  options: FetchAndRebaseOptions = {},
): Promise<void> {
  const remote = options.remote ?? "origin";
  const branch = options.branch ?? "data";
  const exec = options.exec ?? defaultGitExec;

  const remoteRef = `${remote}/${branch}`;
  try {
    await exec(dir, ["fetch", remote, branch]);
    await exec(dir, ["rev-parse", "--verify", "--quiet", remoteRef]);
  } catch {
    throw new DataBranchDivergedError(
      `"${remoteRef}" does not exist. Run the data-branch bootstrap before syncing.`,
    );
  }

  try {
    await exec(dir, ["rebase", remoteRef]);
  } catch (error) {
    await exec(dir, ["rebase", "--abort"]).catch(() => undefined);
    const detail = (error as Error).message;
    throw new DataBranchDivergedError(
      `Local "${branch}" could not be rebased onto "${remoteRef}" without conflicts. ` +
        `This usually means news-states.json changed on both sides. Resolve manually in "${dir}" and retry.\n${detail}`,
    );
  }
}
