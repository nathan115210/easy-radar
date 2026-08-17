import { describe, expect, it } from "vitest";
import { loadFixture } from "../fixtures/load-fixture.js";

describe("loadFixture", () => {
  it("reads a saved fixture file by path relative to tests/fixtures/", () => {
    const content = loadFixture("example/sample.txt");

    expect(content.trim()).toBe("example fixture content");
  });
});
