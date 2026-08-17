import { describe, expect, it } from "vitest";
import { NewsStateSchema, NewsStatesFileSchema, TombstoneSchema } from "./news-state.js";

const validState = {
  state: "read",
  updatedAt: "2026-01-01T12:00:00Z",
  readAt: "2026-01-01T12:00:00Z",
};

describe("NewsStateSchema", () => {
  it("accepts a valid state", () => {
    expect(NewsStateSchema.parse(validState)).toEqual(validState);
  });

  it("accepts a state with no optional timestamps", () => {
    expect(
      NewsStateSchema.parse({ state: "unread", updatedAt: "2026-01-01T12:00:00Z" }),
    ).toBeTruthy();
  });

  it("rejects an unknown state value", () => {
    expect(() => NewsStateSchema.parse({ ...validState, state: "archived" })).toThrow();
  });

  it("rejects a non-ISO updatedAt", () => {
    expect(() => NewsStateSchema.parse({ ...validState, updatedAt: "2026-01-01" })).toThrow();
  });
});

describe("NewsStatesFileSchema", () => {
  it("accepts a file with schemaVersion 1 and a map of items", () => {
    const file = { schemaVersion: 1, items: { abc123: validState } };
    expect(NewsStatesFileSchema.parse(file)).toEqual(file);
  });

  it("rejects a schemaVersion other than 1", () => {
    expect(() => NewsStatesFileSchema.parse({ schemaVersion: 2, items: {} })).toThrow();
  });
});

describe("TombstoneSchema", () => {
  it("accepts an ignored state entry as a tombstone", () => {
    const tombstone = {
      state: "ignored",
      updatedAt: "2026-01-01T12:00:00Z",
      ignoredAt: "2026-01-01T12:00:00Z",
    };
    expect(TombstoneSchema.parse(tombstone)).toEqual(tombstone);
  });

  it("rejects a non-ignored state as a tombstone", () => {
    expect(() => TombstoneSchema.parse(validState)).toThrow();
  });
});
