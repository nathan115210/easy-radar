import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./normalize-url.js";

describe("normalizeUrl", () => {
  it("is stable for an already-canonical URL", () => {
    expect(normalizeUrl("https://react.dev/blog/2026/01/01/react-19")).toBe(
      "https://react.dev/blog/2026/01/01/react-19",
    );
  });

  it("lowercases the scheme and host", () => {
    expect(normalizeUrl("HTTPS://React.dev/blog/react-19")).toBe("https://react.dev/blog/react-19");
  });

  it("strips a www. host prefix", () => {
    expect(normalizeUrl("https://www.react.dev/blog/react-19")).toBe(
      "https://react.dev/blog/react-19",
    );
  });

  it("strips a trailing slash, but keeps the root path as /", () => {
    expect(normalizeUrl("https://react.dev/blog/react-19/")).toBe(
      "https://react.dev/blog/react-19",
    );
    expect(normalizeUrl("https://react.dev/")).toBe("https://react.dev/");
  });

  it("removes the fragment", () => {
    expect(normalizeUrl("https://react.dev/blog/react-19#section-2")).toBe(
      "https://react.dev/blog/react-19",
    );
  });

  it("strips a default port", () => {
    expect(normalizeUrl("https://react.dev:443/blog/react-19")).toBe(
      "https://react.dev/blog/react-19",
    );
  });

  it("strips utm_ and known tracking params but keeps the rest, sorted", () => {
    expect(
      normalizeUrl("https://react.dev/blog/react-19?utm_source=newsletter&ref=weekly&z=1&a=2"),
    ).toBe("https://react.dev/blog/react-19?a=2&z=1");
  });

  it("preserves path and query casing (case-sensitive on many real hosts)", () => {
    expect(normalizeUrl("https://github.com/Facebook/React/releases/tag/v19.0.0")).toBe(
      "https://github.com/Facebook/React/releases/tag/v19.0.0",
    );
  });

  it("treats equivalent variants as the same normalized URL", () => {
    const variants = [
      "https://www.react.dev/blog/react-19/?utm_source=newsletter#top",
      "HTTPS://react.dev:443/blog/react-19?utm_campaign=fall",
      "https://react.dev/blog/react-19",
    ];
    const normalized = variants.map(normalizeUrl);
    expect(new Set(normalized).size).toBe(1);
  });
});
