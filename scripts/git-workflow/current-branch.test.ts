import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { assertOnBranch, getCurrentBranch } from "./current-branch.js";
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

describe("getCurrentBranch / assertOnBranch", () => {
  it("reports the checked-out branch", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    const dir = await cloneOnBranch(remote, "main");
    cleanup.push(dir);

    expect(await getCurrentBranch(dir)).toBe("main");
    await expect(assertOnBranch(dir, "main")).resolves.toBeUndefined();
  });

  it("refuses to proceed when the worktree isn't on the expected branch", async () => {
    const remote = await initBareRemote();
    await seedMainBranch(remote);
    await seedDataBranch(remote);
    const dir = await cloneOnBranch(remote, "main");
    cleanup.push(dir);

    await expect(assertOnBranch(dir, "data")).rejects.toThrow(GitWorkflowSafetyError);

    // The guard never mutates the worktree — it's still on "main".
    expect((await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"])).trim()).toBe("main");
  });
});
