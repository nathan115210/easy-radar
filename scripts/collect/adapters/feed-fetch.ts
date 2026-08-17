export type FeedFetchOptions = {
  etag?: string;
  lastModified?: string;
};

export type FeedFetchResult =
  | { notModified: true }
  | { notModified: false; body: string; etag?: string; lastModified?: string };

/**
 * Fetches a feed with conditional-request headers when a previous ETag or
 * Last-Modified value is available (PRD §9's "politeness"). A 304 response
 * is a legitimate success with nothing new — the caller must not treat it
 * as a runtime failure the way an HTTP error is treated.
 *
 * `Last-Modified` is used only as a caching hint here; it is never read
 * back out as a NewsItem's publication date (PRD §11.3).
 */
export async function fetchFeed(
  fetchImpl: typeof fetch,
  url: string,
  signal: AbortSignal,
  conditional?: FeedFetchOptions,
): Promise<FeedFetchResult> {
  const headers: Record<string, string> = {};
  if (conditional?.etag) {
    headers["If-None-Match"] = conditional.etag;
  }
  if (conditional?.lastModified) {
    headers["If-Modified-Since"] = conditional.lastModified;
  }

  const response = await fetchImpl(url, { signal, headers });

  if (response.status === 304) {
    return { notModified: true };
  }
  if (!response.ok) {
    throw new Error(`Feed request failed: HTTP ${response.status} for ${url}`);
  }

  const body = await response.text();
  return {
    notModified: false,
    body,
    etag: response.headers.get("etag") ?? undefined,
    lastModified: response.headers.get("last-modified") ?? undefined,
  };
}
