import { describe, expect, it } from "vitest";
import { combineAndValidate, getCoverageByCategory, referenceSources, sources } from "./index.js";

const validSource = {
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

const validReference = {
  id: "mdn-web-docs",
  name: "MDN Web Docs",
  category: "web-core",
  url: "https://developer.mozilla.org/en-US/docs/Web",
};

describe("combineAndValidate", () => {
  it("combines sources and reference sources across category modules", () => {
    const result = combineAndValidate([
      { category: "web-core", sources: [validSource], referenceSources: [validReference] },
      { category: "ai-engineering", sources: [], referenceSources: [] },
    ]);
    expect(result.sources).toEqual([validSource]);
    expect(result.referenceSources).toEqual([validReference]);
  });

  it("throws naming the source id on a duplicate id within the same category", () => {
    expect(() =>
      combineAndValidate([
        { category: "web-core", sources: [validSource, validSource], referenceSources: [] },
      ]),
    ).toThrow(/duplicate source id "react-blog"/i);
  });

  it("throws naming the source id on a duplicate id across categories", () => {
    const duplicateInOtherCategory = { ...validSource, category: "ai-engineering" };
    expect(() =>
      combineAndValidate([
        { category: "web-core", sources: [validSource], referenceSources: [] },
        { category: "ai-engineering", sources: [duplicateInOtherCategory], referenceSources: [] },
      ]),
    ).toThrow(/duplicate source id "react-blog"/i);
  });

  it("throws naming the offending source on an invalid category", () => {
    const invalidCategory = { ...validSource, category: "not-a-real-category" };
    expect(() =>
      combineAndValidate([
        { category: "web-core", sources: [invalidCategory], referenceSources: [] },
      ]),
    ).toThrow(/invalid source config.*react-blog/i);
  });

  it("throws naming the offending source on a missing url", () => {
    const { url: _url, ...withoutUrl } = validSource;
    expect(() =>
      combineAndValidate([{ category: "web-core", sources: [withoutUrl], referenceSources: [] }]),
    ).toThrow(/invalid source config.*react-blog/i);
  });

  it("throws when a source's category field doesn't match its declaring file", () => {
    const misfiled = { ...validSource, category: "ai-engineering" };
    expect(() =>
      combineAndValidate([{ category: "web-core", sources: [misfiled], referenceSources: [] }]),
    ).toThrow(/declares category "ai-engineering" but is listed in the "web-core" file/i);
  });

  it("throws naming the offending reference source on an invalid entry", () => {
    const { url: _url, ...invalidReference } = validReference;
    expect(() =>
      combineAndValidate([
        { category: "web-core", sources: [], referenceSources: [invalidReference] },
      ]),
    ).toThrow(/invalid reference source.*mdn-web-docs/i);
  });
});

describe("the real config/sources module", () => {
  it("loads without throwing and exposes typed arrays", () => {
    expect(Array.isArray(sources)).toBe(true);
    expect(Array.isArray(referenceSources)).toBe(true);
  });

  it("produces coverage for all seven categories, excluding reference-only sources", () => {
    const coverage = getCoverageByCategory();
    expect(coverage).toHaveLength(7);
    for (const entry of coverage) {
      expect(entry.total).toBe(entry.active + entry.failing + entry.planned);
    }
  });
});
