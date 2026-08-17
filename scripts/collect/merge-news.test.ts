import { describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { mergeNewsItems } from "./merge-news.js";

function item(id: string, heading = `Item ${id}`): NewsItem {
  return {
    id,
    sourceId: "s",
    heading,
    label: "Release",
    link: `https://example.com/${id}`,
    date: "2026-01-01",
    dateBasis: "published",
    category: "web-core",
    tags: [],
  };
}

describe("mergeNewsItems", () => {
  it("appends genuinely new items and reports them as added", () => {
    const { mergedNews, addedItems } = mergeNewsItems([item("existing")], [item("new")]);
    expect(mergedNews).toEqual([item("existing"), item("new")]);
    expect(addedItems).toEqual([item("new")]);
  });

  it("never overwrites an existing item, even if the discovered version differs", () => {
    const existing = item("a", "Original heading");
    const refetched = item("a", "Refetched heading — should be ignored");
    const { mergedNews, addedItems } = mergeNewsItems([existing], [refetched]);
    expect(mergedNews).toEqual([existing]);
    expect(addedItems).toEqual([]);
  });

  it("deduplicates within the discovered batch itself", () => {
    const { mergedNews, addedItems } = mergeNewsItems([], [item("dup"), item("dup")]);
    expect(mergedNews).toEqual([item("dup")]);
    expect(addedItems).toEqual([item("dup")]);
  });

  it("produces zero added items and an unchanged list on a run with no new discoveries", () => {
    const existing = [item("a"), item("b")];
    const { mergedNews, addedItems } = mergeNewsItems(existing, [item("a"), item("b")]);
    expect(mergedNews).toEqual(existing);
    expect(addedItems).toEqual([]);
  });
});
