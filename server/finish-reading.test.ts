import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import {
  cloneOnBranch,
  git,
  initBareRemote,
  seedDataBranch,
  seedMainBranch,
} from "../scripts/git-workflow/test-helpers.js";
import { createApp } from "./app.js";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const VALID_NEWS = [
  {
    id: "a1b2c3d4e5f60789",
    sourceId: "s",
    heading: "Item A",
    label: "Release",
    link: "https://example.com/a",
    date: "2026-01-01",
    dateBasis: "published",
    category: "web-core",
    tags: [],
  },
];

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

async function writeValidPendingChange(worktreeDir: string): Promise<void> {
  await writeFile(
    path.join(worktreeDir, "data", "news.json"),
    JSON.stringify(VALID_NEWS, null, 2) + "\n",
    "utf-8",
  );
  await writeFile(
    path.join(worktreeDir, "data", "news-states.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        items: { a1b2c3d4e5f60789: { state: "read", updatedAt: "2026-01-01T00:00:00.000Z" } },
      },
      null,
      2,
    ) + "\n",
    "utf-8",
  );
}

describe("POST /api/finish-reading", () => {
  it("commits and pushes reading state to the data branch and reports inline", async () => {
    const { remote, worktreeDir } = await setupWorktree();
    await writeValidPendingChange(worktreeDir);
    const app = createApp({ dataDir: path.join(worktreeDir, "data"), worktreeDir });

    const res = await request(app).post("/api/finish-reading");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ committed: true, pushed: true, hasUncommittedChanges: false });
    expect((await git(remote, ["rev-parse", "data"])).trim()).toBe(
      (await git(worktreeDir, ["rev-parse", "HEAD"])).trim(),
    );
    expect((await git(worktreeDir, ["log", "-1", "--pretty=%s"])).trim()).toContain(
      "Finish reading",
    );
  });

  it("is a no-op that still reports success when there is nothing to commit", async () => {
    const { worktreeDir } = await setupWorktree();
    const app = createApp({ dataDir: path.join(worktreeDir, "data"), worktreeDir });

    const res = await request(app).post("/api/finish-reading");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ committed: false, pushed: false, hasUncommittedChanges: false });
  });

  it("never creates a pull request and always responds with JSON, never a redirect", async () => {
    const { worktreeDir } = await setupWorktree();
    await writeValidPendingChange(worktreeDir);
    const app = createApp({ dataDir: path.join(worktreeDir, "data"), worktreeDir });

    const res = await request(app).post("/api/finish-reading");

    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
  });

  it("leaves data/news-states.json intact and reports the error on a rebase conflict, without pretending success", async () => {
    const { worktreeDir } = await setupWorktree();
    const other = await cloneOnBranch(
      (await git(worktreeDir, ["remote", "get-url", "origin"])).trim(),
      "data",
    );
    cleanup.push(other);

    // A concurrent writer touches news-states.json on the remote first.
    await writeFile(
      path.join(other, "data", "news-states.json"),
      '{"schemaVersion":1,"items":{"a1b2c3d4e5f60789":{"state":"ignored","updatedAt":"2026-01-01T00:00:00.000Z","ignoredAt":"2026-01-01T00:00:00.000Z"}}}\n',
      "utf-8",
    );
    await git(other, ["add", "-A", "--", "data"]);
    await git(other, ["commit", "-m", "concurrent ignore"]);
    await git(other, ["push", "origin", "data"]);

    // This session edits the same file, on the same line, unaware of the race.
    await writeValidPendingChange(worktreeDir);
    const app = createApp({ dataDir: path.join(worktreeDir, "data"), worktreeDir });
    const before = await readFile(path.join(worktreeDir, "data", "news-states.json"), "utf-8");

    const res = await request(app).post("/api/finish-reading");

    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
    const after = await readFile(path.join(worktreeDir, "data", "news-states.json"), "utf-8");
    expect(after).toBe(before);
  });

  it("rejects invalid state/news data before touching git at all", async () => {
    const { remote, worktreeDir } = await setupWorktree();
    // news-states.json has no entry for the active item — a state-sync violation.
    await writeFile(
      path.join(worktreeDir, "data", "news.json"),
      JSON.stringify(VALID_NEWS, null, 2) + "\n",
      "utf-8",
    );
    const beforeRemoteTip = (await git(remote, ["rev-parse", "data"])).trim();
    const app = createApp({ dataDir: path.join(worktreeDir, "data"), worktreeDir });

    const res = await request(app).post("/api/finish-reading");

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("state-missing-for-item");
    expect((await git(remote, ["rev-parse", "data"])).trim()).toBe(beforeRemoteTip);
  });
});
