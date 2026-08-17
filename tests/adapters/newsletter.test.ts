import { describe, expect, it } from "vitest";
import { createFeedAdapter } from "../../scripts/collect/adapters/feed.js";
import { makeSource } from "../../scripts/collect/engine/test-fixtures.js";
import { loadFixture } from "../fixtures/load-fixture.js";

const jsWeeklyRun1 = loadFixture("newsletter/javascript-weekly-run1.xml");
const jsWeeklyTitleEdited = loadFixture("newsletter/javascript-weekly-run1-title-edited.xml");
const frontendFocusRun1 = loadFixture("newsletter/frontend-focus-run1.xml");

/**
 * Newsletter sources are ordinary `kind: "feed"` sources with a label
 * override (PRD §30) — no dedicated "newsletter" adapter exists, since
 * one issue per feed entry is exactly what `createFeedAdapter` already
 * does. `filters.label: "Announcement"` is the one piece of config these
 * sources add on top of a plain feed source.
 */
function newsletterSource(overrides: Partial<Parameters<typeof makeSource>[0]> = {}) {
  return makeSource({
    id: "javascript-weekly",
    adapter: "feed",
    kind: "feed",
    url: "https://javascriptweekly.com/rss",
    category: "web-core",
    filters: { label: "Announcement" },
    ...overrides,
  });
}

describe("newsletter sources via the feed adapter (PRD §30)", () => {
  it("collects exactly one item per issue — an issue's embedded article links never fan out into separate items", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(jsWeeklyRun1, { status: 200 }),
    });
    const source = newsletterSource();

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    // Two <item> entries in the feed, three article links inside the first
    // entry's description — only the two issues become items.
    expect(items).toHaveLength(2);
  });

  it("heading is the issue title and link is the issue's own canonical permalink, not an embedded article link", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(jsWeeklyRun1, { status: 200 }),
    });
    const source = newsletterSource();

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items[0]).toMatchObject({
      heading: "JavaScript Weekly Issue 712: February 20, 2026",
      link: "https://javascriptweekly.com/issues/712",
    });
  });

  it("labels the issue Announcement via filters.label, not the feed adapter's default Engineering Article", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(jsWeeklyRun1, { status: 200 }),
    });
    const source = newsletterSource();

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items.every((item) => item.label === "Announcement")).toBe(true);
  });

  it("a second newsletter source (Frontend Focus) also collects one item per issue, labeled Announcement", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(frontendFocusRun1, { status: 200 }),
    });
    const source = newsletterSource({
      id: "frontend-focus",
      url: "https://frontendfoc.us/rss",
      filters: { label: "Announcement" },
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      heading: "Frontend Focus Issue 650",
      link: "https://frontendfoc.us/issues/650",
      label: "Announcement",
    });
  });

  it("an upstream title edit on re-collection does not change the issue's id — no duplicate is created", async () => {
    const source = newsletterSource();

    const before = await createFeedAdapter({
      fetchImpl: async () => new Response(jsWeeklyRun1, { status: 200 }),
    }).collect({ source, signal: new AbortController().signal });

    const after = await createFeedAdapter({
      fetchImpl: async () => new Response(jsWeeklyTitleEdited, { status: 200 }),
    }).collect({ source, signal: new AbortController().signal });

    const issue712Before = before.find((item) => item.link.endsWith("/712"));
    const issue712After = after.find((item) => item.link.endsWith("/712"));

    expect(issue712After?.heading).not.toBe(issue712Before?.heading);
    expect(issue712After?.id).toBe(issue712Before?.id);
  });

  it("falls back to the feed adapter's default label when no override is configured", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(jsWeeklyRun1, { status: 200 }),
    });
    const source = makeSource({
      id: "some-other-feed",
      adapter: "feed",
      kind: "feed",
      url: "https://example.com/rss",
      category: "web-core",
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items.every((item) => item.label === "Engineering Article")).toBe(true);
  });
});
