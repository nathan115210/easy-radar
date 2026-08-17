import type { SourceCollectionStatus } from "../../../shared/schemas/index.js";
import type { SourceOutcome } from "./run-collection.js";

/**
 * Builds the per-source diagnostic entries for collection-status.json
 * (PRD §7.1, §7.4): status, last successful/attempted collection time, and
 * failure class + reason. `lastSuccessAt` is carried forward from the
 * previous status file on a failed attempt — a source that fails today
 * doesn't lose the record of when it last actually succeeded.
 */
export function buildSourceStatuses(
  outcomes: readonly SourceOutcome[],
  previousStatuses: Readonly<Record<string, SourceCollectionStatus>> = {},
): Record<string, SourceCollectionStatus> {
  const statuses: Record<string, SourceCollectionStatus> = {};

  for (const outcome of outcomes) {
    if (outcome.outcome === "planned") {
      statuses[outcome.source.id] = { status: "planned" };
      continue;
    }

    if (outcome.outcome === "succeeded") {
      statuses[outcome.source.id] = {
        status: "active",
        lastSuccessAt: outcome.succeededAt,
        lastAttemptAt: outcome.attemptedAt,
      };
      continue;
    }

    statuses[outcome.source.id] = {
      status: "failing",
      lastSuccessAt: previousStatuses[outcome.source.id]?.lastSuccessAt,
      lastAttemptAt: outcome.attemptedAt,
      failureClass: outcome.failureClass,
      reason: outcome.reason,
    };
  }

  return statuses;
}
