/**
 * Local `data` branch state can't be reconciled with the remote tip by a
 * clean rebase (PRD §16: "Ambiguous or diverged branch state fails closed
 * and asks the user to resolve it"). Never resolved automatically — in
 * particular, never by force-pushing.
 */
export class DataBranchDivergedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataBranchDivergedError";
  }
}

/**
 * A push was rejected twice in a row (the one automatic rebase-and-retry
 * did not clear it). Local commits are left exactly as they are — this is
 * never resolved by overwriting the remote.
 */
export class GitPushAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitPushAbortedError";
  }
}

/**
 * A safety assertion (e.g. "the worktree must be on `data`, not `main`")
 * failed. This is a defensive guard, not an expected runtime condition —
 * it means a caller mis-wired a worktree path.
 */
export class GitWorkflowSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitWorkflowSafetyError";
  }
}
