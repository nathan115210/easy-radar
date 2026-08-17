import { readNews, readNewsStates } from "../storage/index.js";
import type {
  Category,
  NewsItem,
  NewsPageResponse,
  NewsStateFilter,
  NewsStatesFile,
} from "../../shared/schemas/index.js";
import { NEWS_PAGE_SIZE } from "../../shared/schemas/index.js";

/**
 * An "ignored" item never appears here — it's removed from news.json on
 * confirmation (PRD §10), so every active item is unread or read. A
 * missing state entry (shouldn't happen once #6's sync has run, but is
 * possible on a bare first read) defaults to unread rather than throwing.
 */
function stateOf(item: NewsItem, states: NewsStatesFile): "unread" | "read" {
  return states.items[item.id]?.state === "read" ? "read" : "unread";
}

export type NewsPageOptions = {
  category: Category;
  state: NewsStateFilter;
  page: number;
};

/** Items newest first (PRD §6.1), paginated at NEWS_PAGE_SIZE per page. */
export async function getNewsPage(
  dataDir: string,
  options: NewsPageOptions,
): Promise<NewsPageResponse> {
  const [allItems, statesFile] = await Promise.all([readNews(dataDir), readNewsStates(dataDir)]);

  const inCategory = allItems.filter((item) => item.category === options.category);
  const sorted = [...inCategory].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const counts = {
    all: sorted.length,
    unread: sorted.filter((item) => stateOf(item, statesFile) === "unread").length,
    read: sorted.filter((item) => stateOf(item, statesFile) === "read").length,
  };

  const filtered =
    options.state === "all"
      ? sorted
      : sorted.filter((item) => stateOf(item, statesFile) === options.state);

  const totalPages = Math.max(1, Math.ceil(filtered.length / NEWS_PAGE_SIZE));
  const start = (options.page - 1) * NEWS_PAGE_SIZE;
  const items = filtered.slice(start, start + NEWS_PAGE_SIZE);

  return { items, counts, page: options.page, pageSize: NEWS_PAGE_SIZE, totalPages };
}
