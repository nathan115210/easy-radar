import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { readCollectionStatus } from "../../server/storage/collection-status.js";
import { ensureDataFiles } from "../../server/storage/init.js";
import { newsFilePath, writeNews } from "../../server/storage/news.js";
import { writeNewsStates } from "../../server/storage/news-states.js";
import { computeDeterministicId } from "./deterministic-id.js";
import { createAdapterRegistry } from "./engine/adapter.js";
import { makeSource } from "./engine/test-fixtures.js";
import { normalizeUrl } from "./normalize-url.js";
import { runCollectPipeline } from "./pipeline.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-pipeline-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const noSleep = async (): Promise<void> => {};
const fixedNow = (): Date => new Date("2026-06-01T00:00:00Z");

function item(slug: string, date = "2026-06-01"): NewsItem {
  const link = normalizeUrl(`https://example.com/${slug}`);
  return {
    id: computeDeterministicId(link),
    sourceId: "s",
    heading: `Item ${slug}`,
    label: "Release",
    link,
    date,
    dateBasis: "published",
    category: "web-core",
    tags: [],
  };
}

describe("runCollectPipeline", () => {
  it("produces a stable, greppable summary line, and the item actually reaches news.json", async () => {
    const source = makeSource({ id: "s", adapter: "good" });
    const registry = createAdapterRegistry([{ name: "good", collect: async () => [item("a")] }]);

    const result = await runCollectPipeline({
      sources: [source],
      registry,
      dataDir: dir,
      sleep: noSleep,
      now: fixedNow,
    });

    expect(result.summary).toBe("Collection run: 1 succeeded, 0 failed, 0 planned, 1 added");
    await expect(readFile(newsFilePath(dir), "utf-8")).resolves.toContain(
      `"id": "${item("a").id}"`,
    );
  });

  it("a run with zero new discoveries writes no data diff", async () => {
    const source = makeSource({ id: "s", adapter: "good" });
    const registry = createAdapterRegistry([{ name: "good", collect: async () => [item("a")] }]);

    const first = await runCollectPipeline({
      sources: [source],
      registry,
      dataDir: dir,
      sleep: noSleep,
      now: fixedNow,
    });
    expect(first.summary).toContain("1 added");
    const firstBytes = await readFile(newsFilePath(dir), "utf-8");

    // Same source, same item, discovered again on a later run.
    const second = await runCollectPipeline({
      sources: [source],
      registry,
      dataDir: dir,
      sleep: noSleep,
      now: fixedNow,
    });
    expect(second.summary).toContain("0 added");
    const secondBytes = await readFile(newsFilePath(dir), "utf-8");

    expect(secondBytes).toBe(firstBytes);
  });

  it("aborts before any write and exits non-zero on a config-invalid run", async () => {
    const source = makeSource({ id: "s", adapter: "does-not-exist" });
    const registry = createAdapterRegistry([]);

    const result = await runCollectPipeline({
      sources: [source],
      registry,
      dataDir: dir,
      sleep: noSleep,
      now: fixedNow,
    });

    expect(result.exitCode).toBe(1);
    expect(result.wroteDataFiles).toBe(false);
    await expect(readdir(dir)).resolves.toEqual([]);
  });

  it("populates collection-status.json with per-source diagnostics, including a failed source", async () => {
    const goodSource = makeSource({ id: "good", adapter: "good" });
    const badSource = makeSource({ id: "bad", adapter: "bad" });
    const registry = createAdapterRegistry([
      { name: "good", collect: async () => [item("a")] },
      {
        name: "bad",
        collect: async () => {
          throw new Error("HTTP 503");
        },
      },
    ]);

    await runCollectPipeline({
      sources: [goodSource, badSource],
      registry,
      dataDir: dir,
      retries: 0,
      sleep: noSleep,
      now: fixedNow,
    });

    const status = await readCollectionStatus(dir);
    expect(status.sources.good).toMatchObject({ status: "active" });
    expect(status.sources.bad).toMatchObject({
      status: "failing",
      failureClass: "runtime-failing",
      reason: "HTTP 503",
    });
  });

  it("a guard-rejected run leaves news.json byte-identical and still publishes status", async () => {
    const source = makeSource({ id: "s", adapter: "prolific" });
    const registry = createAdapterRegistry([
      { name: "prolific", collect: async () => [item("a"), item("b"), item("c")] },
    ]);

    const beforeBytes = "[]\n"; // ensureDataFiles' initial empty content

    const result = await runCollectPipeline({
      sources: [source],
      registry,
      dataDir: dir,
      sleep: noSleep,
      now: fixedNow,
      volumeGuardThreshold: 2,
    });

    expect(result.wroteDataFiles).toBe(false);
    expect(result.rejection).toMatchObject({ reason: "volume-guard" });
    expect(result.summary).toContain("REJECTED: volume-guard");

    const afterBytes = await readFile(newsFilePath(dir), "utf-8");
    expect(afterBytes).toBe(beforeBytes);

    const status = await readCollectionStatus(dir);
    expect(status.rejected).toMatchObject({ reason: "volume-guard" });
  });

  it("still writes all discovered items when coverage is exactly at the volume guard threshold", async () => {
    const source = makeSource({ id: "s", adapter: "two-items" });
    const registry = createAdapterRegistry([
      { name: "two-items", collect: async () => [item("a"), item("b")] },
    ]);

    const result = await runCollectPipeline({
      sources: [source],
      registry,
      dataDir: dir,
      sleep: noSleep,
      now: fixedNow,
      volumeGuardThreshold: 2,
    });

    expect(result.wroteDataFiles).toBe(true);
    expect(result.rejection).toBeUndefined();
    expect(result.summary).toContain("2 added");

    const news = JSON.parse(await readFile(newsFilePath(dir), "utf-8")) as NewsItem[];
    expect(news.map((n) => n.id).sort()).toEqual([item("a").id, item("b").id].sort());
  });

  it("a data-invariant validation failure (pre-existing corrupt data) rejects the run with a specific reason", async () => {
    // Simulate corrupted on-disk state from before this run: news.json
    // already has a duplicate id (the pipeline's own merge can't produce
    // this, but existing data on disk could be corrupted some other way).
    await ensureDataFiles(dir);
    await writeNews(dir, [item("a"), item("a")]);
    await writeNewsStates(dir, {
      schemaVersion: 1,
      items: { [item("a").id]: { state: "unread", updatedAt: fixedNow().toISOString() } },
    });

    const source = makeSource({ id: "s", adapter: "quiet" });
    const registry = createAdapterRegistry([{ name: "quiet", collect: async () => [] }]);

    const result = await runCollectPipeline({
      sources: [source],
      registry,
      dataDir: dir,
      sleep: noSleep,
      now: fixedNow,
    });

    expect(result.wroteDataFiles).toBe(false);
    expect(result.rejection).toMatchObject({ reason: "validation-failed" });
    expect(result.rejection?.detail).toContain("news-duplicate-id");
    expect(result.rejection?.detail).toContain(item("a").id);

    const status = await readCollectionStatus(dir);
    expect(status.rejected).toMatchObject({ reason: "validation-failed" });
  });

  it("scrubs an item re-collected while its ignore tombstone is still live (PRD §10, #24)", async () => {
    const ignored = item("a");
    await ensureDataFiles(dir);
    await writeNewsStates(dir, {
      schemaVersion: 1,
      items: {
        [ignored.id]: {
          state: "ignored",
          updatedAt: fixedNow().toISOString(),
          ignoredAt: fixedNow().toISOString(),
        },
      },
    });

    // The source still serves it — simulating the 36h collection overlap.
    const source = makeSource({ id: "s", adapter: "good" });
    const registry = createAdapterRegistry([{ name: "good", collect: async () => [ignored] }]);

    const result = await runCollectPipeline({
      sources: [source],
      registry,
      dataDir: dir,
      sleep: noSleep,
      now: fixedNow,
    });

    expect(result.summary).toContain("1 re-added ignored item(s) scrubbed");
    const newsBytes = await readFile(newsFilePath(dir), "utf-8");
    expect(newsBytes).not.toContain(ignored.id);
  });
});
