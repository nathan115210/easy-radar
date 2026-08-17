import { describe, expect, it } from "vitest";
import { createReactNativeProposalsAdapter } from "../../scripts/collect/adapters/react-native-proposals.js";
import { makeSource } from "../../scripts/collect/engine/test-fixtures.js";
import { loadFixture } from "../fixtures/load-fixture.js";

const pullsJson = loadFixture("react-native-proposals/pulls-sample.json");
const filesByPr: Record<number, string> = {
  13: loadFixture("react-native-proposals/files-pr-13.json"),
  12: loadFixture("react-native-proposals/files-pr-12.json"),
  11: loadFixture("react-native-proposals/files-pr-11.json"),
  10: loadFixture("react-native-proposals/files-pr-10.json"),
};

const source = makeSource({
  id: "react-native-proposals",
  adapter: "react-native-proposals",
  kind: "github-event",
  url: "https://github.com/react-native-community/discussions-and-proposals",
  category: "mobile-development",
});

function exec() {
  const calls: string[][] = [];
  const fn = async (args: readonly string[]) => {
    calls.push([...args]);
    const endpoint = args[1] ?? "";
    if (endpoint.endsWith("/pulls?state=all&per_page=100&sort=created&direction=desc")) {
      return { stdout: pullsJson, stderr: "" };
    }
    const match = /\/pulls\/(\d+)\/files$/.exec(endpoint);
    if (match) {
      const prNumber = Number(match[1]);
      return { stdout: filesByPr[prNumber] ?? "[]", stderr: "" };
    }
    throw new Error(`Unexpected endpoint in test: ${endpoint}`);
  };
  return { fn, calls };
}

describe("createReactNativeProposalsAdapter", () => {
  it("collects a PR that adds a new file under proposals/", async () => {
    const { fn } = exec();
    const adapter = createReactNativeProposalsAdapter({ exec: fn });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    const added = items.find((item) => item.link.endsWith("/pull/13"));
    expect(added).toMatchObject({
      sourceId: "react-native-proposals",
      heading: "Add proposal: New Architecture Phase 2",
      label: "RFC/Proposal",
      category: "mobile-development",
    });
  });

  it("excludes a meeting-notes PR (adds a file outside proposals/)", async () => {
    const { fn } = exec();
    const adapter = createReactNativeProposalsAdapter({ exec: fn });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items.some((item) => item.link.endsWith("/pull/12"))).toBe(false);
  });

  it("excludes a docs-typo PR (modifies an existing file, adds nothing under proposals/)", async () => {
    const { fn } = exec();
    const adapter = createReactNativeProposalsAdapter({ exec: fn });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items.some((item) => item.link.endsWith("/pull/11"))).toBe(false);
  });

  it("excludes a PR that only modifies an existing proposal file (doesn't add one)", async () => {
    const { fn } = exec();
    const adapter = createReactNativeProposalsAdapter({ exec: fn });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items.some((item) => item.link.endsWith("/pull/10"))).toBe(false);
  });

  it("collects exactly one item across the whole fixture set", async () => {
    const { fn } = exec();
    const adapter = createReactNativeProposalsAdapter({ exec: fn });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items).toHaveLength(1);
  });

  it("reads from the pulls endpoint only, never the issues endpoint — an ordinary issue can never surface here", async () => {
    const { fn, calls } = exec();
    const adapter = createReactNativeProposalsAdapter({ exec: fn });

    await adapter.collect({ source, signal: new AbortController().signal });

    expect(calls.some((call) => call[1]?.includes("/issues"))).toBe(false);
    expect(calls.some((call) => call[1]?.includes("/pulls?"))).toBe(true);
  });
});
