import type { SourceOutcome } from "./run-collection.js";

/**
 * Concise structured console output (PRD §7.3, §14.4) — no hosted logging
 * or telemetry. This is also the text that becomes the GitHub Actions job
 * summary for cloud runs (#45) and the only output an AI executor is
 * permitted to read and relay (§7.3), so it must stay terse and factual.
 */
export function summarizeOutcomes(
  outcomes: readonly SourceOutcome[],
  /**
   * The engine only knows what each adapter returned, not how many of
   * those are genuinely new after windowing/dedup/merge against existing
   * data — the pipeline (#12) knows that and should pass it here. Falls
   * back to the raw per-source item count when the caller doesn't have a
   * merged count to report (e.g. this module's own unit tests).
   */
  addedOverride?: number,
): string {
  const succeeded = outcomes.filter((outcome) => outcome.outcome === "succeeded");
  const failed = outcomes.filter((outcome) => outcome.outcome === "failed");
  const planned = outcomes.filter((outcome) => outcome.outcome === "planned");
  const added =
    addedOverride ?? succeeded.reduce((total, outcome) => total + outcome.items.length, 0);

  const lines = [
    `Collection run: ${succeeded.length} succeeded, ${failed.length} failed, ${planned.length} planned, ${added} added`,
  ];

  for (const outcome of failed) {
    lines.push(`  FAILED  ${outcome.source.id}: ${outcome.reason}`);
  }

  return lines.join("\n");
}
