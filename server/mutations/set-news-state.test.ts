import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NewsItem, NewsStatesFile } from "../../shared/schemas/index.js";
import { ensureDataFiles } from "../storage/init.js";
import { readNews, writeNews } from "../storage/news.js";
import { readNewsStates, syncNewsStatesWithItems } from "../storage/news-states.js";
import { setNewsState } from "./set-news-state.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-set-state-"));
  await ensureDataFiles(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const now = new Date("2026-06-01T00:00:00Z");

const item: NewsItem = {
  id: "abc123",
  sourceId: "s",
  heading: "An item",
  label: "Release",
  link: "https://example.com/abc123",
  date: "2026-01-01",
  dateBasis: "published",
  category: "web-core",
  tags: [],
};

describe("setNewsState", () => {
  it("returns found: false for an unknown item id", async () => {
    const outcome = await setNewsState(dir, "does-not-exist", "read", now);
    expect(outcome).toEqual({ found: false });
  });

  it("marks an item read, setting readAt", async () => {
    await writeNews(dir, [item]);
    await setNewsState(dir, item.id, "read", now);

    const states = await readNewsStates(dir);
    expect(states.items[item.id]).toEqual({
      state: "read",
      updatedAt: now.toISOString(),
      readAt: now.toISOString(),
    });
  });

  it("marks an item unread without touching news.json", async () => {
    await writeNews(dir, [item]);
    await setNewsState(dir, item.id, "unread", now);

    const states = await readNewsStates(dir);
    expect(states.items[item.id]).toEqual({ state: "unread", updatedAt: now.toISOString() });
    await expect(readNews(dir)).resolves.toEqual([item]);
  });

  it("state changes survive being read back (a page reload)", async () => {
    await writeNews(dir, [item]);
    await setNewsState(dir, item.id, "read", now);

    // Simulate a fresh read, as a reloaded page or a later request would do.
    const statesAfterReload = await readNewsStates(dir);
    expect(statesAfterReload.items[item.id]?.state).toBe("read");
  });

  describe("marking ignored", () => {
    it("removes the item from active news.json", async () => {
      await writeNews(dir, [item]);
      await setNewsState(dir, item.id, "ignored", now);

      await expect(readNews(dir)).resolves.toEqual([]);
    });

    it("writes a state entry with ignoredAt as the tombstone timestamp", async () => {
      await writeNews(dir, [item]);
      await setNewsState(dir, item.id, "ignored", now);

      const states = await readNewsStates(dir);
      expect(states.items[item.id]).toEqual({
        state: "ignored",
        updatedAt: now.toISOString(),
        ignoredAt: now.toISOString(),
      });
    });

    it("leaves other active items untouched", async () => {
      const other: NewsItem = { ...item, id: "other456", link: "https://example.com/other456" };
      await writeNews(dir, [item, other]);
      await setNewsState(dir, item.id, "ignored", now);

      await expect(readNews(dir)).resolves.toEqual([other]);
    });
  });

  it("preserves an existing readAt when transitioning back to unread and later back to read", async () => {
    await writeNews(dir, [item]);
    const firstRead = new Date("2026-06-01T00:00:00Z");
    await setNewsState(dir, item.id, "read", firstRead);

    const backToUnread = new Date("2026-06-02T00:00:00Z");
    await setNewsState(dir, item.id, "unread", backToUnread);
    const afterUnread = (await readNewsStates(dir)).items[item.id];
    expect(afterUnread).toMatchObject({ state: "unread", readAt: firstRead.toISOString() });

    const secondRead = new Date("2026-06-03T00:00:00Z");
    await setNewsState(dir, item.id, "read", secondRead);
    const afterSecondRead = (await readNewsStates(dir)).items[item.id];
    expect(afterSecondRead).toMatchObject({ state: "read", readAt: secondRead.toISOString() });
  });

  it("survives a subsequent collector run finding the same item again", async () => {
    await writeNews(dir, [item]);
    await setNewsState(dir, item.id, "read", now);

    // A later collection run re-discovers the same item (same deterministic
    // id) and syncs state the way #6/#12's pipeline does — this must not
    // clobber the user's "read" mark with a fresh "unread" entry.
    const statesBeforeSync = await readNewsStates(dir);
    const synced = syncNewsStatesWithItems(
      statesBeforeSync,
      [item],
      new Date("2026-06-02T00:00:00Z"),
    );

    expect(synced.items[item.id]).toEqual(statesBeforeSync.items[item.id]);
    expect(synced.items[item.id]?.state).toBe("read");
  });

  it("writes atomically through the storage layer (round-trips a valid file)", async () => {
    await writeNews(dir, [item]);
    await setNewsState(dir, item.id, "read", now);

    const states: NewsStatesFile = await readNewsStates(dir);
    expect(states.schemaVersion).toBe(1);
  });
});
