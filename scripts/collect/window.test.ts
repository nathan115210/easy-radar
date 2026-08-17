import { describe, expect, it } from "vitest";
import type { SourceCursor } from "../../shared/schemas/index.js";
import { COLLECTION_WINDOW_HOURS, computeWindowStart, isWithinWindow } from "./window.js";

const now = new Date("2026-02-01T00:00:00Z");

describe("computeWindowStart", () => {
  it("uses initialSyncFrom directly on a first sync (no cursor), not capped at 36h", () => {
    const initialSyncFrom = "2025-01-01";
    const windowStart = computeWindowStart(undefined, initialSyncFrom, now);
    expect(windowStart.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("uses the 36-hour floor when the cursor is recent (normal run)", () => {
    const cursor: SourceCursor = { lastRunAt: "2026-01-31T12:00:00Z" }; // 12h ago
    const windowStart = computeWindowStart(cursor, "2025-01-01", now);
    const expectedFloor = new Date(now.getTime() - COLLECTION_WINDOW_HOURS * 60 * 60 * 1000);
    expect(windowStart.getTime()).toBe(expectedFloor.getTime());
  });

  it("extends back to the cursor position when it's older than 36 hours (gap recovery)", () => {
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const cursor: SourceCursor = { lastRunAt: tenDaysAgo.toISOString() };
    const windowStart = computeWindowStart(cursor, "2025-01-01", now);
    expect(windowStart.getTime()).toBe(tenDaysAgo.getTime());
  });
});

describe("isWithinWindow", () => {
  it("accepts an item dated on or after the window start", () => {
    const windowStart = new Date("2026-01-30T00:00:00Z");
    expect(isWithinWindow({ date: "2026-01-30" }, windowStart)).toBe(true);
    expect(isWithinWindow({ date: "2026-02-01" }, windowStart)).toBe(true);
  });

  it("rejects an item dated before the window start", () => {
    const windowStart = new Date("2026-01-30T00:00:00Z");
    expect(isWithinWindow({ date: "2026-01-29" }, windowStart)).toBe(false);
  });
});
