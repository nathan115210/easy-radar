import { describe, expect, it } from "vitest";
import { NewsLabelSchema } from "./news-label.js";

describe("NewsLabelSchema", () => {
  it("accepts a documented label", () => {
    expect(NewsLabelSchema.parse("Breaking Change")).toBe("Breaking Change");
  });

  it("rejects an unknown label", () => {
    expect(() => NewsLabelSchema.parse("Rumor")).toThrow();
  });
});
