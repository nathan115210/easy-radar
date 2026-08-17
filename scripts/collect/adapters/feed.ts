import type { NewsItem } from "../../../shared/schemas/index.js";
import type { Adapter, AdapterContext } from "../engine/adapter.js";
import { computeDeterministicId } from "../deterministic-id.js";
import { deriveLabel } from "../labels.js";
import { normalizeUrl } from "../normalize-url.js";
import { deriveTags } from "../tags.js";
import { fetchFeed } from "./feed-fetch.js";
import { parseFeedEntries, type RawFeedEntry } from "./feed-entries.js";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toNewsItem(entry: RawFeedEntry, context: AdapterContext, now: Date): NewsItem {
  const link = normalizeUrl(entry.link);
  const hasTrustworthyDate = entry.publishedAt !== undefined;

  return {
    id: computeDeterministicId(link),
    sourceId: context.source.id,
    heading: entry.heading,
    label: deriveLabel("feed-entry"),
    link,
    // Undated entries use the discovery date, never a fabricated "published"
    // date (PRD §11.3) — dateBasis: "discovered" makes that distinction explicit.
    date: toDateOnly(hasTrustworthyDate ? entry.publishedAt! : now),
    dateBasis: hasTrustworthyDate ? "published" : "discovered",
    category: context.source.category,
    tags: deriveTags(context.source.tags, entry.structuredTags),
  };
}

export type FeedAdapterOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

/**
 * PRD §11.1's highest-priority adapter: RSS 2.0, Atom, and JSON Feed,
 * driven by `kind: "feed"` config, parsed with Feedsmith. Adding a new feed
 * source requires config only (SourceConfig.url + adapter: "feed") — no
 * code change, since this one adapter handles all three formats.
 */
export function createFeedAdapter(options: FeedAdapterOptions = {}): Adapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? ((): Date => new Date());

  return {
    name: "feed",
    async collect(context: AdapterContext): Promise<NewsItem[]> {
      const result = await fetchFeed(fetchImpl, context.source.url, context.signal);
      if (result.notModified) {
        return [];
      }

      const entries = parseFeedEntries(result.body, context.source.url);
      // A 200 response that parses into zero entries is distinct from a
      // 304: it's a signal something upstream broke silently (redirect to
      // an unrelated page, feed emptied by mistake), so it's a runtime
      // failure worth surfacing rather than a quiet no-op (PRD §9).
      if (entries.length === 0) {
        throw new Error(`Feed "${context.source.url}" returned zero entries`);
      }

      return entries.map((entry) => toNewsItem(entry, context, now()));
    },
  };
}
