import { describe, expect, it } from "vitest";
import { ReferenceSourceSchema } from "./reference-source.js";

const validReference = {
  id: "mdn-web-docs",
  name: "MDN Web Docs",
  category: "web-core",
  url: "https://developer.mozilla.org/en-US/docs/Web",
  note: "General reference documentation, not a chronological feed.",
};

describe("ReferenceSourceSchema", () => {
  it("accepts a valid reference source", () => {
    expect(ReferenceSourceSchema.parse(validReference)).toEqual(validReference);
  });

  it("accepts a reference source with no note", () => {
    const { note: _note, ...withoutNote } = validReference;
    expect(ReferenceSourceSchema.parse(withoutNote)).toEqual(withoutNote);
  });

  it("rejects a missing url", () => {
    const { url: _url, ...withoutUrl } = validReference;
    expect(() => ReferenceSourceSchema.parse(withoutUrl)).toThrow();
  });

  it("rejects an unknown category", () => {
    expect(() => ReferenceSourceSchema.parse({ ...validReference, category: "backend" })).toThrow();
  });
});
