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

export const defaultGitExec: GitExec = (dir, args) => execFileAsync("git", ["-C", dir, ...args]);
