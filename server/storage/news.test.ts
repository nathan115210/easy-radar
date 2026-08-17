import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { readNews, writeNews } from "./news.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-storage-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const item: NewsItem = {
  id: "abc123",
  sourceId: "react-blog",
  heading: "React 19 released",
  label: "Release",
  link: "https://react.dev/blog/2026/01/01/react-19",
  date: "2026-01-01",
  dateBasis: "published",
  category: "web-core",
  tags: ["react"],
};

describe("news.json storage", () => {
  it("round-trips an array of NewsItems", async () => {
    await writeNews(dir, [item]);
    await expect(readNews(dir)).resolves.toEqual([item]);
  });

  it("rejects a NewsItem that fails schema validation", async () => {
    const invalid = { ...item, link: "not-a-url" };
    await expect(writeNews(dir, [invalid as NewsItem])).rejects.toThrow();
  });
});
