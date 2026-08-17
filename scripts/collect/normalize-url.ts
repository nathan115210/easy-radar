const TRACKING_PARAM_PREFIXES = ["utm_"];
const TRACKING_PARAM_NAMES = new Set([
  "fbclid",
  "gclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
  "source",
]);

function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    TRACKING_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix)) ||
    TRACKING_PARAM_NAMES.has(lower)
  );
}

/**
 * Canonicalizes a URL for deduplication (PRD §11.4): lowercased
 * scheme/host, no "www." prefix, no default port, no fragment, tracking
 * params stripped, remaining query params sorted, no trailing slash.
 *
 * Only the scheme and host are case-normalized. Path and remaining query
 * values are left as-is — many real sources (GitHub owner/repo segments,
 * blog slugs) are case-sensitive, and lowercasing them would silently
 * change what URL is being pointed at rather than just its representation.
 *
 * Redirect resolution happens at fetch time (the collector calls this on
 * the final resolved URL) — this function does no network I/O.
 */
export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";

  const isDefaultPort =
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443");
  if (isDefaultPort) {
    url.port = "";
  }

  const remainingParams = [...url.searchParams.entries()]
    .filter(([name]) => !isTrackingParam(name))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = new URLSearchParams(remainingParams).toString();

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}
