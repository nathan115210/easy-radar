import { describe, expect, it } from "vitest";
import { createOfficialApiAdapter } from "../../scripts/collect/adapters/official-api.js";
import { makeSource } from "../../scripts/collect/engine/test-fixtures.js";
import { loadFixture } from "../fixtures/load-fixture.js";

const changelogJson = loadFixture("api/changelog-sample.json");

const source = makeSource({
  id: "example-changelog",
  adapter: "official-api",
  kind: "api",
  url: "https://example.com/api/changelog",
  filters: {
    itemsPath: "data.entries",
    headingField: "title",
    linkField: "url",
    dateField: "publishedAt",
  },
});

describe("createOfficialApiAdapter", () => {
  it("navigates to the configured items path and maps heading/link/date fields", async () => {
    const adapter = createOfficialApiAdapter({
      fetchImpl: async () => new Response(changelogJson, { status: 200 }),
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      sourceId: "example-changelog",
      heading: "Add support for edge middleware",
      link: "https://example.com/changelog/edge-middleware",
      label: "Announcement",
      date: "2026-02-01",
      dateBasis: "published",
    });
  });

  it("falls back to discovered date for an item with no trustworthy date field", async () => {
    const adapter = createOfficialApiAdapter({
      fetchImpl: async () => new Response(changelogJson, { status: 200 }),
      now: () => new Date("2026-04-01T00:00:00Z"),
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });
    const undated = items.find((item) => item.heading === "Undated entry");

    expect(undated).toMatchObject({ dateBasis: "discovered", date: "2026-04-01" });
  });

  it("defaults to root-array items and title/url fields when filters are omitted", async () => {
    const rootArray = JSON.stringify([{ title: "Root item", url: "https://example.com/root" }]);
    const rootSource = makeSource({
      id: "example-root-api",
      adapter: "official-api",
      kind: "api",
      url: "https://example.com/api/root",
    });
    const adapter = createOfficialApiAdapter({
      fetchImpl: async () => new Response(rootArray, { status: 200 }),
    });

    const items = await adapter.collect({
      source: rootSource,
      signal: new AbortController().signal,
    });

    expect(items[0]).toMatchObject({ heading: "Root item", link: "https://example.com/root" });
  });

  it("throws a specific error when the response no longer has an array at the configured path", async () => {
    const restructured = JSON.stringify({ data: { entries: "not an array anymore" } });
    const adapter = createOfficialApiAdapter({
      fetchImpl: async () => new Response(restructured, { status: 200 }),
    });

    await expect(adapter.collect({ source, signal: new AbortController().signal })).rejects.toThrow(
      /did not contain an array of items/,
    );
  });

  it("throws a specific error when an item is missing its configured heading field", async () => {
    const missingField = JSON.stringify({
      data: { entries: [{ url: "https://example.com/x", publishedAt: "2026-01-01" }] },
    });
    const adapter = createOfficialApiAdapter({
      fetchImpl: async () => new Response(missingField, { status: 200 }),
    });

    await expect(adapter.collect({ source, signal: new AbortController().signal })).rejects.toThrow(
      /missing a valid "title" field/,
    );
  });

  it("throws on an HTTP error response", async () => {
    const adapter = createOfficialApiAdapter({
      fetchImpl: async () => new Response("server error", { status: 500 }),
    });

    await expect(adapter.collect({ source, signal: new AbortController().signal })).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it("throws on zero items rather than silently succeeding empty", async () => {
    const empty = JSON.stringify({ data: { entries: [] } });
    const adapter = createOfficialApiAdapter({
      fetchImpl: async () => new Response(empty, { status: 200 }),
    });

    await expect(adapter.collect({ source, signal: new AbortController().signal })).rejects.toThrow(
      /zero items/,
    );
  });
});
