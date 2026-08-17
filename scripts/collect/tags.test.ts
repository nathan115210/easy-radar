import { describe, expect, it } from "vitest";
import { deriveTags } from "./tags.js";

describe("deriveTags", () => {
  it("merges static and structured tags, sorted", () => {
    expect(deriveTags(["react", "release"], ["frontend"])).toEqual([
      "frontend",
      "react",
      "release",
    ]);
  });

  it("deduplicates overlapping tags", () => {
    expect(deriveTags(["react"], ["react", "frontend"])).toEqual(["frontend", "react"]);
  });

  it("works with static tags only", () => {
    expect(deriveTags(["react", "web-core"])).toEqual(["react", "web-core"]);
  });

  it("produces the same output regardless of input order", () => {
    expect(deriveTags(["b", "a"], ["c"])).toEqual(deriveTags(["a"], ["c", "b"]));
  });
});
