import { describe, expect, it } from "vitest";
import {
  createTc39ProposalsAdapter,
  parseProposalReadme,
} from "../../scripts/collect/adapters/tc39-proposals.js";
import { runCollection } from "../../scripts/collect/engine/run-collection.js";
import { createAdapterRegistry } from "../../scripts/collect/engine/adapter.js";
import { makeSource } from "../../scripts/collect/engine/test-fixtures.js";
import { loadFixture } from "../fixtures/load-fixture.js";

const readmeRun1 = loadFixture("tc39/readme-run1.md");
const readmeRun2 = loadFixture("tc39/readme-run2.md");

function execReturning(markdown: string) {
  return async () => ({
    stdout: JSON.stringify({ content: Buffer.from(markdown, "utf-8").toString("base64") }),
    stderr: "",
  });
}

const source = makeSource({
  id: "tc39-proposals",
  adapter: "tc39-proposal-lifecycle",
  kind: "github-event",
  url: "https://github.com/tc39/proposals",
  category: "developer-tooling",
});

describe("parseProposalReadme", () => {
  it("assigns each proposal the stage of the section it's listed under", () => {
    const proposals = parseProposalReadme(readmeRun1);

    expect(proposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "proposal-flatMap", stage: "4" }),
        expect.objectContaining({ slug: "proposal-temporal", stage: "3" }),
        expect.objectContaining({ slug: "proposal-doomed", stage: "2" }),
        expect.objectContaining({ slug: "proposal-record-tuple", stage: "1" }),
      ]),
    );
  });

  it("assigns 'withdrawn' to proposals under the Withdrawn Proposals section", () => {
    const proposals = parseProposalReadme(readmeRun2);
    const doomed = proposals.find((p) => p.slug === "proposal-doomed");
    expect(doomed?.stage).toBe("withdrawn");
  });
});

describe("createTc39ProposalsAdapter", () => {
  it("on a first run (no previous cursor), every proposal is a new-proposal event at its current stage", async () => {
    const adapter = createTc39ProposalsAdapter({ exec: execReturning(readmeRun1) });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items).toHaveLength(4);
    expect(items.every((item) => item.label === "RFC/Proposal")).toBe(true);
    const temporal = items.find((item) => item.link.endsWith("proposal-temporal"));
    expect(temporal?.heading).toContain("Stage 3");
  });

  it("detects a single-stage transition", async () => {
    const adapter = createTc39ProposalsAdapter({ exec: execReturning(readmeRun2) });
    const previousCursor = {
      lastRunAt: "2026-01-01T00:00:00Z",
      proposalStages: {
        "proposal-flatMap": "4",
        "proposal-temporal": "3",
        "proposal-doomed": "2",
        "proposal-record-tuple": "1",
      },
    };

    const items = await adapter.collect({
      source,
      signal: new AbortController().signal,
      previousCursor,
    });

    const temporalEvent = items.find((item) => item.link.endsWith("proposal-temporal"));
    expect(temporalEvent).toMatchObject({ label: "Improvement" });
    expect(temporalEvent?.heading).toContain("Stage 4");
  });

  it("detects a multi-stage jump as a single transition event at the newly observed stage", async () => {
    const adapter = createTc39ProposalsAdapter({ exec: execReturning(readmeRun2) });
    const previousCursor = {
      lastRunAt: "2026-01-01T00:00:00Z",
      proposalStages: { "proposal-record-tuple": "1" },
    };

    const items = await adapter.collect({
      source,
      signal: new AbortController().signal,
      previousCursor,
    });

    const recordTupleEvents = items.filter((item) => item.link.endsWith("proposal-record-tuple"));
    expect(recordTupleEvents).toHaveLength(1);
    expect(recordTupleEvents[0]).toMatchObject({ label: "Improvement" });
    expect(recordTupleEvents[0]?.heading).toContain("Stage 3");
  });

  it("labels a withdrawal as Retired", async () => {
    const adapter = createTc39ProposalsAdapter({ exec: execReturning(readmeRun2) });
    const previousCursor = {
      lastRunAt: "2026-01-01T00:00:00Z",
      proposalStages: { "proposal-doomed": "2" },
    };

    const items = await adapter.collect({
      source,
      signal: new AbortController().signal,
      previousCursor,
    });

    const withdrawal = items.find((item) => item.link.endsWith("proposal-doomed"));
    expect(withdrawal).toMatchObject({ label: "Retired" });
    expect(withdrawal?.heading).toContain("withdrawn");
  });

  it("produces no event for a proposal whose wording changed but stage did not (cosmetic edit ignored)", async () => {
    const adapter = createTc39ProposalsAdapter({ exec: execReturning(readmeRun2) });
    const previousCursor = {
      lastRunAt: "2026-01-01T00:00:00Z",
      proposalStages: { "proposal-flatMap": "4" },
    };

    const items = await adapter.collect({
      source,
      signal: new AbortController().signal,
      previousCursor,
    });

    expect(items.some((item) => item.link.endsWith("proposal-flatMap"))).toBe(false);
  });

  it("re-running with an unchanged snapshot produces zero new items", async () => {
    const adapter = createTc39ProposalsAdapter({ exec: execReturning(readmeRun1) });
    const previousCursor = {
      lastRunAt: "2026-01-01T00:00:00Z",
      proposalStages: {
        "proposal-flatMap": "4",
        "proposal-temporal": "3",
        "proposal-doomed": "2",
        "proposal-record-tuple": "1",
      },
    };

    const items = await adapter.collect({
      source,
      signal: new AbortController().signal,
      previousCursor,
    });

    expect(items).toEqual([]);
  });

  it("throws when the README parses to zero proposals, rather than silently succeeding empty", async () => {
    const adapter = createTc39ProposalsAdapter({ exec: execReturning("# Nothing here") });

    await expect(adapter.collect({ source, signal: new AbortController().signal })).rejects.toThrow(
      /zero proposals/,
    );
  });

  it("each transition and new-proposal event gets a distinct deterministic id", async () => {
    const adapter = createTc39ProposalsAdapter({ exec: execReturning(readmeRun1) });
    const items = await adapter.collect({ source, signal: new AbortController().signal });
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("deriveCursorFragment reports every observed proposal's current stage after collect()", async () => {
    const adapter = createTc39ProposalsAdapter({ exec: execReturning(readmeRun1) });
    await adapter.collect({ source, signal: new AbortController().signal });

    const fragment = adapter.deriveCursorFragment?.([], undefined);
    expect(fragment).toEqual({
      proposalStages: {
        "proposal-flatMap": "4",
        "proposal-temporal": "3",
        "proposal-doomed": "2",
        "proposal-record-tuple": "1",
      },
    });
  });
});

describe("createTc39ProposalsAdapter through the engine, across two runs", () => {
  it("carries proposalStages forward via the cursor, and a second identical run finds zero transitions", async () => {
    const registry = createAdapterRegistry([
      createTc39ProposalsAdapter({ exec: execReturning(readmeRun1) }),
    ]);

    const firstRun = await runCollection({ sources: [source], registry, sleep: async () => {} });
    const firstOutcome = firstRun.outcomes[0];
    expect(firstOutcome).toMatchObject({ outcome: "succeeded" });
    const cursorFragment =
      firstOutcome!.outcome === "succeeded" ? firstOutcome!.cursorFragment : undefined;
    expect(cursorFragment).toBeDefined();

    const secondRegistry = createAdapterRegistry([
      createTc39ProposalsAdapter({ exec: execReturning(readmeRun1) }),
    ]);
    const secondRun = await runCollection({
      sources: [source],
      registry: secondRegistry,
      sleep: async () => {},
      previousCursors: {
        "tc39-proposals": { lastRunAt: "2026-01-01T00:00:00Z", ...cursorFragment },
      },
    });

    const secondOutcome = secondRun.outcomes[0];
    expect(secondOutcome).toMatchObject({ outcome: "succeeded", items: [] });
  });
});
