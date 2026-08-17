import { describe, expect, it } from "vitest";
import type { NewsState } from "../../shared/schemas/index.js";
import { isLiveTombstone, TOMBSTONE_TTL_MS } from "./tombstone.js";

describe("isLiveTombstone", () => {
  it("is live just under 48 hours after ignoredAt", () => {
    const ignoredAt = "2026-01-01T00:00:00.000Z";
    const state: NewsState = { state: "ignored", updatedAt: ignoredAt, ignoredAt };
    const now = new Date(Date.parse(ignoredAt) + TOMBSTONE_TTL_MS - 1);
    expect(isLiveTombstone(state, now)).toBe(true);
  });

  it("expires exactly at 48 hours", () => {
    const ignoredAt = "2026-01-01T00:00:00.000Z";
    const state: NewsState = { state: "ignored", updatedAt: ignoredAt, ignoredAt };
    const now = new Date(Date.parse(ignoredAt) + TOMBSTONE_TTL_MS);
    expect(isLiveTombstone(state, now)).toBe(false);
  });

  it("is never a tombstone for a non-ignored state", () => {
    const state: NewsState = { state: "read", updatedAt: "2026-01-01T00:00:00.000Z" };
    expect(isLiveTombstone(state, new Date("2026-01-01T00:00:01.000Z"))).toBe(false);
  });
});
