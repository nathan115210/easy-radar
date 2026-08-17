import { z } from "zod";
import type { NewsItem } from "../../shared/schemas/index.js";

/**
 * A virtual source's scope (PRD §11.4, §12): a subset of a larger site
 * treated as an independent source, with its own id/category/cursor —
 * everything but the raw fetch, which it shares with the broader source
 * covering the same URL. All three constraints are optional and
 * combinable; an item must satisfy every constraint present to belong to
 * this virtual source. Matching is case-insensitive, since titles vary in
 * capitalization across a site with no semantic difference.
 */
const VirtualScopeSchema = z.object({
  /** Item heading must contain this substring, e.g. "Copilot". */
  titleContains: z.string().optional(),
  /** Item heading must NOT contain this substring. */
  titleExcludes: z.string().optional(),
  /** The item link's path must start with this prefix, e.g. "/testing/". */
  linkPathPrefix: z.string().optional(),
});

const FiltersWithVirtualScopeSchema = z.object({ virtualScope: VirtualScopeSchema.optional() });

function matchesScope(item: NewsItem, scope: z.infer<typeof VirtualScopeSchema>): boolean {
  if (
    scope.titleContains &&
    !item.heading.toLowerCase().includes(scope.titleContains.toLowerCase())
  ) {
    return false;
  }
  if (
    scope.titleExcludes &&
    item.heading.toLowerCase().includes(scope.titleExcludes.toLowerCase())
  ) {
    return false;
  }
  if (scope.linkPathPrefix) {
    const path = new URL(item.link).pathname;
    if (!path.startsWith(scope.linkPathPrefix)) {
      return false;
    }
  }
  return true;
}

/**
 * Narrows a source's raw collected items down to its `filters.virtualScope`
 * (PRD §27: GitHub Changelog routing, Cloudflare/Grafana/Martin Fowler/Kent
 * C. Dodds topic filters, the Vercel Blog/Changelog split, and similar).
 * Applied generically after any adapter's `collect()` returns — a virtual
 * source uses the exact same adapter and URL as its broader counterpart,
 * so this is the one place the "which subset" logic needs to live, rather
 * than teaching every adapter about virtual scoping.
 *
 * A source with no `virtualScope` is returned unfiltered — an ordinary,
 * non-virtual source. Filtering down to zero matching items in a given run
 * is a legitimate, silent outcome (the topic simply had nothing new this
 * run), never a thrown error — that's the difference from an adapter's own
 * "zero entries from the whole feed" check, which runs before this and
 * still catches a genuinely broken upstream source.
 */
export function applyVirtualScope(
  items: readonly NewsItem[],
  filters: Record<string, unknown> | undefined,
): NewsItem[] {
  const parsed = FiltersWithVirtualScopeSchema.parse(filters ?? {});
  if (!parsed.virtualScope) {
    return [...items];
  }
  const scope = parsed.virtualScope;
  return items.filter((item) => matchesScope(item, scope));
}
