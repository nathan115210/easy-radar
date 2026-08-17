import { describe, expect, it } from "vitest";
import type { NewsItem, NewsStatesFile } from "../../shared/schemas/index.js";
import { runCleanup } from "./run-cleanup.js";

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
    tags: [],
    ...overrides,
  };
}

function states(entries: NewsStatesFile["items"]): NewsStatesFile {
  return { schemaVersion: 1, items: entries };
}

describe("runCleanup", () => {
  it("retains unread items regardless of age", () => {
    const items = [item("a")];
    const statesFile = states({
      a: { state: "unread", updatedAt: "2000-01-01T00:00:00.000Z" },
    });

    const result = runCleanup(items, statesFile, new Date("2030-01-01T00:00:00.000Z"));

    expect(result.items).toEqual(items);
    expect(result.statesFile.items).toEqual(statesFile.items);
    expect(result.prunedTombstoneIds).toEqual([]);
    expect(result.reAddedIgnoredIds).toEqual([]);
    expect(result.expiredReadIds).toEqual([]);
  });

  it("scrubs an active item that reappeared while its ignore tombstone is still live", () => {
    // Simulates the 36h collection overlap re-adding an item the user just ignored.
    const items = [item("a")];
    const statesFile = states({
      a: {
        state: "ignored",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ignoredAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = runCleanup(items, statesFile, new Date("2026-01-01T12:00:00.000Z"));

    expect(result.items).toEqual([]);
    expect(result.reAddedIgnoredIds).toEqual(["a"]);
    // The live tombstone itself is untouched.
    expect(result.statesFile.items.a).toEqual(statesFile.items.a);
    expect(result.prunedTombstoneIds).toEqual([]);
  });

  it("prunes an expired tombstone and does not scrub an item that reappears after it expires", () => {
    const items = [item("a")];
    const statesFile = states({
      a: {
        state: "ignored",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ignoredAt: "2026-01-01T00:00:00.000Z",
      },
    });

    // 49 hours later — past the 48h tombstone window, and "a" was genuinely republished.
    const result = runCleanup(items, statesFile, new Date("2026-01-03T01:00:00.000Z"));

    expect(result.prunedTombstoneIds).toEqual(["a"]);
    expect(result.reAddedIgnoredIds).toEqual([]);
    expect(result.items).toEqual(items);
    expect(result.statesFile.items.a).toBeUndefined();
  });

  it("expires a read item older than two calendar months, removing it from both files", () => {
    const items = [item("a")];
    const statesFile = states({
      a: {
        state: "read",
        updatedAt: "2026-01-01T00:00:00.000Z",
        readAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = runCleanup(items, statesFile, new Date("2026-03-15T00:00:00.000Z"));

    expect(result.items).toEqual([]);
    expect(result.statesFile.items.a).toBeUndefined();
    expect(result.expiredReadIds).toEqual(["a"]);
  });

  it("retains a read item that hasn't reached two calendar months yet", () => {
    const items = [item("a")];
    const statesFile = states({
      a: {
        state: "read",
        updatedAt: "2026-01-15T00:00:00.000Z",
        readAt: "2026-01-15T00:00:00.000Z",
      },
    });

    const result = runCleanup(items, statesFile, new Date("2026-03-01T00:00:00.000Z"));

    expect(result.items).toEqual(items);
    expect(result.statesFile.items.a).toEqual(statesFile.items.a);
    expect(result.expiredReadIds).toEqual([]);
  });

  it("handles an expired-read state entry whose item no longer exists, without error", () => {
    const statesFile = states({
      orphan: {
        state: "read",
        updatedAt: "2026-01-01T00:00:00.000Z",
        readAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = runCleanup([], statesFile, new Date("2026-06-01T00:00:00.000Z"));

    expect(result.items).toEqual([]);
    expect(result.statesFile.items.orphan).toBeUndefined();
    expect(result.expiredReadIds).toEqual(["orphan"]);
  });

  it("processes an unrelated mix of items independently and correctly", () => {
    const items = [
      item("unread-item"),
      item("reappeared-ignored"),
      item("fresh-read"),
      item("stale"),
    ];
    const statesFile = states({
      "unread-item": { state: "unread", updatedAt: "2026-01-01T00:00:00.000Z" },
      "reappeared-ignored": {
        state: "ignored",
        updatedAt: "2026-02-09T00:00:00.000Z",
        ignoredAt: "2026-02-09T00:00:00.000Z",
      },
      "fresh-read": {
        state: "read",
        updatedAt: "2026-02-01T00:00:00.000Z",
        readAt: "2026-02-01T00:00:00.000Z",
      },
      stale: {
        state: "read",
        updatedAt: "2025-11-01T00:00:00.000Z",
        readAt: "2025-11-01T00:00:00.000Z",
      },
    });

    const result = runCleanup(items, statesFile, new Date("2026-02-10T00:00:00.000Z"));

    const remainingIds = result.items.map((entry) => entry.id).sort();
    expect(remainingIds).toEqual(["fresh-read", "unread-item"]);
    expect(result.reAddedIgnoredIds).toEqual(["reappeared-ignored"]);
    expect(result.expiredReadIds).toEqual(["stale"]);
    expect(Object.keys(result.statesFile.items).sort()).toEqual([
      "fresh-read",
      "reappeared-ignored",
      "unread-item",
    ]);
  });
});
