/**
 * Tags are deterministic only (PRD §8, §11): a source's static config tags,
 * plus trustworthy structured metadata the source itself provides (feed
 * categories, GitHub labels, etc.) — never inferred. Deduplicated and
 * sorted so the same inputs always produce the same output, regardless of
 * arrival order.
 */
export function deriveTags(
  staticTags: readonly string[],
  structuredTags: readonly string[] = [],
): string[] {
  return [...new Set([...staticTags, ...structuredTags])].sort();
}
