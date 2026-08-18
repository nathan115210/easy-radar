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
 * Env vars a git hook (e.g. this repo's own husky `pre-push`, which every
 * `pnpm validate` run — including this test suite — may execute under)
 * sets for its own child process, and that a plain child_process spawn
 * inherits by default. Left in place, they'd redirect every "-C <dir>" git
 * invocation here away from the directory that was explicitly passed in
 * and onto whatever repo the hook happened to be running against —
 * silently wrong in production, and actively destructive in tests, which
 * rely on "-C <dir>" alone to stay hermetic to their own temp repos.
 */
const GIT_ENV_OVERRIDES_TO_STRIP = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_PREFIX",
] as const;

export function hermeticGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of GIT_ENV_OVERRIDES_TO_STRIP) {
    delete env[key];
  }
  return env;
}

export const defaultGitExec: GitExec = (dir, args) =>
  execFileAsync("git", ["-C", dir, ...args], { env: hermeticGitEnv() });
