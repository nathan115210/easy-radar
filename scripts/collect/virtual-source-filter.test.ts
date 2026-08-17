import { describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { applyVirtualScope } from "./virtual-source-filter.js";

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "abc",
    sourceId: "s",
    heading: "Copilot: inline chat improvements",
    label: "Announcement",
    link: "https://github.blog/changelog/copilot-inline-chat",
    date: "2026-01-01",
    dateBasis: "published",
    category: "ai-engineering",
    tags: [],
    ...overrides,
  };
}

describe("applyVirtualScope", () => {
  it("returns every item unfiltered when there is no virtualScope", () => {
    const items = [item(), item({ id: "def", heading: "Something else entirely" })];
    expect(applyVirtualScope(items, undefined)).toEqual(items);
    expect(applyVirtualScope(items, {})).toEqual(items);
  });

  it("keeps only items whose heading contains titleContains, case-insensitively", () => {
    const copilot = item({ heading: "Copilot: inline chat improvements" });
    const actions = item({ id: "def", heading: "Actions: new runner image" });

    const result = applyVirtualScope([copilot, actions], {
      virtualScope: { titleContains: "copilot" },
    });

    expect(result).toEqual([copilot]);
  });

  it("excludes items whose heading contains titleExcludes", () => {
    const kept = item({ heading: "New testing utilities" });
    const excluded = item({ id: "def", heading: "New testing utilities (deprecated notice)" });

    const result = applyVirtualScope([kept, excluded], {
      virtualScope: { titleExcludes: "deprecated" },
    });

    expect(result).toEqual([kept]);
  });

  it("keeps only items whose link path starts with linkPathPrefix", () => {
    const testing = item({ link: "https://martinfowler.com/testing/one.html" });
    const architecture = item({ id: "def", link: "https://martinfowler.com/articles/one.html" });

    const result = applyVirtualScope([testing, architecture], {
      virtualScope: { linkPathPrefix: "/testing/" },
    });

    expect(result).toEqual([testing]);
  });

  it("requires every configured constraint to match, combining conditions", () => {
    const matches = item({
      heading: "Workers: new binding",
      link: "https://blog.cloudflare.com/tag/workers/new-binding",
    });
    const wrongTitle = item({
      id: "def",
      heading: "Pages: new binding",
      link: "https://blog.cloudflare.com/tag/workers/pages-binding",
    });
    const wrongPath = item({
      id: "ghi",
      heading: "Workers: another update",
      link: "https://blog.cloudflare.com/tag/pages/workers-mentioned",
    });

    const result = applyVirtualScope([matches, wrongTitle, wrongPath], {
      virtualScope: { titleContains: "Workers", linkPathPrefix: "/tag/workers/" },
    });

    expect(result).toEqual([matches]);
  });

  it("silently returns zero items when nothing matches this run, rather than throwing", () => {
    const items = [item({ heading: "Actions update" })];
    expect(applyVirtualScope(items, { virtualScope: { titleContains: "copilot" } })).toEqual([]);
  });

  it("ignores unrelated filter keys belonging to other adapters (e.g. official-api's itemsPath)", () => {
    const items = [item()];
    const result = applyVirtualScope(items, { itemsPath: "data.entries", headingField: "title" });
    expect(result).toEqual(items);
  });
});
