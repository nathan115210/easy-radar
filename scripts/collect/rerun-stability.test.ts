import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { newsFilePath, writeNews } from "../../server/storage/news.js";
import { computeDeterministicId } from "./deterministic-id.js";
import { deriveLabel } from "./labels.js";
import { normalizeUrl } from "./normalize-url.js";
import { deriveTags } from "./tags.js";

type RawDiscoveredItem = {
  sourceId: string;
  url: string;
  heading: string;
  date: string;
  staticTags: string[];
  structuredTags: string[];
};

const rawItems: RawDiscoveredItem[] = [
  {
    sourceId: "react-blog",
    url: "https://www.react.dev/blog/react-19/?utm_source=newsletter",
    heading: "React 19",
    date: "2026-01-01",
    staticTags: ["react"],
    structuredTags: ["release"],
  },
  {
    sourceId: "typescript-blog",
    url: "https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/",
    heading: "Announcing TypeScript 6.0",
    date: "2026-01-05",
    staticTags: ["typescript"],
    structuredTags: [],
  },
];

/** Simulates one collection run's id/label/tag derivation over raw discoveries. */
function buildNewsItems(raw: readonly RawDiscoveredItem[]): NewsItem[] {
  return raw.map((item) => ({
    id: computeDeterministicId(normalizeUrl(item.url)),
    sourceId: item.sourceId,
    heading: item.heading,
    label: deriveLabel("feed-entry"),
    link: normalizeUrl(item.url),
    date: item.date,
    dateBasis: "published",
    category: "web-core",
    tags: deriveTags(item.staticTags, item.structuredTags),
  }));
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-rerun-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("re-running collection over unchanged sources", () => {
  it("produces a byte-identical news.json (zero data diff)", async () => {
    const firstRun = buildNewsItems(rawItems);
    await writeNews(dir, firstRun);
    const firstRunBytes = await readFile(newsFilePath(dir), "utf-8");

    // A second run over the exact same sources, from scratch.
    const secondRun = buildNewsItems(rawItems);
    await writeNews(dir, secondRun);
    const secondRunBytes = await readFile(newsFilePath(dir), "utf-8");

    expect(secondRunBytes).toBe(firstRunBytes);
    expect(secondRun.map((item) => item.id)).toEqual(firstRun.map((item) => item.id));
  });

  it("is stable even when raw items are discovered in a different order", async () => {
    const forwardOrder = buildNewsItems(rawItems);
    const reverseOrder = buildNewsItems([...rawItems].reverse());

    const forwardIds = new Set(forwardOrder.map((item) => item.id));
    const reverseIds = new Set(reverseOrder.map((item) => item.id));
    expect(reverseIds).toEqual(forwardIds);
  });
});
