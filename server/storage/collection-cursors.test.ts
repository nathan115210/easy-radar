import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CollectionCursorsFile } from "../../shared/schemas/index.js";
import { readCollectionCursors, writeCollectionCursors } from "./collection-cursors.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-storage-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("collection-cursors.json storage", () => {
  it("round-trips a cursors file", async () => {
    const file: CollectionCursorsFile = {
      schemaVersion: 1,
      cursors: { "react-blog": { lastRunAt: "2026-01-01T00:00:00Z", lastItemDate: "2026-01-01" } },
    };
    await writeCollectionCursors(dir, file);
    await expect(readCollectionCursors(dir)).resolves.toEqual(file);
  });
});
