/**
 * A small client-side mirror of the server's process-lifetime
 * `hasUncommittedChanges` flag (PRD §6.3), kept in the TanStack Query
 * cache rather than a separate state library (PRD §14.1: "Zustand or
 * another global client-state library is not used in v1") since it's
 * shared between `NewsCard`'s state mutations (which set it true) and
 * `FinishReadingButton` (which reads it for `beforeunload`, and resets it
 * to false on success).
 */
export const UNCOMMITTED_CHANGES_QUERY_KEY = ["has-uncommitted-changes"] as const;
