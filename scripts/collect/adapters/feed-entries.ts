import { parseFeed } from "feedsmith";

export type RawFeedEntry = {
  heading: string;
  link: string;
  /** Only set when the feed provides a trustworthy publication date (PRD §11.3). */
  publishedAt?: Date;
  structuredTags: string[];
};

function resolveLink(rawLink: string, baseUrl: string): string {
  return new URL(rawLink, baseUrl).toString();
}

function parseTrustworthyDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function pickAtomLink(links: { href?: string; rel?: string }[] | undefined): string | undefined {
  if (!links || links.length === 0) {
    return undefined;
  }
  const alternate = links.find((link) => !link.rel || link.rel === "alternate");
  return (alternate ?? links[0])?.href;
}

/**
 * Normalizes RSS 2.0, Atom, and JSON Feed entries into one shape. Feed
 * format is auto-detected (feedsmith's parseFeed); RDF is out of scope
 * (not part of PRD §11.1's feed adapter). `Last-Modified`-style fields
 * (Atom's `updated`, JSON Feed's `date_modified`) are never treated as a
 * publication date (PRD §11.3) — only RSS `pubDate` / Atom `published` /
 * JSON Feed `date_published` count.
 */
export function parseFeedEntries(content: string, feedUrl: string): RawFeedEntry[] {
  let parsed: ReturnType<typeof parseFeed>;
  try {
    parsed = parseFeed(content);
  } catch (error) {
    throw new Error(`Malformed feed content for "${feedUrl}": ${(error as Error).message}`);
  }

  const { format, feed } = parsed;

  if (format === "rss") {
    return (feed.items ?? []).flatMap((item): RawFeedEntry[] => {
      if (!item.link || !item.title) {
        return [];
      }
      return [
        {
          heading: item.title,
          link: resolveLink(item.link, feedUrl),
          publishedAt: parseTrustworthyDate(item.pubDate),
          structuredTags: (item.categories ?? [])
            .map((category) => category.name)
            .filter((name): name is string => !!name),
        },
      ];
    });
  }

  if (format === "atom") {
    return (feed.entries ?? []).flatMap((entry): RawFeedEntry[] => {
      const link = pickAtomLink(entry.links);
      if (!link || !entry.title) {
        return [];
      }
      return [
        {
          heading: entry.title,
          link: resolveLink(link, feedUrl),
          publishedAt: parseTrustworthyDate(entry.published),
          structuredTags: (entry.categories ?? [])
            .map((category) => category.term ?? category.label)
            .filter((tag): tag is string => !!tag),
        },
      ];
    });
  }

  if (format === "json") {
    return (feed.items ?? []).flatMap((item): RawFeedEntry[] => {
      if (!item.url || !item.title) {
        return [];
      }
      return [
        {
          heading: item.title,
          link: resolveLink(item.url, feedUrl),
          publishedAt: parseTrustworthyDate(item.date_published),
          structuredTags: item.tags ?? [],
        },
      ];
    });
  }

  throw new Error(`Unsupported feed format "${format}" for "${feedUrl}"`);
}
