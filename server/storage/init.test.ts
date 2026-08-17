import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectionCursorsFilePath } from "./collection-cursors.js";
import { collectionStatusFilePath } from "./collection-status.js";
import { ensureDataFiles } from "./init.js";
import { newsFilePath } from "./news.js";
import { newsStatesFilePath } from "./news-states.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-storage-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("ensureDataFiles", () => {
  it("creates all four files with valid, empty contents", async () => {
    await ensureDataFiles(dir);

    await expect(readFile(newsFilePath(dir), "utf-8")).resolves.toContain("[]");
    await expect(readFile(newsStatesFilePath(dir), "utf-8")).resolves.toContain('"items": {}');
    await expect(readFile(collectionCursorsFilePath(dir), "utf-8")).resolves.toContain(
      '"cursors": {}',
    );
    await expect(readFile(collectionStatusFilePath(dir), "utf-8")).resolves.toContain(
      '"sources": {}',
    );
  });

  it("does not overwrite a file that already exists", async () => {
    await ensureDataFiles(dir);
    await writeFile(newsFilePath(dir), '[{"custom": true}]', "utf-8");

    await ensureDataFiles(dir);

    await expect(readFile(newsFilePath(dir), "utf-8")).resolves.toBe('[{"custom": true}]');
  });
});
