import { describe, expect, it } from "vitest";
import { CategorySchema, NewsItemSchema } from "../../shared/schemas/index.js";

describe("shared schema entry point (imported from src/)", () => {
  it("exposes the same schemas as the individual modules", () => {
    expect(CategorySchema.parse("web-core")).toBe("web-core");
    expect(NewsItemSchema.safeParse({}).success).toBe(false);
  });
});
