import { describe, expect, it } from "vitest";
import { NewsItemSchema } from "./news-item.js";

const validItem = {
  id: "abc123",
  sourceId: "react-blog",
  heading: "React 19 released",
  label: "Release",
  link: "https://react.dev/blog/2026/01/01/react-19",
  date: "2026-01-01",
  dateBasis: "published",
  category: "web-core",
  tags: ["react", "release"],
};

describe("NewsItemSchema", () => {
  it("accepts a valid NewsItem", () => {
    expect(NewsItemSchema.parse(validItem)).toEqual(validItem);
  });

  it("rejects a non-YYYY-MM-DD date", () => {
    expect(() => NewsItemSchema.parse({ ...validItem, date: "01/01/2026" })).toThrow();
  });

  it("rejects a non-URL link", () => {
    expect(() => NewsItemSchema.parse({ ...validItem, link: "not-a-url" })).toThrow();
  });

  it("rejects an unknown category", () => {
    expect(() => NewsItemSchema.parse({ ...validItem, category: "backend" })).toThrow();
  });

  it("rejects a missing required field", () => {
    const { heading: _heading, ...withoutHeading } = validItem;
    expect(() => NewsItemSchema.parse(withoutHeading)).toThrow();
  });
});
