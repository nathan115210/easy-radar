import { describe, expect, it, vi } from "vitest";
import { fetchFeed } from "./feed-fetch.js";

describe("fetchFeed", () => {
  it("sends no conditional headers when none are supplied", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("<rss></rss>", { status: 200 }));
    await fetchFeed(fetchImpl, "https://example.com/feed.xml", new AbortController().signal);

    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init?.headers).toEqual({});
  });

  it("sends If-None-Match and If-Modified-Since when a previous etag/lastModified is supplied", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("<rss></rss>", { status: 200 }));
    await fetchFeed(fetchImpl, "https://example.com/feed.xml", new AbortController().signal, {
      etag: '"abc123"',
      lastModified: "Wed, 01 Jan 2026 00:00:00 GMT",
    });

    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init?.headers).toEqual({
      "If-None-Match": '"abc123"',
      "If-Modified-Since": "Wed, 01 Jan 2026 00:00:00 GMT",
    });
  });

  it("returns notModified: true on a 304, without reading a body", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 304 }));
    const result = await fetchFeed(
      fetchImpl,
      "https://example.com/feed.xml",
      new AbortController().signal,
    );
    expect(result).toEqual({ notModified: true });
  });

  it("returns the body plus new etag/lastModified on a 200", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("<rss></rss>", {
          status: 200,
          headers: { ETag: '"new-etag"', "Last-Modified": "Thu, 02 Jan 2026 00:00:00 GMT" },
        }),
    );
    const result = await fetchFeed(
      fetchImpl,
      "https://example.com/feed.xml",
      new AbortController().signal,
    );
    expect(result).toEqual({
      notModified: false,
      body: "<rss></rss>",
      etag: '"new-etag"',
      lastModified: "Thu, 02 Jan 2026 00:00:00 GMT",
    });
  });

  it("throws a useful error on a non-ok, non-304 response", async () => {
    const fetchImpl = vi.fn(async () => new Response("server error", { status: 500 }));
    await expect(
      fetchFeed(fetchImpl, "https://example.com/feed.xml", new AbortController().signal),
    ).rejects.toThrow(/HTTP 500/);
  });
});
