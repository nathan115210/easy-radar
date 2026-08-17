import { writeFile } from "node:fs/promises";
import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { commitDataChanges } from "./commit-data-changes.js";
import { GitWorkflowSafetyError } from "./errors.js";
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

async function setupDataWorktree(): Promise<string> {
  const remote = await initBareRemote();
  await seedMainBranch(remote);
  await seedDataBranch(remote);
  const dir = await cloneOnBranch(remote, "data");
  cleanup.push(dir);
  return dir;
}

describe("commitDataChanges", () => {
  it("commits changes under data/", async () => {
    const dir = await setupDataWorktree();
    await writeFile(path.join(dir, "data", "news.json"), '[{"id":"a"}]\n', "utf-8");

    const result = await commitDataChanges(dir, "test commit");

    expect(result).toEqual({ committed: true });
    expect((await git(dir, ["log", "-1", "--pretty=%s"])).trim()).toBe("test commit");
  });

  it("produces no commit when nothing under data/ changed", async () => {
    const dir = await setupDataWorktree();
    const before = (await git(dir, ["rev-parse", "HEAD"])).trim();

    const first = await commitDataChanges(dir, "no-op");
    const second = await commitDataChanges(dir, "no-op again");

    expect(first).toEqual({ committed: false });
    expect(second).toEqual({ committed: false });
    expect((await git(dir, ["rev-parse", "HEAD"])).trim()).toBe(before);
  });

  it("never stages anything outside data/", async () => {
    const dir = await setupDataWorktree();
    await writeFile(path.join(dir, "outside.txt"), "not part of the data branch\n", "utf-8");
    await writeFile(path.join(dir, "data", "news.json"), '[{"id":"a"}]\n', "utf-8");

    await commitDataChanges(dir, "only data changes");

    const status = await git(dir, ["status", "--porcelain"]);
    expect(status).toContain("?? outside.txt");

    const committedFiles = await git(dir, ["show", "--name-only", "--pretty=", "HEAD"]);
    expect(committedFiles).not.toContain("outside.txt");
  });

  it("refuses to run when the worktree isn't on the expected branch", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    const dir = await cloneOnBranch(remote, "main");
    cleanup.push(dir);

    await expect(commitDataChanges(dir, "should not happen")).rejects.toThrow(
      GitWorkflowSafetyError,
    );
  });
});
