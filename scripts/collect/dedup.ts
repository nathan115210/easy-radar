export type DedupCandidate = {
  sourceId: string;
  dedupKey: string;
  /**
   * Higher wins when two candidates share a dedupKey. A source's filter
   * definition determines its real specificity (#27); as a generic default
   * here, callers can pass the number of active filter constraints (0 for
   * an unfiltered source), which is directionally correct without this
   * module needing to understand filter semantics.
   */
  specificity: number;
  /**
   * TC39 proposal lifecycle events are a deliberate dedup exception
   * (PRD §11.4): each event is its own NewsItem even if several share a
   * URL. Sources like this set skipUrlDedup so every candidate they
   * produce is kept, never merged away by another candidate's dedupKey.
   */
  skipUrlDedup?: boolean;
};

function isMoreSpecific(candidate: DedupCandidate, current: DedupCandidate): boolean {
  if (candidate.specificity !== current.specificity) {
    return candidate.specificity > current.specificity;
  }
  // Deterministic tie-break: same specificity should never happen for two
  // distinct sources describing the same URL, but if it does, resolve it
  // the same way on every run rather than depending on input order.
  return candidate.sourceId < current.sourceId;
}

/**
 * Resolves duplicate discoveries of the same canonical URL/source key
 * (PRD §11.4): when several candidates share a dedupKey, only the most
 * specific one survives. Candidates with skipUrlDedup are never merged.
 */
export function resolveDuplicates(candidates: readonly DedupCandidate[]): DedupCandidate[] {
  const keptRegardlessOfDedup: DedupCandidate[] = [];
  const bestByKey = new Map<string, DedupCandidate>();

  for (const candidate of candidates) {
    if (candidate.skipUrlDedup) {
      keptRegardlessOfDedup.push(candidate);
      continue;
    }

    const current = bestByKey.get(candidate.dedupKey);
    if (!current || isMoreSpecific(candidate, current)) {
      bestByKey.set(candidate.dedupKey, candidate);
    }
  }

  return [...keptRegardlessOfDedup, ...bestByKey.values()];
}
