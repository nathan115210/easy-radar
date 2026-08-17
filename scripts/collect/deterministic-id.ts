import { createHash } from "node:crypto";

const ID_LENGTH = 16;

/**
 * A NewsItem's id is a hash of its normalized deduplication key (PRD §8),
 * not a URL directly — this keeps id computation uniform for both
 * URL-scoped sources (key = normalizeUrl(url)) and sources that opt out of
 * URL-level dedup, like TC39 (key = a composite string the adapter builds,
 * e.g. `tc39:${proposalId}:${eventType}`; see dedup.ts). Pure and
 * deterministic: same key always produces the same id, on any machine.
 */
export function computeDeterministicId(dedupKey: string): string {
  return createHash("sha256").update(dedupKey).digest("hex").slice(0, ID_LENGTH);
}
