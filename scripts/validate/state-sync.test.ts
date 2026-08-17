import { describe, expect, it } from "vitest";
import type { NewsItem, NewsStatesFile } from "../../shared/schemas/index.js";
import { validateStateSync } from "./state-sync.js";

const now = new Date("2026-06-01T00:00:00Z");

function item(id: string): NewsItem {
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
  };
}

describe("validateStateSync", () => {
  it("passes when every active item has a matching state entry and there are no extras", () => {
    const items = [item("a")];
    const states: NewsStatesFile = {
      schemaVersion: 1,
      items: { a: { state: "unread", updatedAt: now.toISOString() } },
    };
    expect(validateStateSync(items, states, now)).toEqual([]);
  });

  it("flags an active item with no state entry", () => {
    const issues = validateStateSync([item("a")], { schemaVersion: 1, items: {} }, now);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ check: "state-missing-for-item" });
    expect(issues[0]!.message).toContain("a");
  });

  it("flags a state entry with no matching item and no tombstone", () => {
    const states: NewsStatesFile = {
      schemaVersion: 1,
      items: { orphan: { state: "read", updatedAt: now.toISOString() } },
    };
    const issues = validateStateSync([], states, now);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ check: "state-orphaned-entry" });
    expect(issues[0]!.message).toContain("orphan");
  });

  it("tolerates an orphaned state entry that is a live ignore tombstone (within 48h)", () => {
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const states: NewsStatesFile = {
      schemaVersion: 1,
      items: {
        tombstoned: { state: "ignored", updatedAt: twelveHoursAgo, ignoredAt: twelveHoursAgo },
      },
    };
    expect(validateStateSync([], states, now)).toEqual([]);
  });

  it("flags an ignore tombstone once it's older than 48h", () => {
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const states: NewsStatesFile = {
      schemaVersion: 1,
      items: { stale: { state: "ignored", updatedAt: threeDaysAgo, ignoredAt: threeDaysAgo } },
    };
    const issues = validateStateSync([], states, now);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ check: "state-orphaned-entry" });
  });

  it("does not treat an orphaned read or unread entry as a tombstone", () => {
    const states: NewsStatesFile = {
      schemaVersion: 1,
      items: { a: { state: "read", updatedAt: now.toISOString() } },
    };
    const issues = validateStateSync([], states, now);
    expect(issues).toHaveLength(1);
  });
});
