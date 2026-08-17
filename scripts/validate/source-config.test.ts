import { describe, expect, it } from "vitest";
import { validateSourceConfig } from "./source-config.js";

describe("validateSourceConfig", () => {
  it("returns no issues for the current (valid) config/sources", async () => {
    expect(await validateSourceConfig()).toEqual([]);
  });

  it("reports a config-invalid failure as a ValidationIssue instead of throwing", async () => {
    const brokenLoad = async (): Promise<never> => {
      throw new Error(
        'Duplicate source id "react-blog": declared in both "web-core" and "ai-engineering"',
      );
    };

    const issues = await validateSourceConfig(brokenLoad);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ check: "source-config" });
    expect(issues[0]!.message).toContain('Duplicate source id "react-blog"');
  });
});
