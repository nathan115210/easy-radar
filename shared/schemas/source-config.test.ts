import { describe, expect, it } from "vitest";
import { SourceConfigSchema } from "./source-config.js";

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

describe("SourceConfigSchema", () => {
  it("accepts a valid source config", () => {
    expect(SourceConfigSchema.parse(validSource)).toEqual(validSource);
  });

  it("accepts an optional releasePolicy with includeDraft locked to false", () => {
    const withPolicy = {
      ...validSource,
      kind: "github-release",
      releasePolicy: { includePrerelease: false, includeDraft: false },
    };
    expect(SourceConfigSchema.parse(withPolicy)).toEqual(withPolicy);
  });

  it("rejects includeDraft: true", () => {
    const invalid = {
      ...validSource,
      releasePolicy: { includePrerelease: false, includeDraft: true },
    };
    expect(() => SourceConfigSchema.parse(invalid)).toThrow();
  });

  it("rejects an unsupported kind", () => {
    expect(() => SourceConfigSchema.parse({ ...validSource, kind: "rumor" })).toThrow();
  });

  it("rejects a missing url", () => {
    const { url: _url, ...withoutUrl } = validSource;
    expect(() => SourceConfigSchema.parse(withoutUrl)).toThrow();
  });
});
