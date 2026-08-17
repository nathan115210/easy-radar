import { describe, expect, it } from "vitest";
import type { NewsItem, SourceCursor } from "../../shared/schemas/index.js";
import { checkActiveItemMutationGuard, checkCursorRegression, checkVolumeGuard } from "./guards.js";

function item(id: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    sourceId: "s",
    heading: `Item ${id}`,
    label: "Release",
    link: `https://example.com/${id}`,
    date: "2026-01-01",
    dateBasis: "published",
    category: "web-core",
    tags: ["react"],
    ...overrides,
  };
}

describe("checkVolumeGuard", () => {
  it("does not reject at or below the threshold", () => {
    expect(checkVolumeGuard(200, 200)).toEqual({ rejected: false });
    expect(checkVolumeGuard(150, 200)).toEqual({ rejected: false });
  });

  it("rejects when added count exceeds the threshold", () => {
    const result = checkVolumeGuard(201, 200);
    expect(result).toMatchObject({ rejected: true, reason: "volume-guard" });
  });

  it("uses 200 as the default threshold", () => {
    expect(checkVolumeGuard(200).rejected).toBe(false);
    expect(checkVolumeGuard(201).rejected).toBe(true);
  });
});

describe("checkCursorRegression", () => {
  it("does not reject when there is no previous cursor for a source", () => {
    const updated: Record<string, SourceCursor> = { a: { lastRunAt: "2026-01-01T00:00:00Z" } };
    expect(checkCursorRegression({}, updated)).toEqual({ rejected: false });
  });

  it("does not reject when the cursor advances or stays the same", () => {
    const previous: Record<string, SourceCursor> = { a: { lastRunAt: "2026-01-01T00:00:00Z" } };
    const advanced: Record<string, SourceCursor> = { a: { lastRunAt: "2026-01-02T00:00:00Z" } };
    const same: Record<string, SourceCursor> = { a: { lastRunAt: "2026-01-01T00:00:00Z" } };
    expect(checkCursorRegression(previous, advanced)).toEqual({ rejected: false });
    expect(checkCursorRegression(previous, same)).toEqual({ rejected: false });
  });

  it("rejects and names the source when a cursor moves backward", () => {
    const previous: Record<string, SourceCursor> = { a: { lastRunAt: "2026-01-05T00:00:00Z" } };
    const regressed: Record<string, SourceCursor> = { a: { lastRunAt: "2026-01-01T00:00:00Z" } };
    const result = checkCursorRegression(previous, regressed);
    expect(result).toMatchObject({ rejected: true, reason: "cursor-regression" });
    expect(result.rejected && result.detail).toMatch(/"a"/);
  });
});

describe("checkActiveItemMutationGuard", () => {
  it("does not reject when existing items are untouched, even with new ones added", () => {
    const previous = [item("a"), item("b")];
    const current = [item("a"), item("b"), item("c")];
    expect(checkActiveItemMutationGuard(previous, current, new Set())).toEqual({
      rejected: false,
    });
  });

  it("rejects when an existing active item is deleted outside of cleanup", () => {
    const previous = [item("a"), item("b")];
    const current = [item("a")];
    const result = checkActiveItemMutationGuard(previous, current, new Set());
    expect(result).toMatchObject({ rejected: true, reason: "active-item-mutation" });
    expect(result.rejected && result.detail).toMatch(/"b"/);
  });

  it("does not reject a deletion the cleanup step legitimately caused", () => {
    const previous = [item("a"), item("b")];
    const current = [item("a")];
    const result = checkActiveItemMutationGuard(previous, current, new Set(["b"]));
    expect(result).toEqual({ rejected: false });
  });

  it("rejects when an existing item's field is modified", () => {
    const previous = [item("a", { heading: "Original heading" })];
    const current = [item("a", { heading: "Rewritten heading" })];
    const result = checkActiveItemMutationGuard(previous, current, new Set());
    expect(result).toMatchObject({ rejected: true, reason: "active-item-mutation" });
    expect(result.rejected && result.detail).toMatch(/"a"/);
  });

  it("rejects when an existing item's tags are modified", () => {
    const previous = [item("a", { tags: ["react"] })];
    const current = [item("a", { tags: ["react", "compiler"] })];
    const result = checkActiveItemMutationGuard(previous, current, new Set());
    expect(result.rejected).toBe(true);
  });

  it("does not reject when there were no previous items at all", () => {
    const result = checkActiveItemMutationGuard([], [item("a")], new Set());
    expect(result).toEqual({ rejected: false });
  });
});
