import { describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { applyUndatedBaseline } from "./undated-baseline.js";

const datedItem = (id: string): NewsItem => ({
  id,
  sourceId: "s",
  heading: `Dated ${id}`,
  label: "Release",
  link: `https://example.com/${id}`,
  date: "2026-01-01",
  dateBasis: "published",
  category: "web-core",
  tags: [],
});

const undatedItem = (id: string): NewsItem => ({
  id,
  sourceId: "s",
  heading: `Undated ${id}`,
  label: "Engineering Article",
  link: `https://example.com/${id}`,
  date: "2026-01-01",
  dateBasis: "discovered",
  category: "web-core",
  tags: [],
});

describe("applyUndatedBaseline", () => {
  it("always imports dated (published) items, regardless of sync state", () => {
    const result = applyUndatedBaseline([datedItem("d1")], true, []);
    expect(result.itemsToImport).toEqual([datedItem("d1")]);
    expect(result.updatedKnownUndatedIds).toEqual([]);
  });

  it("on the initial sync, records undated items but imports none of them", () => {
    const result = applyUndatedBaseline([undatedItem("u1"), undatedItem("u2")], true, []);
    expect(result.itemsToImport).toEqual([]);
    expect(result.updatedKnownUndatedIds.sort()).toEqual(["u1", "u2"]);
  });

  it("imports a genuinely new undated item found after the baseline, and records it as known", () => {
    const result = applyUndatedBaseline([undatedItem("u-new")], false, ["u-old-1", "u-old-2"]);
    expect(result.itemsToImport).toEqual([undatedItem("u-new")]);
    expect(result.updatedKnownUndatedIds.sort()).toEqual(["u-new", "u-old-1", "u-old-2"].sort());
  });

  it("never re-imports or re-records an already-known undated item", () => {
    const result = applyUndatedBaseline([undatedItem("u-old-1")], false, ["u-old-1"]);
    expect(result.itemsToImport).toEqual([]);
    expect(result.updatedKnownUndatedIds).toEqual(["u-old-1"]);
  });

  it("mixes dated and undated items correctly on a first sync", () => {
    const result = applyUndatedBaseline([datedItem("d1"), undatedItem("u1")], true, []);
    expect(result.itemsToImport).toEqual([datedItem("d1")]);
    expect(result.updatedKnownUndatedIds).toEqual(["u1"]);
  });
});
