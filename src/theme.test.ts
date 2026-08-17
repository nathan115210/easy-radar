import { describe, expect, it } from "vitest";
import { theme } from "./theme.js";

const DEFAULT_MANTINE_COLOR_NAMES = [
  "blue",
  "red",
  "green",
  "cyan",
  "grape",
  "indigo",
  "lime",
  "orange",
  "pink",
  "teal",
  "violet",
  "yellow",
  "gray",
];

describe("theme", () => {
  it("defines colors only for the five approved seeds, not any default Mantine palette", () => {
    const colorNames = Object.keys(theme.colors ?? {});
    expect(colorNames.sort()).toEqual(
      ["accent", "primary", "secondary-surface", "surface", "warning"].sort(),
    );
    for (const defaultName of DEFAULT_MANTINE_COLOR_NAMES) {
      expect(colorNames).not.toContain(defaultName);
    }
  });

  it("every generated ramp has exactly 10 shades", () => {
    for (const ramp of Object.values(theme.colors ?? {})) {
      expect(ramp).toHaveLength(10);
    }
  });

  it("uses a generated primary color, not a default Mantine one", () => {
    expect(theme.primaryColor).toBe("primary");
  });

  it("uses a local system font stack with no remote font reference", () => {
    expect(theme.fontFamily).not.toMatch(/https?:\/\//);
    expect(theme.fontFamily).not.toMatch(/googleapis|fonts\.google|cdn/i);
  });
});
