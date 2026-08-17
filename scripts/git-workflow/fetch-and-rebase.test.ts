import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DataBranchDivergedError } from "./errors.js";
import { fetchAndRebase } from "./fetch-and-rebase.js";
import {
  cloneOnBranch,
  git,
  initBareRemote,
  seedDataBranch,
  seedMainBranch,
} from "./test-helpers.js";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function setupTwoWorktrees(): Promise<{ remote: string; a: string; b: string }> {
  const remote = await initBareRemote();
  await seedMainBranch(remote);
  await seedDataBranch(remote, { "data/news.json": "[]\n", "data/news-states.json": "{}\n" });
  const a = await cloneOnBranch(remote, "data");
  const b = await cloneOnBranch(remote, "data");
  cleanup.push(a, b);
  return { remote, a, b };
}

describe("fetchAndRebase", () => {
  it("fast-forwards a worktree with no local commits onto the new remote tip", async () => {
    const { a, b } = await setupTwoWorktrees();

    // b advances the remote independently.
    await writeFile(path.join(b, "data", "news.json"), '[{"id":"from-b"}]\n', "utf-8");
    await git(b, ["add", "-A", "--", "data"]);
    await git(b, ["commit", "-m", "from b"]);
    await git(b, ["push", "origin", "data"]);

    await fetchAndRebase(a);

    expect((await git(a, ["rev-parse", "HEAD"])).trim()).toBe(
      (await git(b, ["rev-parse", "HEAD"])).trim(),
    );
  });

  it("replays a non-conflicting local commit on top of the new remote tip", async () => {
    const { a, b } = await setupTwoWorktrees();

    await writeFile(path.join(a, "data", "news-states.json"), '{"a":"read"}\n', "utf-8");
    await git(a, ["add", "-A", "--", "data"]);
    await git(a, ["commit", "-m", "local state change"]);

    await writeFile(path.join(b, "data", "news.json"), '[{"id":"from-b"}]\n', "utf-8");
    await git(b, ["add", "-A", "--", "data"]);
    await git(b, ["commit", "-m", "from b"]);
    await git(b, ["push", "origin", "data"]);

    await fetchAndRebase(a);

    const log = await git(a, ["log", "--pretty=%s", "-3"]);
    expect(log).toContain("local state change");
    expect(log).toContain("from b");
    // The local commit was replayed on top: it's still the tip.
    expect((await git(a, ["log", "-1", "--pretty=%s"])).trim()).toBe("local state change");
  });

  it("fails closed on a genuine conflict, leaving the worktree clean with the local commit intact", async () => {
    const { a, b } = await setupTwoWorktrees();

    await writeFile(path.join(a, "data", "news-states.json"), '{"a":"read"}\n', "utf-8");
    await git(a, ["add", "-A", "--", "data"]);
    await git(a, ["commit", "-m", "a's edit"]);

    await writeFile(path.join(b, "data", "news-states.json"), '{"a":"ignored"}\n', "utf-8");
    await git(b, ["add", "-A", "--", "data"]);
    await git(b, ["commit", "-m", "b's edit"]);
    await git(b, ["push", "origin", "data"]);

    await expect(fetchAndRebase(a)).rejects.toThrow(DataBranchDivergedError);

    // No rebase left in progress, and the local commit is still there.
    const status = await git(a, ["status", "--porcelain=v1", "--branch"]);
    expect(status.split("\n")[0]).toContain("## data");
    expect((await git(a, ["log", "-1", "--pretty=%s"])).trim()).toBe("a's edit");
  });

  it("fails closed when the remote branch doesn't exist yet", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    const dir = await cloneOnBranch(remote, "main");
    cleanup.push(dir);
    await git(dir, ["checkout", "-b", "data"]);

    await expect(fetchAndRebase(dir)).rejects.toThrow(DataBranchDivergedError);
  });
});
