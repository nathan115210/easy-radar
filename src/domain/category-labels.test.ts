import { describe, expect, it } from "vitest";
import { CategorySchema } from "../../shared/schemas/index.js";
import { CATEGORIES, CATEGORY_LABELS } from "./category-labels.js";

describe("category-labels", () => {
  it("lists all seven categories from the schema, in schema order", () => {
    expect(CATEGORIES).toEqual(CategorySchema.options);
  });

  it("has exactly one label per category, matching PRD §5", () => {
    expect(CATEGORY_LABELS["web-core"]).toBe("Web Core & Frontend Ecosystem");
    expect(CATEGORY_LABELS["ai-engineering"]).toBe("AI Engineering & Developer Workflows");
    expect(CATEGORY_LABELS["mobile-development"]).toBe("Mobile Development");
    expect(CATEGORY_LABELS["software-architecture"]).toBe("Software Design & System Architecture");
    expect(CATEGORY_LABELS["devops-cloud"]).toBe("DevOps, Cloud & Infrastructure");
    expect(CATEGORY_LABELS["testing-quality"]).toBe("Testing & Release Quality");
    expect(CATEGORY_LABELS["developer-tooling"]).toBe(
      "Developer Tooling, Runtimes & Web Standards",
    );
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual([...CategorySchema.options].sort());
  });
});
