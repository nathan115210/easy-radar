import { describe, expect, it } from "vitest";
import type { NewsItem } from "../../../shared/schemas/index.js";
import { summarizeOutcomes } from "./log-summary.js";
import type { SourceOutcome } from "./run-collection.js";
import { makeSource } from "./test-fixtures.js";

const item = (id: string): NewsItem => ({
  id,
  sourceId: "s",
  heading: "h",
  label: "Release",
  link: `https://example.com/${id}`,
  date: "2026-01-01",
  dateBasis: "published",
  category: "web-core",
  tags: [],
});

describe("summarizeOutcomes", () => {
  it("reports succeeded, failed, planned, and added counts", () => {
    const outcomes: SourceOutcome[] = [
      {
        source: makeSource({ id: "a" }),
        outcome: "succeeded",
        items: [item("1"), item("2")],
        attemptedAt: "t",
        succeededAt: "t",
      },
      {
        source: makeSource({ id: "b" }),
        outcome: "failed",
        failureClass: "runtime-failing",
        reason: "HTTP 503",
        attemptedAt: "t",
      },
      { source: makeSource({ id: "c", status: "planned" }), outcome: "planned" },
    ];

    const summary = summarizeOutcomes(outcomes);
    expect(summary).toContain("1 succeeded, 1 failed, 1 planned, 2 added");
    expect(summary).toContain("FAILED  b: HTTP 503");
  });

  it("produces a clean summary line when nothing failed", () => {
    const outcomes: SourceOutcome[] = [
      {
        source: makeSource({ id: "a" }),
        outcome: "succeeded",
        items: [],
        attemptedAt: "t",
        succeededAt: "t",
      },
    ];
    expect(summarizeOutcomes(outcomes)).toBe(
      "Collection run: 1 succeeded, 0 failed, 0 planned, 0 added",
    );
  });
});
