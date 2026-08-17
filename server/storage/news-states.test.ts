import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NewsItem, NewsStatesFile } from "../../shared/schemas/index.js";
import { readNewsStates, syncNewsStatesWithItems, writeNewsStates } from "./news-states.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-storage-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("news-states.json storage", () => {
  it("round-trips a states file", async () => {
    const file: NewsStatesFile = {
      schemaVersion: 1,
      items: { abc123: { state: "read", updatedAt: "2026-01-01T00:00:00Z" } },
    };
    await writeNewsStates(dir, file);
    await expect(readNewsStates(dir)).resolves.toEqual(file);
  });
});

describe("syncNewsStatesWithItems", () => {
  const now = new Date("2026-02-01T00:00:00Z");

  const items: NewsItem[] = [
    {
      id: "existing-read",
      sourceId: "react-blog",
      heading: "Existing read item",
      label: "Release",
      link: "https://react.dev/existing-read",
      date: "2026-01-01",
      dateBasis: "published",
      category: "web-core",
      tags: [],
    },
    {
      id: "existing-ignored",
      sourceId: "react-blog",
      heading: "Existing ignored item",
      label: "Release",
      link: "https://react.dev/existing-ignored",
      date: "2026-01-01",
      dateBasis: "published",
      category: "web-core",
      tags: [],
    },
    {
      id: "brand-new",
      sourceId: "react-blog",
      heading: "Brand new item",
      label: "Release",
      link: "https://react.dev/brand-new",
      date: "2026-02-01",
      dateBasis: "published",
      category: "web-core",
      tags: [],
    },
  ];

  it("preserves existing read/ignored states and adds unread entries only for new item ids", () => {
    const before: NewsStatesFile = {
      schemaVersion: 1,
      items: {
        "existing-read": {
          state: "read",
          updatedAt: "2026-01-05T00:00:00Z",
          readAt: "2026-01-05T00:00:00Z",
        },
        "existing-ignored": {
          state: "ignored",
          updatedAt: "2026-01-06T00:00:00Z",
          ignoredAt: "2026-01-06T00:00:00Z",
        },
      },
    };

    const after = syncNewsStatesWithItems(before, items, now);

    // Existing states survive the collection run untouched.
    expect(after.items["existing-read"]).toEqual(before.items["existing-read"]);
    expect(after.items["existing-ignored"]).toEqual(before.items["existing-ignored"]);

    // The new item gets a fresh unread entry.
    expect(after.items["brand-new"]).toEqual({ state: "unread", updatedAt: now.toISOString() });
  });

  it("is a pure function that does not mutate its input", () => {
    const before: NewsStatesFile = { schemaVersion: 1, items: {} };
    syncNewsStatesWithItems(before, items, now);
    expect(before.items).toEqual({});
  });
});
