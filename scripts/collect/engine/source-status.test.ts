import { describe, expect, it } from "vitest";
import { buildSourceStatuses } from "./source-status.js";
import type { SourceOutcome } from "./run-collection.js";
import { makeSource } from "./test-fixtures.js";

describe("buildSourceStatuses", () => {
  it("marks a planned source as planned with no timestamps", () => {
    const source = makeSource({ id: "planned-source", status: "planned" });
    const outcomes: SourceOutcome[] = [{ source, outcome: "planned" }];
    expect(buildSourceStatuses(outcomes)).toEqual({ "planned-source": { status: "planned" } });
  });

  it("marks a succeeded source as active with success and attempt timestamps", () => {
    const source = makeSource({ id: "good-source" });
    const outcomes: SourceOutcome[] = [
      {
        source,
        outcome: "succeeded",
        items: [],
        attemptedAt: "2026-01-01T00:00:00Z",
        succeededAt: "2026-01-01T00:00:05Z",
      },
    ];
    expect(buildSourceStatuses(outcomes)).toEqual({
      "good-source": {
        status: "active",
        lastSuccessAt: "2026-01-01T00:00:05Z",
        lastAttemptAt: "2026-01-01T00:00:00Z",
      },
    });
  });

  it("marks a failed source as failing with the failure class and reason", () => {
    const source = makeSource({ id: "bad-source" });
    const outcomes: SourceOutcome[] = [
      {
        source,
        outcome: "failed",
        failureClass: "runtime-failing",
        reason: "HTTP 503",
        attemptedAt: "2026-01-01T00:00:00Z",
      },
    ];
    expect(buildSourceStatuses(outcomes)).toEqual({
      "bad-source": {
        status: "failing",
        lastSuccessAt: undefined,
        lastAttemptAt: "2026-01-01T00:00:00Z",
        failureClass: "runtime-failing",
        reason: "HTTP 503",
      },
    });
  });

  it("carries forward lastSuccessAt from the previous run when a source fails", () => {
    const source = makeSource({ id: "flaky-source" });
    const outcomes: SourceOutcome[] = [
      {
        source,
        outcome: "failed",
        failureClass: "runtime-failing",
        reason: "timeout",
        attemptedAt: "2026-02-01T00:00:00Z",
      },
    ];
    const previous = {
      "flaky-source": { status: "active" as const, lastSuccessAt: "2026-01-15T00:00:00Z" },
    };

    expect(buildSourceStatuses(outcomes, previous)["flaky-source"]).toMatchObject({
      status: "failing",
      lastSuccessAt: "2026-01-15T00:00:00Z",
    });
  });
});
