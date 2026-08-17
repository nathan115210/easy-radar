import type {
  CategorySources,
  CollectionStatusResponse,
  MonitoredSourceView,
  NewsItemView,
  NewsPageResponse,
  ReferenceSourceView,
  SourcesResponse,
} from "../../shared/schemas/index.js";
import { NEWS_PAGE_SIZE } from "../../shared/schemas/index.js";

/** Fixture builders for the API response shapes components under test consume. */

export function newsItemView(overrides: Partial<NewsItemView> = {}): NewsItemView {
  return {
    id: "web-core:some-source:2026-02-20:abc123",
    sourceId: "some-source",
    heading: "A great engineering article",
    label: "Engineering Article",
    link: "https://example.com/articles/1",
    date: "2026-02-20",
    dateBasis: "published",
    category: "web-core",
    tags: [],
    state: "unread",
    ...overrides,
  };
}

export function newsPageResponse(overrides: Partial<NewsPageResponse> = {}): NewsPageResponse {
  const items = overrides.items ?? [newsItemView()];
  return {
    items,
    counts: { all: items.length, unread: items.length, read: 0 },
    page: 1,
    pageSize: NEWS_PAGE_SIZE,
    totalPages: 1,
    ...overrides,
  };
}

export function collectionStatusResponse(
  overrides: Partial<CollectionStatusResponse> = {},
): CollectionStatusResponse {
  return {
    lastRunAt: "2026-02-20T08:00:00.000Z",
    stale: false,
    coverage: { succeeded: 5, failed: 0, planned: 0, added: 3, total: 5 },
    ...overrides,
  };
}

export function monitoredSourceView(
  overrides: Partial<MonitoredSourceView> = {},
): MonitoredSourceView {
  return {
    id: "some-source",
    name: "Some Source",
    url: "https://example.com/feed",
    kind: "feed",
    status: "active",
    lastSuccessAt: "2026-02-20T08:00:00.000Z",
    lastAttemptAt: "2026-02-20T08:00:00.000Z",
    tags: [],
    ...overrides,
  };
}

export function referenceSourceView(
  overrides: Partial<ReferenceSourceView> = {},
): ReferenceSourceView {
  return {
    id: "some-reference",
    name: "Some Reference",
    url: "https://example.com/docs",
    ...overrides,
  };
}

export function categorySources(overrides: Partial<CategorySources> = {}): CategorySources {
  const monitored = overrides.monitored ?? [monitoredSourceView()];
  const referenceOnly = overrides.referenceOnly ?? [];
  return {
    category: "web-core",
    coverage: {
      active: monitored.filter((s) => s.status === "active").length,
      failing: monitored.filter((s) => s.status === "failing").length,
      planned: monitored.filter((s) => s.status === "planned").length,
      total: monitored.length,
    },
    monitored,
    referenceOnly,
    ...overrides,
  };
}

export function sourcesResponse(overrides: Partial<SourcesResponse> = {}): SourcesResponse {
  return {
    categories: [categorySources()],
    ...overrides,
  };
}
