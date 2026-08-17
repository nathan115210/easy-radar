import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GitWorkflowSafetyError } from "./errors.js";
import { resetDataBranch } from "./reset-data-branch.js";
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

describe("resetDataBranch", () => {
  it("fully restores a previous data state", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    await seedDataBranch(remote, { "data/news.json": '[{"id":"good"}]\n' });
    const dir = await cloneOnBranch(remote, "data");
    cleanup.push(dir);

    const goodCommit = (await git(dir, ["rev-parse", "HEAD"])).trim();

    await writeFile(path.join(dir, "data", "news.json"), '[{"id":"bad-parse-run"}]\n', "utf-8");
    await git(dir, ["add", "-A", "--", "data"]);
    await git(dir, ["commit", "-m", "a bad automated write"]);

    await resetDataBranch(dir, goodCommit);

    const restored = await readFile(path.join(dir, "data", "news.json"), "utf-8");
    expect(restored).toBe('[{"id":"good"}]\n');
    expect((await git(dir, ["rev-parse", "HEAD"])).trim()).toBe(goodCommit);
  });

  it("refuses to run outside the data branch", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    const dir = await cloneOnBranch(remote, "main");
    cleanup.push(dir);

    await expect(resetDataBranch(dir, "HEAD")).rejects.toThrow(GitWorkflowSafetyError);
  });
});
