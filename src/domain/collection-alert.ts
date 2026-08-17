import type {
  CategorySources,
  CollectionStatusResponse,
  RunRejection,
  RunRejectionReason,
} from "../../shared/schemas/index.js";

export type AlertSeverity = "red" | "orange" | "green";

/**
 * Severity rules (PRD §7.1): failure (a `Failing` source, or a rejected
 * run) always outranks incomplete/stale coverage, which in turn outranks
 * a fully healthy collection.
 */
export function getSeverity(status: CollectionStatusResponse): AlertSeverity {
  if (status.rejected || status.coverage.failed > 0) return "red";
  if (status.coverage.planned > 0 || status.stale) return "orange";
  return "green";
}

const REJECTION_LABELS: Record<RunRejectionReason, string> = {
  "volume-guard": "Change guard",
  "active-item-mutation": "Change guard",
  "cursor-regression": "Change guard",
  "validation-failed": "Validation",
};

/** The precise rejection reason (PRD §7.1), e.g. "Change guard: 212 items added, exceeds threshold of 200". */
export function formatRejection(rejected: RunRejection): string {
  return `${REJECTION_LABELS[rejected.reason]}: ${rejected.detail}`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** A concise title for the alert (PRD §7.1): a rejected run's reason always takes priority when present. */
export function getAlertTitle(status: CollectionStatusResponse, severity: AlertSeverity): string {
  if (status.rejected) {
    return `Collection rejected — ${formatRejection(status.rejected)}`;
  }

  if (severity === "red") {
    return `${plural(status.coverage.failed, "source")} failing`;
  }

  if (severity === "orange") {
    const parts: string[] = [];
    if (status.coverage.planned > 0) {
      parts.push(`${plural(status.coverage.planned, "source")} planned`);
    }
    if (status.stale) parts.push("collection is stale");
    return parts.join(", ");
  }

  return "All sources collecting successfully";
}

export type SourcesDeepLink = { category?: CategorySources["category"]; sourceId?: string };

/**
 * Deep-links "to the affected source or category where possible" (PRD
 * §7.1). A rejected run is a run-level guard failure, not tied to any one
 * source, so it (and plain staleness with nothing failing/planned) falls
 * through to a plain, unscoped `View sources` link.
 */
export function findDeepLinkTarget(
  status: CollectionStatusResponse,
  categories: readonly CategorySources[],
  severity: AlertSeverity,
): SourcesDeepLink {
  if (status.rejected) return {};

  const wantedStatus =
    severity === "red" ? "failing" : severity === "orange" ? "planned" : undefined;
  if (!wantedStatus) return {};

  for (const category of categories) {
    const source = category.monitored.find((candidate) => candidate.status === wantedStatus);
    if (source) return { category: category.category, sourceId: source.id };
  }

  return {};
}
