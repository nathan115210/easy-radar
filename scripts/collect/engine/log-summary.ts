import type { SourceOutcome } from "./run-collection.js";

/**
 * Concise structured console output (PRD §7.3, §14.4) — no hosted logging
 * or telemetry. This is also the text that becomes the GitHub Actions job
 * summary for cloud runs (#45) and the only output an AI executor is
 * permitted to read and relay (§7.3), so it must stay terse and factual.
 */
export function summarizeOutcomes(outcomes: readonly SourceOutcome[]): string {
  const succeeded = outcomes.filter((outcome) => outcome.outcome === "succeeded");
  const failed = outcomes.filter((outcome) => outcome.outcome === "failed");
  const planned = outcomes.filter((outcome) => outcome.outcome === "planned");
  const added = succeeded.reduce((total, outcome) => total + outcome.items.length, 0);

  const lines = [
    `Collection run: ${succeeded.length} succeeded, ${failed.length} failed, ${planned.length} planned, ${added} added`,
  ];

  for (const outcome of failed) {
    lines.push(`  FAILED  ${outcome.source.id}: ${outcome.reason}`);
  }

  return lines.join("\n");
}
