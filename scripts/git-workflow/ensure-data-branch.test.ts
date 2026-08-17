import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { ensureDataBranch } from "./ensure-data-branch.js";
import { cloneMain, cloneOnBranch, git, initBareRemote, seedMainBranch } from "./test-helpers.js";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("ensureDataBranch", () => {
  it("creates the data branch from main with only the four empty data files, and leaves the caller's checkout on main", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    const repoDir = await cloneMain(remote);
    cleanup.push(repoDir);

    const result = await ensureDataBranch(repoDir);

    expect(result).toEqual({ created: true });
    expect((await git(repoDir, ["rev-parse", "--abbrev-ref", "HEAD"])).trim()).toBe("main");

    const dataCheckout = await cloneOnBranch(remote, "data");
    cleanup.push(dataCheckout);
    const files = (await git(dataCheckout, ["ls-tree", "-r", "--name-only", "HEAD"]))
      .trim()
      .split("\n")
      .sort();
    expect(files).toEqual([
      "data/collection-cursors.json",
      "data/collection-status.json",
      "data/news-states.json",
      "data/news.json",
    ]);
    expect((await git(dataCheckout, ["log", "-1", "--pretty=%s"])).trim()).toBe(
      "Initialize data branch",
    );
  });

  it("is a no-op when the data branch already exists", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    const repoDir = await cloneMain(remote);
    cleanup.push(repoDir);

    await ensureDataBranch(repoDir);
    const tipAfterFirst = (await git(repoDir, ["ls-remote", remote, "data"])).trim();

    const second = await ensureDataBranch(repoDir);

    expect(second).toEqual({ created: false });
    expect((await git(repoDir, ["ls-remote", remote, "data"])).trim()).toBe(tipAfterFirst);
  });

  it("removes its temporary worktree afterward", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    const repoDir = await cloneMain(remote);
    cleanup.push(repoDir);

    await ensureDataBranch(repoDir);

    const worktrees = await git(repoDir, ["worktree", "list", "--porcelain"]);
    expect(worktrees.trim().split("\n\n").filter(Boolean)).toHaveLength(1); // just the primary checkout
  });
});
