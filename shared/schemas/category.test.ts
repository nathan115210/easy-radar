import { describe, expect, it } from "vitest";
import { CategorySchema } from "./category.js";

describe("CategorySchema", () => {
  it("accepts every documented category", () => {
    for (const category of [
      "web-core",
      "ai-engineering",
      "mobile-development",
      "software-architecture",
      "devops-cloud",
      "testing-quality",
      "developer-tooling",
    ]) {
      expect(CategorySchema.parse(category)).toBe(category);
    }
  });

  it("rejects an unknown category", () => {
    expect(() => CategorySchema.parse("backend")).toThrow();
  });
});
