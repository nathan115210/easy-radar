import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { NewsItem, ReferenceSource, SourceConfig } from "../shared/schemas/index.js";
import { ensureDataFiles } from "./storage/init.js";
import { writeNews } from "./storage/news.js";
import { writeNewsStates } from "./storage/news-states.js";
import { writeCollectionStatus } from "./storage/collection-status.js";
import { createApp } from "./app.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-server-"));
  await ensureDataFiles(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function newsItem(id: string, date: string, category: NewsItem["category"] = "web-core"): NewsItem {
  return {
    id,
    sourceId: "s",
    heading: `Item ${id}`,
    label: "Release",
    link: `https://example.com/${id}`,
    date,
    dateBasis: "published",
    category,
    tags: ["react"],
  };
}

describe("GET /api/news", () => {
  it("returns items for the requested category, newest first, with state counts", async () => {
    await writeNews(dir, [
      newsItem("a", "2026-01-01"),
      newsItem("b", "2026-01-03"),
      newsItem("c", "2026-01-02"),
    ]);
    await writeNewsStates(dir, {
      schemaVersion: 1,
      items: {
        a: { state: "read", updatedAt: "2026-01-01T00:00:00Z" },
        b: { state: "unread", updatedAt: "2026-01-03T00:00:00Z" },
        c: { state: "unread", updatedAt: "2026-01-02T00:00:00Z" },
      },
    });

    const app = createApp({ dataDir: dir });
    const res = await request(app).get("/api/news").query({ category: "web-core" });

    expect(res.status).toBe(200);
    expect(res.body.items.map((item: NewsItem) => item.id)).toEqual(["b", "c", "a"]);
    expect(res.body.counts).toEqual({ all: 3, unread: 2, read: 1 });
    expect(res.body.pageSize).toBe(50);
  });

  it("filters by state", async () => {
    await writeNews(dir, [newsItem("a", "2026-01-01"), newsItem("b", "2026-01-02")]);
    await writeNewsStates(dir, {
      schemaVersion: 1,
      items: {
        a: { state: "read", updatedAt: "2026-01-01T00:00:00Z" },
        b: { state: "unread", updatedAt: "2026-01-02T00:00:00Z" },
      },
    });

    const app = createApp({ dataDir: dir });
    const res = await request(app).get("/api/news").query({ category: "web-core", state: "read" });

    expect(res.body.items.map((item: NewsItem) => item.id)).toEqual(["a"]);
  });

  it("only returns items from the requested category", async () => {
    await writeNews(dir, [
      newsItem("a", "2026-01-01", "web-core"),
      newsItem("b", "2026-01-01", "devops-cloud"),
    ]);
    await writeNewsStates(dir, {
      schemaVersion: 1,
      items: {
        a: { state: "unread", updatedAt: "2026-01-01T00:00:00Z" },
        b: { state: "unread", updatedAt: "2026-01-01T00:00:00Z" },
      },
    });

    const app = createApp({ dataDir: dir });
    const res = await request(app).get("/api/news").query({ category: "devops-cloud" });

    expect(res.body.items.map((item: NewsItem) => item.id)).toEqual(["b"]);
  });

  it("paginates at 50 items per page with correct totals", async () => {
    const items = Array.from({ length: 120 }, (_, i) =>
      newsItem(String(i).padStart(3, "0"), "2026-01-01"),
    );
    await writeNews(dir, items);
    await writeNewsStates(dir, {
      schemaVersion: 1,
      items: Object.fromEntries(
        items.map((item) => [
          item.id,
          { state: "unread" as const, updatedAt: "2026-01-01T00:00:00Z" },
        ]),
      ),
    });

    const app = createApp({ dataDir: dir });

    const page1 = await request(app).get("/api/news").query({ category: "web-core", page: 1 });
    expect(page1.body.items).toHaveLength(50);
    expect(page1.body.totalPages).toBe(3);

    const page3 = await request(app).get("/api/news").query({ category: "web-core", page: 3 });
    expect(page3.body.items).toHaveLength(20);
  });

  it("returns 400 for an invalid category", async () => {
    const app = createApp({ dataDir: dir });
    const res = await request(app).get("/api/news").query({ category: "not-a-real-category" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when category is missing", async () => {
    const app = createApp({ dataDir: dir });
    const res = await request(app).get("/api/news");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/sources", () => {
  const source: SourceConfig = {
    id: "react-blog",
    name: "React Blog",
    category: "web-core",
    kind: "feed",
    url: "https://react.dev/rss.xml",
    adapter: "feed",
    initialSyncFrom: "2026-01-01",
    status: "active",
    tags: ["react"],
  };
  const referenceSource: ReferenceSource = {
    id: "mdn-docs",
    name: "MDN Web Docs",
    category: "web-core",
    url: "https://developer.mozilla.org/en-US/docs/Web",
  };

  it("reads the same source configuration used by the collector", async () => {
    const app = createApp({ dataDir: dir, sources: [source], referenceSources: [] });
    const res = await request(app).get("/api/sources");

    const webCore = res.body.categories.find(
      (c: { category: string }) => c.category === "web-core",
    );
    expect(webCore.monitored).toEqual([
      {
        id: "react-blog",
        name: "React Blog",
        url: "https://react.dev/rss.xml",
        kind: "feed",
        status: "active",
        tags: ["react"],
      },
    ]);
  });

  it("joins in runtime status from collection-status.json", async () => {
    await writeCollectionStatus(dir, {
      schemaVersion: 1,
      lastRunAt: "2026-01-01T00:00:00Z",
      coverage: { succeeded: 0, failed: 1, planned: 0, added: 0, total: 1 },
      sources: {
        "react-blog": {
          status: "failing",
          lastAttemptAt: "2026-01-01T00:00:00Z",
          failureClass: "runtime-failing",
          reason: "HTTP 503",
        },
      },
    });

    const app = createApp({ dataDir: dir, sources: [source], referenceSources: [] });
    const res = await request(app).get("/api/sources");

    const webCore = res.body.categories.find(
      (c: { category: string }) => c.category === "web-core",
    );
    expect(webCore.monitored[0]).toMatchObject({ status: "failing", failureReason: "HTTP 503" });
  });

  it("shows reference-only sources as Not collected and excludes them from coverage", async () => {
    const app = createApp({ dataDir: dir, sources: [source], referenceSources: [referenceSource] });
    const res = await request(app).get("/api/sources");

    const webCore = res.body.categories.find(
      (c: { category: string }) => c.category === "web-core",
    );
    expect(webCore.referenceOnly).toEqual([
      { id: "mdn-docs", name: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Web" },
    ]);
    // Coverage counts only the one monitored source, not the reference-only one.
    expect(webCore.coverage.total).toBe(1);
  });
});

describe("GET /api/collection-status", () => {
  it("returns coverage and marks a recent run as not stale", async () => {
    const now = new Date("2026-01-02T00:00:00Z");
    await writeCollectionStatus(dir, {
      schemaVersion: 1,
      lastRunAt: "2026-01-01T12:00:00Z",
      coverage: { succeeded: 94, failed: 3, planned: 0, added: 5, total: 97 },
      sources: {},
    });

    const app = createApp({ dataDir: dir, now: () => now });
    const res = await request(app).get("/api/collection-status");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      stale: false,
      coverage: { succeeded: 94, failed: 3, planned: 0, added: 5, total: 97 },
    });
  });

  it("marks a collection older than 36 hours as stale", async () => {
    const now = new Date("2026-01-05T00:00:00Z");
    await writeCollectionStatus(dir, {
      schemaVersion: 1,
      lastRunAt: "2026-01-01T00:00:00Z",
      coverage: { succeeded: 0, failed: 0, planned: 0, added: 0, total: 0 },
      sources: {},
    });

    const app = createApp({ dataDir: dir, now: () => now });
    const res = await request(app).get("/api/collection-status");

    expect(res.body.stale).toBe(true);
  });

  it("surfaces a change-guard rejection reason", async () => {
    await writeCollectionStatus(dir, {
      schemaVersion: 1,
      lastRunAt: "2026-01-01T00:00:00Z",
      coverage: { succeeded: 0, failed: 0, planned: 0, added: 0, total: 0 },
      sources: {},
      rejected: { reason: "volume-guard", detail: "212 items added, exceeds threshold of 200" },
    });

    const app = createApp({ dataDir: dir, now: () => new Date("2026-01-01T01:00:00Z") });
    const res = await request(app).get("/api/collection-status");

    expect(res.body.rejected).toEqual({
      reason: "volume-guard",
      detail: "212 items added, exceeds threshold of 200",
    });
  });
});
