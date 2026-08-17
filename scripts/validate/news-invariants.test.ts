import { describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { validateNewsInvariants } from "./news-invariants.js";

function item(id: string): NewsItem {
  return {
    id,
    sourceId: "s",
    heading: `Item ${id}`,
    label: "Release",
    link: `https://example.com/${id}`,
    date: "2026-01-01",
    dateBasis: "published",
    category: "web-core",
    tags: [],
  };
}

const VALID_ID_A = "0123456789abcdef";
const VALID_ID_B = "fedcba9876543210";

describe("validateNewsInvariants", () => {
  it("passes for well-formed, unique deterministic ids", () => {
    expect(validateNewsInvariants([item(VALID_ID_A), item(VALID_ID_B)])).toEqual([]);
  });

  it("flags a duplicate active item id, naming it", () => {
    const issues = validateNewsInvariants([item(VALID_ID_A), item(VALID_ID_A)]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ check: "news-duplicate-id" });
    expect(issues[0]!.message).toContain(VALID_ID_A);
  });

  it("flags an id that doesn't look like a deterministic hash", () => {
    const issues = validateNewsInvariants([item("not-a-hash")]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ check: "news-id-format" });
    expect(issues[0]!.message).toContain("not-a-hash");
  });

  it("flags an uppercase id (the real format is lowercase hex)", () => {
    const issues = validateNewsInvariants([item(VALID_ID_A.toUpperCase())]);
    expect(issues.some((issue) => issue.check === "news-id-format")).toBe(true);
  });
});
