import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NewsItem, NewsStatesFile } from "../../shared/schemas/index.js";
import { writeNews } from "../../server/storage/news.js";
import { writeNewsStates } from "../../server/storage/news-states.js";
import { validateData } from "./validate-data.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-validate-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const now = new Date("2026-06-01T00:00:00Z");
const validId = "0123456789abcdef";

function item(id: string): NewsItem {
  return {
    id,
    sourceId: "s",
    heading: `Item ${id}`,
    label: "Release",
    link: `https://example.com/${id}`,
    date: "2026-01-01",
    dateBasis: "published",
    category: "web-core",
    tags: [],
  };
}

describe("validateData", () => {
  it("passes for a consistent news.json / news-states.json pair", async () => {
    await writeNews(dir, [item(validId)]);
    const states: NewsStatesFile = {
      schemaVersion: 1,
      items: { [validId]: { state: "unread", updatedAt: now.toISOString() } },
    };
    await writeNewsStates(dir, states);

    expect(await validateData(dir, now)).toEqual([]);
  });

  it("catches a duplicate active item across the two invariant checks combined", async () => {
    await writeNews(dir, [item(validId), item(validId)]);
    await writeNewsStates(dir, {
      schemaVersion: 1,
      items: { [validId]: { state: "unread", updatedAt: now.toISOString() } },
    });

    const issues = await validateData(dir, now);
    expect(issues.some((issue) => issue.check === "news-duplicate-id")).toBe(true);
  });

  it("catches a desynchronized state file (state entry with no matching item)", async () => {
    await writeNews(dir, []);
    await writeNewsStates(dir, {
      schemaVersion: 1,
      items: { orphan: { state: "read", updatedAt: now.toISOString() } },
    });

    const issues = await validateData(dir, now);
    expect(issues.some((issue) => issue.check === "state-orphaned-entry")).toBe(true);
  });
});
