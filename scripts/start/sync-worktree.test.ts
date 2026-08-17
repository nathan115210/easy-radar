import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DataBranchDivergedError } from "../git-workflow/errors.js";
import {
  cloneMain,
  git,
  initBareRemote,
  seedDataBranch,
  seedMainBranch,
} from "../git-workflow/test-helpers.js";
import { syncWorktree } from "./sync-worktree.js";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("syncWorktree", () => {
  it("bootstraps a missing worktree from a fresh clone with no data branch yet", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    const repoDir = await cloneMain(remote);
    cleanup.push(repoDir);
    const worktreeDir = path.join(repoDir, "..", `data-worktree-${Date.now()}`);
    cleanup.push(worktreeDir);

    const result = await syncWorktree(worktreeDir, { repoDir });

    expect(result).toEqual({ outcome: "created" });
    expect((await git(worktreeDir, ["rev-parse", "--abbrev-ref", "HEAD"])).trim()).toBe("data");
    const files = (await git(worktreeDir, ["ls-tree", "-r", "--name-only", "HEAD"]))
      .trim()
      .split("\n")
      .sort();
    expect(files).toContain("data/news.json");
    // The main checkout is untouched.
    expect((await git(repoDir, ["rev-parse", "--abbrev-ref", "HEAD"])).trim()).toBe("main");
  });

  it("bootstraps a missing worktree when the data branch already exists remotely", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    await seedDataBranch(remote, { "data/news.json": '[{"id":"existing"}]\n' });
    const repoDir = await cloneMain(remote);
    cleanup.push(repoDir);
    const worktreeDir = path.join(repoDir, "..", `data-worktree-${Date.now()}`);
    cleanup.push(worktreeDir);

    const result = await syncWorktree(worktreeDir, { repoDir });

    expect(result).toEqual({ outcome: "created" });
    const content = await readFile(path.join(worktreeDir, "data", "news.json"), "utf-8");
    expect(content).toBe('[{"id":"existing"}]\n');
  });

  it("fast-forwards an existing worktree onto new remote commits", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    await seedDataBranch(remote, { "data/news.json": "[]\n" });
    const repoDir = await cloneMain(remote);
    cleanup.push(repoDir);
    const worktreeDir = path.join(repoDir, "..", `data-worktree-${Date.now()}`);
    cleanup.push(worktreeDir);
    await syncWorktree(worktreeDir, { repoDir });

    // A cloud run lands a new commit.
    const other = await cloneMain(remote);
    cleanup.push(other);
    await git(other, ["fetch", "origin", "data"]);
    await git(other, ["checkout", "-b", "data", "origin/data"]);
    await writeFile(path.join(other, "data", "news.json"), '[{"id":"from-cloud"}]\n', "utf-8");
    await git(other, ["add", "-A", "--", "data"]);
    await git(other, ["commit", "-m", "cloud run"]);
    await git(other, ["push", "origin", "data"]);

    const result = await syncWorktree(worktreeDir, { repoDir });

    expect(result).toEqual({ outcome: "synced" });
    const content = await readFile(path.join(worktreeDir, "data", "news.json"), "utf-8");
    expect(content).toBe('[{"id":"from-cloud"}]\n');
  });

  it("starts on local data without throwing when the network is unavailable", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    await seedDataBranch(remote, { "data/news.json": '[{"id":"local"}]\n' });
    const repoDir = await cloneMain(remote);
    cleanup.push(repoDir);
    const worktreeDir = path.join(repoDir, "..", `data-worktree-${Date.now()}`);
    cleanup.push(worktreeDir);
    await syncWorktree(worktreeDir, { repoDir });

    // Point the worktree's remote at a URL that doesn't exist, simulating "offline".
    await git(worktreeDir, ["remote", "set-url", "origin", "/nonexistent/path/does-not-exist"]);

    const result = await syncWorktree(worktreeDir, { repoDir });

    expect(result).toEqual({ outcome: "offline" });
    const content = await readFile(path.join(worktreeDir, "data", "news.json"), "utf-8");
    expect(content).toBe('[{"id":"local"}]\n');
  });

  it("fails closed instead of discarding uncommitted reading-state changes on a real divergence", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    await seedDataBranch(remote, { "data/news-states.json": '{"a":"unread"}\n' });
    const repoDir = await cloneMain(remote);
    cleanup.push(repoDir);
    const worktreeDir = path.join(repoDir, "..", `data-worktree-${Date.now()}`);
    cleanup.push(worktreeDir);
    await syncWorktree(worktreeDir, { repoDir });

    // The remote advances with a conflicting edit to the same file...
    const other = await cloneMain(remote);
    cleanup.push(other);
    await git(other, ["fetch", "origin", "data"]);
    await git(other, ["checkout", "-b", "data", "origin/data"]);
    await writeFile(path.join(other, "data", "news-states.json"), '{"a":"ignored"}\n', "utf-8");
    await git(other, ["add", "-A", "--", "data"]);
    await git(other, ["commit", "-m", "from cloud"]);
    await git(other, ["push", "origin", "data"]);

    // ...while this session has its own uncommitted edit to the same file.
    await writeFile(path.join(worktreeDir, "data", "news-states.json"), '{"a":"read"}\n', "utf-8");

    await expect(syncWorktree(worktreeDir, { repoDir })).rejects.toThrow(DataBranchDivergedError);

    const content = await readFile(path.join(worktreeDir, "data", "news-states.json"), "utf-8");
    expect(content).toBe('{"a":"read"}\n');
  });
});
