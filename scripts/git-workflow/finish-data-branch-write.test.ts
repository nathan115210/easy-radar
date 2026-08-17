import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DataBranchDivergedError } from "./errors.js";
import { finishDataBranchWrite } from "./finish-data-branch-write.js";
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

async function setupDataWorktree(): Promise<{ remote: string; dir: string }> {
  const remote = await initBareRemote();
  await seedMainBranch(remote);
  await seedDataBranch(remote, { "data/news.json": "[]\n", "data/news-states.json": "{}\n" });
  const dir = await cloneOnBranch(remote, "data");
  cleanup.push(dir);
  return { remote, dir };
}

describe("finishDataBranchWrite", () => {
  it("commits and pushes real changes", async () => {
    const { remote, dir } = await setupDataWorktree();
    await writeFile(path.join(dir, "data", "news.json"), '[{"id":"a"}]\n', "utf-8");

    const result = await finishDataBranchWrite(dir, "Finish reading");

    expect(result).toEqual({ committed: true, pushed: true });
    expect((await git(remote, ["rev-parse", "data"])).trim()).toBe(
      (await git(dir, ["rev-parse", "HEAD"])).trim(),
    );
  });

  it("is a genuine no-op — no commit, no push — when nothing changed", async () => {
    const { remote, dir } = await setupDataWorktree();
    const before = (await git(dir, ["rev-parse", "HEAD"])).trim();

    const first = await finishDataBranchWrite(dir, "attempt 1");
    const second = await finishDataBranchWrite(dir, "attempt 2");

    expect(first).toEqual({ committed: false, pushed: false });
    expect(second).toEqual({ committed: false, pushed: false });
    expect((await git(dir, ["rev-parse", "HEAD"])).trim()).toBe(before);
    expect((await git(remote, ["rev-parse", "data"])).trim()).toBe(before);
  });

  it("fails closed on a genuine conflict and leaves the local commit and files intact", async () => {
    const { remote, dir } = await setupDataWorktree();
    const other = await cloneOnBranch(remote, "data");
    cleanup.push(other);

    await writeFile(path.join(other, "data", "news-states.json"), '{"a":"ignored"}\n', "utf-8");
    await git(other, ["add", "-A", "--", "data"]);
    await git(other, ["commit", "-m", "other writer"]);
    await git(other, ["push", "origin", "data"]);

    await writeFile(path.join(dir, "data", "news-states.json"), '{"a":"read"}\n', "utf-8");

    await expect(finishDataBranchWrite(dir, "conflicting write")).rejects.toThrow(
      DataBranchDivergedError,
    );

    // The local commit this made before hitting the conflict is still there, unpushed.
    expect((await git(dir, ["log", "-1", "--pretty=%s"])).trim()).toBe("conflicting write");
    expect((await git(remote, ["rev-parse", "data"])).trim()).not.toBe(
      (await git(dir, ["rev-parse", "HEAD"])).trim(),
    );
  });
});
