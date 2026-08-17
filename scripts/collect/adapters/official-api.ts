import { z } from "zod";
import type { NewsItem } from "../../../shared/schemas/index.js";
import type { Adapter, AdapterContext } from "../engine/adapter.js";
import { computeDeterministicId } from "../deterministic-id.js";
import { deriveLabel } from "../labels.js";
import { normalizeUrl } from "../normalize-url.js";
import { deriveTags } from "../tags.js";

/**
 * Every official API has its own JSON shape, so a source's `filters`
 * describe how to navigate this one's response into a flat list of items
 * and which fields map to heading/link/date (PRD §11.1's "official API"
 * tier) — this is what lets one adapter serve every documented API
 * without a code change per source.
 */
const ApiFiltersSchema = z.object({
  /** Dot-path to the array of items within the response; the root array if omitted. */
  itemsPath: z.string().optional(),
  headingField: z.string().default("title"),
  linkField: z.string().default("url"),
  /** Omit for a source with no trustworthy date field — PRD §11.3 undated handling applies. */
  dateField: z.string().optional(),
});

function getByPath(value: unknown, dotPath: string | undefined): unknown {
  if (!dotPath) return value;
  return dotPath.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

const RawItemSchema = z.record(z.string(), z.unknown());

function extractField(
  item: Record<string, unknown>,
  field: string,
  index: number,
  url: string,
): string {
  const result = z.string().min(1).safeParse(item[field]);
  if (!result.success) {
    throw new Error(`API response from "${url}" item ${index} is missing a valid "${field}" field`);
  }
  return result.data;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type OfficialApiAdapterOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

/**
 * PRD §11.1's third-priority tier: typed, Zod-validated JSON from a
 * documented official endpoint (a changelog API, for example) — used only
 * when no feed or GitHub API covers the source. A response that no longer
 * matches the configured `filters` (a field renamed, the items array
 * moved) throws a specific, actionable error rather than silently
 * returning nothing, the same contract the feed adapter holds itself to.
 */
export function createOfficialApiAdapter(options: OfficialApiAdapterOptions = {}): Adapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? ((): Date => new Date());

  return {
    name: "official-api",
    async collect(context: AdapterContext): Promise<NewsItem[]> {
      const filters = ApiFiltersSchema.parse(context.source.filters ?? {});
      const response = await fetchImpl(context.source.url, { signal: context.signal });
      if (!response.ok) {
        throw new Error(`API request failed: HTTP ${response.status} for ${context.source.url}`);
      }

      const body: unknown = await response.json();
      const rawItems = getByPath(body, filters.itemsPath);
      const itemsResult = z.array(RawItemSchema).safeParse(rawItems);
      if (!itemsResult.success) {
        throw new Error(
          `API response from "${context.source.url}" did not contain an array of items at "${filters.itemsPath ?? "(root)"}"`,
        );
      }
      if (itemsResult.data.length === 0) {
        throw new Error(`API response from "${context.source.url}" returned zero items`);
      }

      return itemsResult.data.map((raw, index) => {
        const heading = extractField(raw, filters.headingField, index, context.source.url);
        const link = normalizeUrl(extractField(raw, filters.linkField, index, context.source.url));

        const rawDate = filters.dateField ? raw[filters.dateField] : undefined;
        const parsedDate = typeof rawDate === "string" ? new Date(rawDate) : undefined;
        const hasTrustworthyDate = parsedDate !== undefined && !Number.isNaN(parsedDate.getTime());

        return {
          id: computeDeterministicId(link),
          sourceId: context.source.id,
          heading,
          label: deriveLabel("api-item"),
          link,
          date: toDateOnly(hasTrustworthyDate ? parsedDate! : now()),
          dateBasis: hasTrustworthyDate ? "published" : "discovered",
          category: context.source.category,
          tags: deriveTags(context.source.tags),
        };
      });
    },
  };
}
