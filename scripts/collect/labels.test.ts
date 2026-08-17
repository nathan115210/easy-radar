import { describe, expect, it } from "vitest";
import type { NewsLabel } from "../../shared/schemas/index.js";
import { deriveLabel, type CollectionEventType } from "./labels.js";

describe("deriveLabel", () => {
  const cases: Array<[CollectionEventType, NewsLabel]> = [
    ["feed-entry", "Engineering Article"],
    ["github-stable-release", "Release"],
    ["github-security-advisory", "Security Advisory"],
    ["rfc-proposal-opened", "RFC/Proposal"],
    ["tc39-proposal-created", "RFC/Proposal"],
    ["tc39-stage-transition", "Improvement"],
    ["tc39-withdrawal", "Retired"],
    ["announcement", "Announcement"],
  ];

  it.each(cases)("maps event type %s to label %s", (eventType, expectedLabel) => {
    expect(deriveLabel(eventType)).toBe(expectedLabel);
  });

  it("a GitHub stable release always maps to Release, per PRD §11.5", () => {
    expect(deriveLabel("github-stable-release")).toBe("Release");
  });

  it("a TC39 withdrawal always maps to Retired, per PRD §11.6", () => {
    expect(deriveLabel("tc39-withdrawal")).toBe("Retired");
  });

  it("a new proposal PR always maps to RFC/Proposal, per PRD §11.6", () => {
    expect(deriveLabel("rfc-proposal-opened")).toBe("RFC/Proposal");
  });
});
