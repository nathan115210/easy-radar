import { describe, expect, it } from "vitest";
import { validateNewsSearch } from "./news-search.js";

describe("validateNewsSearch", () => {
  it("defaults category to web-core, state to all, and page to 1 on a bare visit", () => {
    expect(validateNewsSearch({})).toEqual({ category: "web-core", state: "all", page: 1 });
  });

  it("round-trips explicit search params unchanged", () => {
    expect(validateNewsSearch({ category: "devops-cloud", state: "unread", page: "3" })).toEqual({
      category: "devops-cloud",
      state: "unread",
      page: 3,
    });
  });

  it("coerces a string page number from the URL into a number", () => {
    expect(validateNewsSearch({ page: "5" }).page).toBe(5);
  });

  it("rejects an unknown category rather than silently defaulting it", () => {
    expect(() => validateNewsSearch({ category: "not-a-real-category" })).toThrow();
  });

  it("rejects an unknown state value", () => {
    expect(() => validateNewsSearch({ state: "archived" })).toThrow();
  });
});
