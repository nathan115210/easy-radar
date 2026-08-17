import * as cheerio from "cheerio";
import { z } from "zod";
import type { NewsItem } from "../../../shared/schemas/index.js";
import type { Adapter, AdapterContext } from "../engine/adapter.js";
import { computeDeterministicId } from "../deterministic-id.js";
import { deriveLabel } from "../labels.js";
import { normalizeUrl } from "../normalize-url.js";
import { deriveTags } from "../tags.js";

/**
 * CSS selectors for the Cheerio fallback (used only when no JSON-LD item
 * list is found). One `SourceConfig` per site, so one selector set per
 * site — this is the "small saved HTML fixture plus a parser test" tier
 * PRD §11.1 calls the last resort.
 */
const HtmlFiltersSchema = z.object({
  /** Container per item; omit when the whole page is a single article. */
  itemSelector: z.string().optional(),
  headingSelector: z.string().default("h1, h2, h3"),
  /** Defaults to the heading's own link, or its nearest ancestor link. */
  linkSelector: z.string().optional(),
  dateSelector: z.string().optional(),
  /** Attribute to read the date from (e.g. "datetime"); element text otherwise. */
  dateAttr: z.string().optional(),
});
type HtmlFilters = z.infer<typeof HtmlFiltersSchema>;

type ExtractedEntry = { heading: string; link: string; publishedAt?: Date };

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parsedDateOrUndefined(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

const ListItemNodeSchema = z
  .object({
    url: z.string().optional(),
    name: z.string().optional(),
    headline: z.string().optional(),
    datePublished: z.string().optional(),
  })
  .passthrough();

const ItemListElementSchema = z
  .object({
    url: z.string().optional(),
    item: ListItemNodeSchema.optional(),
  })
  .merge(ListItemNodeSchema);

const ItemListSchema = z.object({
  "@type": z.literal("ItemList"),
  itemListElement: z.array(ItemListElementSchema),
});

/**
 * The JSON-LD tier PRD §11.1 prefers over raw HTML parsing: a page
 * exposing a schema.org `ItemList` of articles. Each `<script
 * type="application/ld+json">` block is parsed independently — one
 * malformed block never disqualifies a valid one elsewhere on the page.
 */
function extractFromJsonLd(html: string, baseUrl: string): ExtractedEntry[] | undefined {
  const $ = cheerio.load(html);

  for (const script of $('script[type="application/ld+json"]').toArray()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(script).text());
    } catch {
      continue;
    }

    for (const candidate of Array.isArray(parsed) ? parsed : [parsed]) {
      const itemList = ItemListSchema.safeParse(candidate);
      if (!itemList.success) continue;

      const entries = itemList.data.itemListElement
        .map((element): ExtractedEntry | undefined => {
          const node = element.item ?? element;
          const heading = node.name ?? node.headline;
          const linkRaw = node.url ?? element.url;
          if (!heading || !linkRaw) return undefined;
          return {
            heading,
            link: normalizeUrl(new URL(linkRaw, baseUrl).toString()),
            publishedAt: parsedDateOrUndefined(node.datePublished),
          };
        })
        .filter((entry): entry is ExtractedEntry => entry !== undefined);

      if (entries.length > 0) return entries;
    }
  }

  return undefined;
}

/** Cheerio HTML parsing — the true last resort, only when no JSON-LD item list exists. */
function extractFromHtml(html: string, baseUrl: string, filters: HtmlFilters): ExtractedEntry[] {
  const $ = cheerio.load(html);
  const containers = filters.itemSelector ? $(filters.itemSelector).toArray() : [$.root().get(0)!];

  const entries: ExtractedEntry[] = [];
  for (const container of containers) {
    const $container = $(container);
    const $heading = $container.find(filters.headingSelector).first();
    const heading = $heading.text().trim();
    if (!heading) continue;

    const $link = filters.linkSelector
      ? $container.find(filters.linkSelector).first()
      : $heading.is("a")
        ? $heading
        : $heading.find("a").first().length
          ? $heading.find("a").first()
          : $heading.closest("a");
    const href = $link.attr("href");
    if (!href) continue;

    const dateRaw = filters.dateSelector
      ? (filters.dateAttr
          ? $container.find(filters.dateSelector).first().attr(filters.dateAttr)
          : $container.find(filters.dateSelector).first().text().trim()) || undefined
      : undefined;

    entries.push({
      heading,
      link: normalizeUrl(new URL(href, baseUrl).toString()),
      publishedAt: parsedDateOrUndefined(dateRaw),
    });
  }
  return entries;
}

export type GenericHtmlAdapterOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

/**
 * PRD §11.1's fourth-priority, last-resort tier for a source with no
 * feed, no GitHub/official API: JSON-LD structured data when the page
 * exposes it, Cheerio HTML parsing otherwise. A changed page structure —
 * JSON-LD removed and the configured selectors no longer matching
 * anything — surfaces as a thrown, specific runtime failure (PRD §14.4),
 * never as a silent empty result.
 */
export function createGenericHtmlAdapter(options: GenericHtmlAdapterOptions = {}): Adapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? ((): Date => new Date());

  return {
    name: "generic-html-json-ld",
    async collect(context: AdapterContext): Promise<NewsItem[]> {
      const filters = HtmlFiltersSchema.parse(context.source.filters ?? {});
      const response = await fetchImpl(context.source.url, { signal: context.signal });
      if (!response.ok) {
        throw new Error(`HTML request failed: HTTP ${response.status} for ${context.source.url}`);
      }

      const html = await response.text();
      const entries =
        extractFromJsonLd(html, context.source.url) ??
        extractFromHtml(html, context.source.url, filters);

      if (entries.length === 0) {
        throw new Error(
          `No items could be extracted from "${context.source.url}" — the page structure may have changed`,
        );
      }

      return entries.map((entry) => {
        const hasTrustworthyDate = entry.publishedAt !== undefined;
        return {
          id: computeDeterministicId(entry.link),
          sourceId: context.source.id,
          heading: entry.heading,
          label: deriveLabel("website-article"),
          link: entry.link,
          date: toDateOnly(hasTrustworthyDate ? entry.publishedAt! : now()),
          dateBasis: hasTrustworthyDate ? "published" : "discovered",
          category: context.source.category,
          tags: deriveTags(context.source.tags),
        };
      });
    },
  };
}
