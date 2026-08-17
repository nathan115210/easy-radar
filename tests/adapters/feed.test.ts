import { describe, expect, it } from "vitest";
import { createFeedAdapter } from "../../scripts/collect/adapters/feed.js";
import { parseFeedEntries } from "../../scripts/collect/adapters/feed-entries.js";
import { makeSource } from "../../scripts/collect/engine/test-fixtures.js";
import { loadFixture } from "../fixtures/load-fixture.js";

const rss = loadFixture("feed/rss-basic.xml");
const atom = loadFixture("feed/atom-basic.xml");
const jsonFeed = loadFixture("feed/json-feed-basic.json");

describe("parseFeedEntries — RSS 2.0", () => {
  const entries = parseFeedEntries(rss, "https://example.com/feed.xml");

  it("maps title, resolves a relative link against the feed url, and reads pubDate", () => {
    expect(entries[0]).toMatchObject({
      heading: "Shipping the new release",
      link: "https://example.com/blog/2026/01/01/shipping-the-new-release",
      structuredTags: ["release", "engineering"],
    });
    expect(entries[0]!.publishedAt?.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("leaves publishedAt undefined for an entry with no pubDate", () => {
    expect(entries[1]!.publishedAt).toBeUndefined();
  });
});

describe("parseFeedEntries — Atom", () => {
  const entries = parseFeedEntries(atom, "https://example.com/feed.xml");

  it("resolves a protocol-relative link and reads published (not updated)", () => {
    expect(entries[0]).toMatchObject({
      heading: "Introducing the new API",
      link: "https://example.com/posts/new-api",
      structuredTags: ["api", "announcement"],
    });
    expect(entries[0]!.publishedAt?.toISOString().slice(0, 10)).toBe("2026-01-05");
  });

  it("treats an entry with only `updated` (no `published`) as undated", () => {
    // Regression guard for PRD §11.3: `updated` must never be read as a publication date.
    expect(entries[1]).toMatchObject({ heading: "Draft notes" });
    expect(entries[1]!.publishedAt).toBeUndefined();
  });
});

describe("parseFeedEntries — JSON Feed", () => {
  const entries = parseFeedEntries(jsonFeed, "https://example.com/feed.json");

  it("reads date_published (not date_modified) and tags", () => {
    expect(entries[0]).toMatchObject({
      heading: "Launching our JSON Feed",
      link: "https://example.com/posts/json-feed-launch",
      structuredTags: ["announcement", "feeds"],
    });
    expect(entries[0]!.publishedAt?.toISOString().slice(0, 10)).toBe("2026-01-10");
  });

  it("leaves publishedAt undefined for an item with no date_published", () => {
    expect(entries[1]!.publishedAt).toBeUndefined();
  });
});

describe("createFeedAdapter", () => {
  const source = makeSource({
    id: "example-blog",
    adapter: "feed",
    url: "https://example.com/feed.xml",
  });

  it("maps a dated entry to a NewsItem with dateBasis published", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(rss, { status: 200 }),
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items[0]).toMatchObject({
      sourceId: "example-blog",
      heading: "Shipping the new release",
      label: "Engineering Article",
      date: "2026-01-01",
      dateBasis: "published",
      category: "web-core",
    });
  });

  it("maps an undated entry to dateBasis discovered, using the injected clock — not a fabricated published date", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(rss, { status: 200 }),
      now: () => new Date("2026-03-01T00:00:00Z"),
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });
    const undated = items.find((item) => item.heading === "An undated post");

    expect(undated).toMatchObject({ dateBasis: "discovered", date: "2026-03-01" });
  });

  it("merges static source tags with structured feed categories", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(rss, { status: 200 }),
    });
    const withTags = { ...source, tags: ["react"] };

    const items = await adapter.collect({ source: withTags, signal: new AbortController().signal });

    expect(items[0]!.tags).toEqual(["engineering", "react", "release"]);
  });

  it("returns no items on a 304 Not Modified response", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(null, { status: 304 }),
    });
    const items = await adapter.collect({ source, signal: new AbortController().signal });
    expect(items).toEqual([]);
  });

  it("throws a useful error on an HTTP error response", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response("not found", { status: 404 }),
    });
    await expect(adapter.collect({ source, signal: new AbortController().signal })).rejects.toThrow(
      /HTTP 404/,
    );
  });

  it("throws a useful error on malformed XML", async () => {
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response("<rss><channel><item><title>oops", { status: 200 }),
    });
    await expect(
      adapter.collect({ source, signal: new AbortController().signal }),
    ).rejects.toThrow();
  });

  it("throws a useful error on an empty feed (zero entries)", async () => {
    const emptyRss =
      '<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title><link>https://example.com</link><description>Empty</description></channel></rss>';
    const adapter = createFeedAdapter({
      fetchImpl: async () => new Response(emptyRss, { status: 200 }),
    });
    await expect(adapter.collect({ source, signal: new AbortController().signal })).rejects.toThrow(
      /zero entries/i,
    );
  });

  it("adding a new feed source only needs config: the same adapter handles all three formats", async () => {
    const rssAdapter = createFeedAdapter({
      fetchImpl: async () => new Response(rss, { status: 200 }),
    });
    const atomAdapter = createFeedAdapter({
      fetchImpl: async () => new Response(atom, { status: 200 }),
    });
    const jsonAdapter = createFeedAdapter({
      fetchImpl: async () => new Response(jsonFeed, { status: 200 }),
    });

    const [rssItems, atomItems, jsonItems] = await Promise.all([
      rssAdapter.collect({ source, signal: new AbortController().signal }),
      atomAdapter.collect({ source, signal: new AbortController().signal }),
      jsonAdapter.collect({ source, signal: new AbortController().signal }),
    ]);

    expect(rssItems.length).toBeGreaterThan(0);
    expect(atomItems.length).toBeGreaterThan(0);
    expect(jsonItems.length).toBeGreaterThan(0);
  });
});
