import { describe, expect, it } from "vitest";
import { CollectionStatusFileSchema } from "./collection-status.js";

const validFile = {
  schemaVersion: 1,
  lastRunAt: "2026-01-01T12:00:00Z",
  coverage: { succeeded: 94, failed: 1, planned: 2, added: 5, total: 97 },
  sources: {
    "react-blog": { status: "active", lastSuccessAt: "2026-01-01T12:00:00Z" },
    "flaky-source": {
      status: "failing",
      lastAttemptAt: "2026-01-01T12:00:00Z",
      failureClass: "runtime-failing",
      reason: "HTTP 503",
    },
  },
};

describe("CollectionStatusFileSchema", () => {
  it("accepts a valid file", () => {
    expect(CollectionStatusFileSchema.parse(validFile)).toEqual(validFile);
  });

  it("accepts a rejected run with reason and detail", () => {
    const rejected = {
      ...validFile,
      rejected: { reason: "volume-guard", detail: "212 items added, exceeds threshold of 200" },
    };
    expect(CollectionStatusFileSchema.parse(rejected)).toEqual(rejected);
  });

  it("rejects negative coverage counts", () => {
    const invalid = { ...validFile, coverage: { ...validFile.coverage, failed: -1 } };
    expect(() => CollectionStatusFileSchema.parse(invalid)).toThrow();
  });

  it("rejects an unknown failure class", () => {
    const invalid = {
      ...validFile,
      sources: {
        ...validFile.sources,
        "flaky-source": { ...validFile.sources["flaky-source"], failureClass: "cosmic-rays" },
      },
    };
    expect(() => CollectionStatusFileSchema.parse(invalid)).toThrow();
  });

  it("rejects an unknown rejection reason", () => {
    const invalid = { ...validFile, rejected: { reason: "vibes", detail: "n/a" } };
    expect(() => CollectionStatusFileSchema.parse(invalid)).toThrow();
  });
});
