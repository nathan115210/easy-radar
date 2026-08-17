import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GhExec = (args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;

const defaultExec: GhExec = (args) => execFileAsync("gh", [...args]);

export class GhCliUnavailableError extends Error {
  constructor(message = 'The "gh" CLI is not installed or not on PATH.') {
    super(message);
    this.name = "GhCliUnavailableError";
  }
}

export class GhCliUnauthenticatedError extends Error {
  constructor(message = 'The "gh" CLI is not authenticated. Run "gh auth login".') {
    super(message);
    this.name = "GhCliUnauthenticatedError";
  }
}

export class GhRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GhRateLimitError";
  }
}

function classifyGhError(error: unknown): Error {
  if (
    error instanceof GhCliUnavailableError ||
    error instanceof GhCliUnauthenticatedError ||
    error instanceof GhRateLimitError
  ) {
    return error;
  }

  const nodeError = error as NodeJS.ErrnoException & { stderr?: string };

  if (nodeError.code === "ENOENT") {
    return new GhCliUnavailableError();
  }

  const stderr = nodeError.stderr ?? nodeError.message ?? "";
  if (/not logged into any github hosts|gh auth login/i.test(stderr)) {
    return new GhCliUnauthenticatedError();
  }
  if (/rate limit/i.test(stderr)) {
    return new GhRateLimitError(stderr.trim());
  }
  return new Error(`gh api failed: ${stderr.trim() || nodeError.message}`);
}

/**
 * Calls `gh api <endpoint>` and parses the JSON response. Octokit is not
 * used (PRD §14.4) — GitHub operations go through the authenticated `gh`
 * CLI, already a documented local prerequisite. Failures are classified
 * (missing CLI, unauthenticated, rate-limited) into actionable errors
 * rather than a raw child-process stack trace.
 */
export async function ghApiJson<T>(
  endpoint: string,
  exec: GhExec = defaultExec,
  extraArgs: readonly string[] = [],
): Promise<T> {
  let stdout: string;
  try {
    ({ stdout } = await exec(["api", endpoint, ...extraArgs]));
  } catch (error) {
    throw classifyGhError(error);
  }

  try {
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new Error(`gh api returned invalid JSON for "${endpoint}": ${(error as Error).message}`);
  }
}
