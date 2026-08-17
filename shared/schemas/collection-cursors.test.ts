import { describe, expect, it } from "vitest";
import { CollectionCursorsFileSchema } from "./collection-cursors.js";

const validFile = {
  schemaVersion: 1,
  cursors: {
    "react-blog": {
      lastRunAt: "2026-01-01T12:00:00Z",
      lastItemDate: "2026-01-01",
      lastItemId: "abc123",
    },
  },
};

describe("CollectionCursorsFileSchema", () => {
  it("accepts a valid file", () => {
    expect(CollectionCursorsFileSchema.parse(validFile)).toEqual(validFile);
  });

  it("accepts a cursor with no item recorded yet", () => {
    const file = {
      schemaVersion: 1,
      cursors: { "react-blog": { lastRunAt: "2026-01-01T12:00:00Z" } },
    };
    expect(CollectionCursorsFileSchema.parse(file)).toEqual(file);
  });

  it("accepts a cursor with knownUndatedIds recorded from the undated-source baseline", () => {
    const file = {
      schemaVersion: 1,
      cursors: {
        "react-blog": { lastRunAt: "2026-01-01T12:00:00Z", knownUndatedIds: ["abc123", "def456"] },
      },
    };
    expect(CollectionCursorsFileSchema.parse(file)).toEqual(file);
  });

  it("rejects a cursor missing lastRunAt", () => {
    const invalid = { schemaVersion: 1, cursors: { "react-blog": { lastItemId: "abc123" } } };
    expect(() => CollectionCursorsFileSchema.parse(invalid)).toThrow();
  });

  it("rejects a schemaVersion other than 1", () => {
    expect(() => CollectionCursorsFileSchema.parse({ ...validFile, schemaVersion: 2 })).toThrow();
  });
});
