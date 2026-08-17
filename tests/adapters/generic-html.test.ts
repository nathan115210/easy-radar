import { describe, expect, it } from "vitest";
import { createGenericHtmlAdapter } from "../../scripts/collect/adapters/generic-html.js";
import { makeSource } from "../../scripts/collect/engine/test-fixtures.js";
import { loadFixture } from "../fixtures/load-fixture.js";

const jsonLdListing = loadFixture("generic-html/json-ld-listing.html");
const cheerioListing = loadFixture("generic-html/cheerio-listing.html");
const noMatches = loadFixture("generic-html/no-matches.html");

const jsonLdSource = makeSource({
  id: "example-jsonld-blog",
  adapter: "generic-html-json-ld",
  kind: "website",
  url: "https://example.com/blog",
});

const cheerioSource = makeSource({
  id: "example-cheerio-blog",
  adapter: "generic-html-json-ld",
  kind: "website",
  url: "https://example.com/blog",
  filters: {
    itemSelector: ".post",
    headingSelector: "h2",
    dateSelector: ".date",
    dateAttr: "datetime",
  },
});

describe("createGenericHtmlAdapter — JSON-LD tier", () => {
  it("prefers a schema.org ItemList over HTML parsing when present", async () => {
    const adapter = createGenericHtmlAdapter({
      fetchImpl: async () => new Response(jsonLdListing, { status: 200 }),
    });

    const items = await adapter.collect({
      source: jsonLdSource,
      signal: new AbortController().signal,
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      sourceId: "example-jsonld-blog",
      heading: "Shipping the new compiler",
      link: "https://example.com/blog/new-compiler",
      label: "Engineering Article",
      date: "2026-03-01",
      dateBasis: "published",
    });
  });

  it("falls back to discovered date for a JSON-LD entry with no datePublished", async () => {
    const adapter = createGenericHtmlAdapter({
      fetchImpl: async () => new Response(jsonLdListing, { status: 200 }),
      now: () => new Date("2026-04-01T00:00:00Z"),
    });

    const items = await adapter.collect({
      source: jsonLdSource,
      signal: new AbortController().signal,
    });
    const undated = items.find((item) => item.heading === "Undated retrospective");

    expect(undated).toMatchObject({ dateBasis: "discovered", date: "2026-04-01" });
  });
});

describe("createGenericHtmlAdapter — Cheerio fallback tier", () => {
  it("extracts items via the configured selectors when no JSON-LD is present", async () => {
    const adapter = createGenericHtmlAdapter({
      fetchImpl: async () => new Response(cheerioListing, { status: 200 }),
    });

    const items = await adapter.collect({
      source: cheerioSource,
      signal: new AbortController().signal,
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      sourceId: "example-cheerio-blog",
      heading: "Announcing the first post",
      link: "https://example.com/posts/first-post",
      label: "Engineering Article",
      date: "2026-02-10",
      dateBasis: "published",
    });
  });

  it("resolves a relative href against the source url", async () => {
    const adapter = createGenericHtmlAdapter({
      fetchImpl: async () => new Response(cheerioListing, { status: 200 }),
    });

    const items = await adapter.collect({
      source: cheerioSource,
      signal: new AbortController().signal,
    });

    expect(items.every((item) => item.link.startsWith("https://example.com/"))).toBe(true);
  });

  it("falls back to discovered date when no date selector matches", async () => {
    const adapter = createGenericHtmlAdapter({
      fetchImpl: async () => new Response(cheerioListing, { status: 200 }),
      now: () => new Date("2026-05-01T00:00:00Z"),
    });

    const items = await adapter.collect({
      source: cheerioSource,
      signal: new AbortController().signal,
    });
    const undated = items.find((item) => item.heading === "A second, undated post");

    expect(undated).toMatchObject({ dateBasis: "discovered", date: "2026-05-01" });
  });
});

describe("createGenericHtmlAdapter — structural failure surfacing", () => {
  it("throws a specific error, not a silent empty result, when the page structure changes", async () => {
    const adapter = createGenericHtmlAdapter({
      fetchImpl: async () => new Response(noMatches, { status: 200 }),
    });

    await expect(
      adapter.collect({ source: cheerioSource, signal: new AbortController().signal }),
    ).rejects.toThrow(/No items could be extracted/);
  });

  it("throws on an HTTP error response", async () => {
    const adapter = createGenericHtmlAdapter({
      fetchImpl: async () => new Response("not found", { status: 404 }),
    });

    await expect(
      adapter.collect({ source: cheerioSource, signal: new AbortController().signal }),
    ).rejects.toThrow(/HTTP 404/);
  });
});
