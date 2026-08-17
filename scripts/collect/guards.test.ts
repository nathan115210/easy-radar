import { describe, expect, it } from "vitest";
import type { SourceCursor } from "../../shared/schemas/index.js";
import { checkCursorRegression, checkVolumeGuard } from "./guards.js";

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
