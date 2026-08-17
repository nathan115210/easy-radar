import { readFileSync } from "node:fs";

const fixturesDir = new URL(".", import.meta.url);

/**
 * Reads a fixture file's raw text content from tests/fixtures/.
 * `relativePath` is resolved relative to tests/fixtures/, e.g. "feeds/example.atom.xml".
 */
export function loadFixture(relativePath: string): string {
  return readFileSync(new URL(relativePath, fixturesDir), "utf-8");
}
