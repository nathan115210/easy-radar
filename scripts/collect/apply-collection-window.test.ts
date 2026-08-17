import { describe, expect, it } from "vitest";
import type { NewsItem, SourceCursor } from "../../shared/schemas/index.js";
import { applyCollectionWindow } from "./apply-collection-window.js";

const now = new Date("2026-02-01T00:00:00Z");
const source = { initialSyncFrom: "2025-01-01" };

function datedItem(id: string, date: string): NewsItem {
  return {
    id,
    sourceId: "s",
    heading: `Item ${id}`,
    label: "Release",
    link: `https://example.com/${id}`,
    date,
    dateBasis: "published",
    category: "web-core",
    tags: [],
  };
}

function undatedItem(id: string): NewsItem {
  return {
    id,
    sourceId: "s",
    heading: `Undated ${id}`,
    label: "Engineering Article",
    link: `https://example.com/${id}`,
    date: "2026-02-01",
    dateBasis: "discovered",
    category: "web-core",
    tags: [],
  };
}

describe("applyCollectionWindow", () => {
  it("respects initialSyncFrom on the first sync for every source", () => {
    const oldItem = datedItem("old", "2025-06-01");
    const result = applyCollectionWindow([oldItem], source, undefined, now);
    expect(result.items).toEqual([oldItem]);
  });

  it("a normal run (recent cursor) only accepts items within the 36-hour window", () => {
    const cursor: SourceCursor = { lastRunAt: "2026-01-31T12:00:00Z" };
    const inWindow = datedItem("in", "2026-01-31");
    const outOfWindow = datedItem("out", "2026-01-20");
    const result = applyCollectionWindow([inWindow, outOfWindow], source, cursor, now);
    expect(result.items).toEqual([inWindow]);
  });

  it("a simulated 10-day gap recovers from the cursor and imports the missed items exactly once", () => {
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const cursor: SourceCursor = { lastRunAt: tenDaysAgo.toISOString() };
    const missedItem = datedItem("missed", "2026-01-25"); // within the gap, outside a normal 36h window

    const firstRun = applyCollectionWindow([missedItem], source, cursor, now);
    expect(firstRun.items).toEqual([missedItem]);

    // A following run, using the cursor the first run produced, must not
    // re-surface the same item — its window has moved forward to "now".
    const secondRunNow = new Date(now.getTime() + 60 * 60 * 1000);
    const secondRun = applyCollectionWindow(
      [missedItem],
      source,
      firstRun.updatedCursor,
      secondRunNow,
    );
    expect(secondRun.items).toEqual([]);
  });

  it("first sync on an undated source records the baseline and imports nothing", () => {
    const result = applyCollectionWindow([undatedItem("u1")], source, undefined, now);
    expect(result.items).toEqual([]);
    expect(result.updatedCursor.knownUndatedIds).toEqual(["u1"]);
  });

  it("a subsequently added undated URL is imported with dateBasis discovered", () => {
    const cursorAfterBaseline: SourceCursor = {
      lastRunAt: "2026-01-31T12:00:00Z",
      knownUndatedIds: ["u-old"],
    };
    const newUndated = undatedItem("u-new");

    const result = applyCollectionWindow([newUndated], source, cursorAfterBaseline, now);

    expect(result.items).toEqual([newUndated]);
    expect(result.items[0]!.dateBasis).toBe("discovered");
    expect(result.updatedCursor.knownUndatedIds?.sort()).toEqual(["u-new", "u-old"]);
  });

  it("updates lastRunAt and lastItemDate on the returned cursor", () => {
    const result = applyCollectionWindow(
      [datedItem("a", "2026-01-31"), datedItem("b", "2026-01-30")],
      source,
      undefined,
      now,
    );
    expect(result.updatedCursor.lastRunAt).toBe(now.toISOString());
    expect(result.updatedCursor.lastItemDate).toBe("2026-01-31");
  });

  it("preserves the previous lastItemDate when a run finds no items", () => {
    const cursor: SourceCursor = { lastRunAt: "2026-01-31T12:00:00Z", lastItemDate: "2026-01-20" };
    const result = applyCollectionWindow([], source, cursor, now);
    expect(result.updatedCursor.lastItemDate).toBe("2026-01-20");
  });
});
