import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { GitExec } from "./git-exec.js";
import { defaultGitExec } from "./git-exec.js";
import { GitPushAbortedError } from "./errors.js";
import { pushWithRetry } from "./push-with-retry.js";
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

describe("pushWithRetry", () => {
  it("pushes directly when the remote hasn't moved", async () => {
    const { remote, a } = await setupTwoWorktrees();
    await writeFile(path.join(a, "data", "news.json"), '[{"id":"x"}]\n', "utf-8");
    await git(a, ["add", "-A", "--", "data"]);
    await git(a, ["commit", "-m", "x"]);

    await pushWithRetry(a);

    expect((await git(remote, ["rev-parse", "data"])).trim()).toBe(
      (await git(a, ["rev-parse", "HEAD"])).trim(),
    );
  });

  it("succeeds after one automatic rebase when the first push is rejected", async () => {
    const { remote, a, b } = await setupTwoWorktrees();

    // a commits locally first, but hasn't pushed yet.
    await writeFile(path.join(a, "data", "news-states.json"), '{"a":"read"}\n', "utf-8");
    await git(a, ["add", "-A", "--", "data"]);
    await git(a, ["commit", "-m", "a's edit"]);

    // b races ahead and lands on the remote first.
    await writeFile(path.join(b, "data", "news.json"), '[{"id":"from-b"}]\n', "utf-8");
    await git(b, ["add", "-A", "--", "data"]);
    await git(b, ["commit", "-m", "from b"]);
    await git(b, ["push", "origin", "data"]);

    await pushWithRetry(a);

    const remoteLog = await git(remote, ["log", "--pretty=%s", "data"]);
    expect(remoteLog).toContain("a's edit");
    expect(remoteLog).toContain("from b");
    expect((await git(remote, ["rev-parse", "data"])).trim()).toBe(
      (await git(a, ["rev-parse", "HEAD"])).trim(),
    );
  });

  it("aborts without force-pushing when a rejection survives the retry, leaving the local commit intact", async () => {
    const { a } = await setupTwoWorktrees();
    await writeFile(path.join(a, "data", "news.json"), '[{"id":"x"}]\n', "utf-8");
    await git(a, ["add", "-A", "--", "data"]);
    await git(a, ["commit", "-m", "will not push"]);
    const localHead = (await git(a, ["rev-parse", "HEAD"])).trim();

    const calls: string[][] = [];
    const alwaysRejectPush: GitExec = async (dir, args) => {
      calls.push([...args]);
      if (args[0] === "push") {
        const error = new Error("! [rejected] data -> data (fetch first)") as Error & {
          code: number;
        };
        error.code = 1;
        throw error;
      }
      return defaultGitExec(dir, args);
    };

    await expect(pushWithRetry(a, { exec: alwaysRejectPush })).rejects.toThrow(GitPushAbortedError);

    // Exactly two push attempts, never a force push.
    const pushCalls = calls.filter((call) => call[0] === "push");
    expect(pushCalls).toHaveLength(2);
    expect(calls.some((call) => call.includes("--force"))).toBe(false);

    // Local commit untouched.
    expect((await git(a, ["rev-parse", "HEAD"])).trim()).toBe(localHead);
  });
});
