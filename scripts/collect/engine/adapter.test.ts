import { describe, expect, it } from "vitest";
import { createAdapterRegistry, type Adapter } from "./adapter.js";

const stubAdapter = (name: string): Adapter => ({
  name,
  collect: async () => [],
});

describe("createAdapterRegistry", () => {
  it("looks adapters up by name", () => {
    const feed = stubAdapter("feed");
    const registry = createAdapterRegistry([feed, stubAdapter("github-release")]);
    expect(registry.get("feed")).toBe(feed);
    expect(registry.has("unknown")).toBe(false);
  });

  it("throws on a duplicate adapter name", () => {
    expect(() => createAdapterRegistry([stubAdapter("feed"), stubAdapter("feed")])).toThrow(
      /duplicate adapter/i,
    );
  });
});
