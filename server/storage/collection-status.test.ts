import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CollectionStatusFile } from "../../shared/schemas/index.js";
import { collectionCursorsFilePath } from "./collection-cursors.js";
import { readCollectionStatus, writeCollectionStatus } from "./collection-status.js";
import { newsFilePath } from "./news.js";
import { newsStatesFilePath } from "./news-states.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-storage-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const status: CollectionStatusFile = {
  schemaVersion: 1,
  lastRunAt: "2026-01-01T00:00:00Z",
  coverage: { succeeded: 1, failed: 0, planned: 0, added: 1, total: 1 },
  sources: { "react-blog": { status: "active", lastSuccessAt: "2026-01-01T00:00:00Z" } },
};

describe("collection-status.json storage", () => {
  it("round-trips a status file", async () => {
    await writeCollectionStatus(dir, status);
    await expect(readCollectionStatus(dir)).resolves.toEqual(status);
  });

  it("writes independently of the other three data files", async () => {
    await writeCollectionStatus(dir, status);

    await expect(access(newsFilePath(dir))).rejects.toThrow();
    await expect(access(newsStatesFilePath(dir))).rejects.toThrow();
    await expect(access(collectionCursorsFilePath(dir))).rejects.toThrow();
  });
});
