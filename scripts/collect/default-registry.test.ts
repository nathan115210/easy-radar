import { describe, expect, it } from "vitest";
import { createDefaultAdapterRegistry } from "./default-registry.js";

describe("createDefaultAdapterRegistry", () => {
  it("registers exactly the four implemented adapters, keyed by name", () => {
    const registry = createDefaultAdapterRegistry();

    expect([...registry.keys()].sort()).toEqual([
      "feed",
      "generic-html-json-ld",
      "github-release",
      "official-api",
    ]);
  });
});
