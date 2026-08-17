import type { SourceConfig } from "../../../shared/schemas/index.js";

export function makeSource(overrides: Partial<SourceConfig> = {}): SourceConfig {
  return {
    id: "react-blog",
    name: "React Blog",
    category: "web-core",
    kind: "feed",
    url: "https://react.dev/rss.xml",
    adapter: "feed",
    initialSyncFrom: "2026-01-01",
    status: "active",
    tags: ["react"],
    ...overrides,
  };
}
