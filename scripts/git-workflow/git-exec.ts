import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitExecResult = { stdout: string; stderr: string };

/**
 * Every git-workflow function takes its git-runner as an injectable
 * dependency (same pattern as `GhExec` in the collector's `gh-cli.ts`), so
 * tests can exercise real git repositories without shelling out through a
 * hardcoded binary, and so no function here can accidentally run a git
 * command outside the `-C <dir>` it was given.
 */
export type GitExec = (dir: string, args: readonly string[]) => Promise<GitExecResult>;

/**
 * Strips git's hook-injected env vars (GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE,
 * GIT_COMMON_DIR, GIT_PREFIX) so this always operates on the `-C dir` it was
 * given, never on whatever repo invoked the current process — relevant when
 * this runs from `.husky/pre-push`, which git populates with these for the
 * pushing repo.
 */
function childGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of [
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_INDEX_FILE",
    "GIT_COMMON_DIR",
    "GIT_PREFIX",
  ]) {
    delete env[key];
  }
  return env;
}

export const defaultGitExec: GitExec = (dir, args) =>
  execFileAsync("git", ["-C", dir, ...args], { env: childGitEnv() });
