import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import {
  cloneOnBranch,
  git,
  initBareRemote,
  seedDataBranch,
  seedMainBranch,
} from "../git-workflow/test-helpers.js";
import { computeDeterministicId } from "../collect/deterministic-id.js";
import { createAdapterRegistry } from "../collect/engine/adapter.js";
import { makeSource } from "../collect/engine/test-fixtures.js";
import { normalizeUrl } from "../collect/normalize-url.js";
import { collectAndPush } from "./collect-and-push.js";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const noSleep = async (): Promise<void> => {};
const fixedNow = (): Date => new Date("2026-06-01T00:00:00Z");

function item(slug: string): NewsItem {
  const link = normalizeUrl(`https://example.com/${slug}`);
  return {
    id: computeDeterministicId(link),
    sourceId: "s",
    heading: `Item ${slug}`,
    label: "Release",
    link,
    date: "2026-06-01",
    dateBasis: "published",
    category: "web-core",
    tags: [],
  };
}

async function setupWorktree(): Promise<{ remote: string; worktreeDir: string }> {
  const remote = await initBareRemote();
  await seedMainBranch(remote);
  await seedDataBranch(remote, {
    "data/news.json": "[]\n",
    "data/news-states.json": '{"schemaVersion":1,"items":{}}\n',
    "data/collection-cursors.json": '{"schemaVersion":1,"cursors":{}}\n',
    "data/collection-status.json":
      '{"schemaVersion":1,"lastRunAt":"1970-01-01T00:00:00.000Z","coverage":{"succeeded":0,"failed":0,"planned":0,"added":0,"total":0},"sources":{}}\n',
  });
  const worktreeDir = await cloneOnBranch(remote, "data");
  cleanup.push(worktreeDir);
  return { remote, worktreeDir };
}

describe("collectAndPush", () => {
  it("collects and pushes newly discovered items to the data branch", async () => {
    const { remote, worktreeDir } = await setupWorktree();
    const source = makeSource({ id: "s", adapter: "good" });
    const registry = createAdapterRegistry([{ name: "good", collect: async () => [item("a")] }]);

    const result = await collectAndPush({
      sources: [source],
      registry,
      dataDir: path.join(worktreeDir, "data"),
      worktreeDir,
      sleep: noSleep,
      now: fixedNow,
    });

    expect(result).toMatchObject({ outcome: "pushed", committed: true, pushed: true });
    expect(result.summary).toContain("1 added");
    expect((await git(remote, ["rev-parse", "data"])).trim()).toBe(
      (await git(worktreeDir, ["rev-parse", "HEAD"])).trim(),
    );
  });

  it("commits again on a second run even with nothing new discovered, since collection-status.json legitimately changes every run", async () => {
    // (A true no-git-diff no-op is already covered at the git-workflow
    // layer by commitDataChanges/finishDataBranchWrite's own tests — a
    // real collection run's status file always reflects that run's own
    // coverage, so two runs are never byte-identical even at 0 added.)
    const { worktreeDir } = await setupWorktree();
    const source = makeSource({ id: "s", adapter: "good" });
    const registry = createAdapterRegistry([{ name: "good", collect: async () => [item("a")] }]);
    const options = {
      sources: [source],
      registry,
      dataDir: path.join(worktreeDir, "data"),
      worktreeDir,
      sleep: noSleep,
      now: fixedNow,
    };

    await collectAndPush(options);
    const headAfterFirst = (await git(worktreeDir, ["rev-parse", "HEAD"])).trim();

    const second = await collectAndPush(options);

    expect(second).toMatchObject({ outcome: "pushed", committed: true, pushed: true });
    expect(second.summary).toContain("0 added");
    expect((await git(worktreeDir, ["rev-parse", "HEAD"])).trim()).not.toBe(headAfterFirst);
  });

  it("reports config-invalid without touching git at all", async () => {
    const { remote, worktreeDir } = await setupWorktree();
    const source = makeSource({ id: "s", adapter: "does-not-exist" });
    const registry = createAdapterRegistry([]);
    const beforeTip = (await git(remote, ["rev-parse", "data"])).trim();

    const result = await collectAndPush({
      sources: [source],
      registry,
      dataDir: path.join(worktreeDir, "data"),
      worktreeDir,
      sleep: noSleep,
      now: fixedNow,
    });

    expect(result.outcome).toBe("config-invalid");
    expect((await git(remote, ["rev-parse", "data"])).trim()).toBe(beforeTip);
  });

  it("reports a guard rejection and leaves news.json byte-identical, never reaching git", async () => {
    const { remote, worktreeDir } = await setupWorktree();
    const source = makeSource({ id: "s", adapter: "prolific" });
    const registry = createAdapterRegistry([
      { name: "prolific", collect: async () => [item("a"), item("b"), item("c")] },
    ]);
    const beforeBytes = await readFile(path.join(worktreeDir, "data", "news.json"), "utf-8");
    const beforeTip = (await git(remote, ["rev-parse", "data"])).trim();

    const result = await collectAndPush({
      sources: [source],
      registry,
      dataDir: path.join(worktreeDir, "data"),
      worktreeDir,
      sleep: noSleep,
      now: fixedNow,
      volumeGuardThreshold: 2,
    });

    expect(result).toMatchObject({ outcome: "rejected", rejection: { reason: "volume-guard" } });
    const afterBytes = await readFile(path.join(worktreeDir, "data", "news.json"), "utf-8");
    expect(afterBytes).toBe(beforeBytes);
    expect((await git(remote, ["rev-parse", "data"])).trim()).toBe(beforeTip);
  });

  it("fails closed on a genuine conflict and leaves the local commit intact", async () => {
    const { remote, worktreeDir } = await setupWorktree();
    const other = await cloneOnBranch(remote, "data");
    cleanup.push(other);
    await writeFile(
      path.join(other, "data", "news.json"),
      JSON.stringify([item("from-other")], null, 2) + "\n",
      "utf-8",
    );
    await git(other, ["add", "-A", "--", "data"]);
    await git(other, ["commit", "-m", "concurrent write"]);
    await git(other, ["push", "origin", "data"]);

    const source = makeSource({ id: "s", adapter: "good" });
    const registry = createAdapterRegistry([{ name: "good", collect: async () => [item("a")] }]);

    // Force a conflict by hand-editing news.json on disk to the same line
    // a real merge would touch, bypassing the pipeline's own merge logic.
    await writeFile(
      path.join(worktreeDir, "data", "news.json"),
      JSON.stringify([item("conflicting")], null, 2) + "\n",
      "utf-8",
    );
    await git(worktreeDir, ["add", "-A", "--", "data"]);
    await git(worktreeDir, ["commit", "-m", "local edit"]);

    const localHeadBefore = (await git(worktreeDir, ["rev-parse", "HEAD"])).trim();

    const result = await collectAndPush({
      sources: [source],
      registry,
      dataDir: path.join(worktreeDir, "data"),
      worktreeDir,
      sleep: noSleep,
      now: fixedNow,
    });

    expect(result.outcome).toBe("diverged");
    // The rebase never succeeded, so local content (including the earlier
    // "local edit" commit) is exactly as it was, never overwritten by the
    // remote's conflicting content.
    const news = await readFile(path.join(worktreeDir, "data", "news.json"), "utf-8");
    expect(news).toContain("conflicting");
    expect(
      (await git(worktreeDir, ["log", "--oneline", `${localHeadBefore}..HEAD`])).trim(),
    ).not.toBe("");
  });
});
