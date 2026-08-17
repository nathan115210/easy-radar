import { describe, expect, it } from "vitest";
import { createReactRfcAdapter } from "../../scripts/collect/adapters/react-rfc.js";
import { makeSource } from "../../scripts/collect/engine/test-fixtures.js";
import { loadFixture } from "../fixtures/load-fixture.js";

const pullsJson = loadFixture("react-rfc/pulls-sample.json");

const source = makeSource({
  id: "react-rfc",
  adapter: "react-rfc",
  kind: "github-event",
  url: "https://github.com/reactjs/rfcs",
  category: "web-core",
});

describe("createReactRfcAdapter", () => {
  it("maps every pull request to an RFC/Proposal item", async () => {
    const adapter = createReactRfcAdapter({
      exec: async () => ({ stdout: pullsJson, stderr: "" }),
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items).toHaveLength(2);
    expect(items.every((item) => item.label === "RFC/Proposal")).toBe(true);
    expect(items.every((item) => item.category === "web-core")).toBe(true);
    expect(items[0]).toMatchObject({
      sourceId: "react-rfc",
      heading: "Add Server Components RFC",
      link: "https://github.com/reactjs/rfcs/pull/42",
      date: "2026-02-01",
      dateBasis: "published",
    });
  });

  it("produces the same deterministic id for the same PR across reruns", async () => {
    const adapter = createReactRfcAdapter({
      exec: async () => ({ stdout: pullsJson, stderr: "" }),
    });

    const first = await adapter.collect({ source, signal: new AbortController().signal });
    const second = await adapter.collect({ source, signal: new AbortController().signal });

    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
  });
});
