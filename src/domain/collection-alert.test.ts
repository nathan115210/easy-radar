import { describe, expect, it } from "vitest";
import {
  findDeepLinkTarget,
  formatRejection,
  getAlertTitle,
  getSeverity,
} from "./collection-alert.js";
import type { CategorySources, CollectionStatusResponse } from "../../shared/schemas/index.js";

function status(overrides: Partial<CollectionStatusResponse> = {}): CollectionStatusResponse {
  return {
    lastRunAt: "2026-01-01T00:00:00Z",
    stale: false,
    coverage: { succeeded: 94, failed: 0, planned: 0, added: 0, total: 97 },
    ...overrides,
  };
}

describe("getSeverity", () => {
  it("is red when a source is failing, even alongside planned sources", () => {
    expect(
      getSeverity(
        status({ coverage: { succeeded: 90, failed: 1, planned: 6, added: 0, total: 97 } }),
      ),
    ).toBe("red");
  });

  it("is red when a run was rejected, even with zero failures", () => {
    expect(
      getSeverity(status({ rejected: { reason: "volume-guard", detail: "212 items added" } })),
    ).toBe("red");
  });

  it("is orange when nothing is failing but a source is planned", () => {
    expect(
      getSeverity(
        status({ coverage: { succeeded: 90, failed: 0, planned: 7, added: 0, total: 97 } }),
      ),
    ).toBe("orange");
  });

  it("is orange when the collection is stale, even with full coverage", () => {
    expect(getSeverity(status({ stale: true }))).toBe("orange");
  });

  it("is green when nothing is failing or planned and it isn't stale", () => {
    expect(getSeverity(status())).toBe("green");
  });
});

describe("getAlertTitle", () => {
  it("leads with the rejection reason, not generic staleness, when a run was rejected", () => {
    const rejectedStatus = status({
      stale: true,
      rejected: { reason: "volume-guard", detail: "212 items added, exceeds threshold of 200" },
    });
    expect(getAlertTitle(rejectedStatus, "red")).toBe(
      "Collection rejected — Change guard: 212 items added, exceeds threshold of 200",
    );
  });

  it("reports the failing source count", () => {
    const failingStatus = status({
      coverage: { succeeded: 90, failed: 3, planned: 0, added: 0, total: 97 },
    });
    expect(getAlertTitle(failingStatus, "red")).toBe("3 sources failing");
  });

  it("reports planned and staleness together", () => {
    const orangeStatus = status({
      stale: true,
      coverage: { succeeded: 90, failed: 0, planned: 1, added: 0, total: 97 },
    });
    expect(getAlertTitle(orangeStatus, "orange")).toBe("1 source planned, collection is stale");
  });

  it("reports success compactly", () => {
    expect(getAlertTitle(status(), "green")).toBe("All sources collecting successfully");
  });
});

describe("formatRejection", () => {
  it("labels a cursor regression as a change guard", () => {
    expect(formatRejection({ reason: "cursor-regression", detail: "regressed" })).toBe(
      "Change guard: regressed",
    );
  });

  it("labels a validation failure distinctly", () => {
    expect(formatRejection({ reason: "validation-failed", detail: "duplicate id" })).toBe(
      "Validation: duplicate id",
    );
  });
});

describe("findDeepLinkTarget", () => {
  const categories: CategorySources[] = [
    {
      category: "web-core",
      coverage: { active: 5, failing: 0, planned: 1, total: 6 },
      monitored: [
        {
          id: "planned-source",
          name: "Planned Source",
          url: "https://example.com",
          kind: "feed",
          status: "planned",
          tags: [],
        },
      ],
      referenceOnly: [],
    },
    {
      category: "ai-engineering",
      coverage: { active: 4, failing: 1, planned: 0, total: 5 },
      monitored: [
        {
          id: "failing-source",
          name: "Failing Source",
          url: "https://example.com",
          kind: "feed",
          status: "failing",
          tags: [],
        },
      ],
      referenceOnly: [],
    },
  ];

  it("points at the first failing source for red severity", () => {
    expect(findDeepLinkTarget(status(), categories, "red")).toEqual({
      category: "ai-engineering",
      sourceId: "failing-source",
    });
  });

  it("points at the first planned source for orange severity", () => {
    expect(findDeepLinkTarget(status(), categories, "orange")).toEqual({
      category: "web-core",
      sourceId: "planned-source",
    });
  });

  it("falls through to a plain link for a rejected run", () => {
    expect(
      findDeepLinkTarget(
        status({ rejected: { reason: "volume-guard", detail: "x" } }),
        categories,
        "red",
      ),
    ).toEqual({});
  });

  it("falls through to a plain link when orange is caused by staleness alone", () => {
    const noPlanned: CategorySources[] = [
      { ...categories[0], coverage: { ...categories[0].coverage, planned: 0 }, monitored: [] },
    ];
    expect(findDeepLinkTarget(status({ stale: true }), noPlanned, "orange")).toEqual({});
  });

  it("returns a plain link for green severity", () => {
    expect(findDeepLinkTarget(status(), categories, "green")).toEqual({});
  });
});
