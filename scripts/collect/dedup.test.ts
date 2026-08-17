import { describe, expect, it } from "vitest";
import { resolveDuplicates, type DedupCandidate } from "./dedup.js";

describe("resolveDuplicates", () => {
  it("keeps a single candidate with no conflict", () => {
    const candidate: DedupCandidate = { sourceId: "react-blog", dedupKey: "url:a", specificity: 0 };
    expect(resolveDuplicates([candidate])).toEqual([candidate]);
  });

  it("the most specific filtered source wins when two candidates share a dedupKey", () => {
    const broad: DedupCandidate = {
      sourceId: "grafana-blog",
      dedupKey: "url:grafana.com/blog/k6-post",
      specificity: 0,
    };
    const filtered: DedupCandidate = {
      sourceId: "grafana-k6-blog",
      dedupKey: "url:grafana.com/blog/k6-post",
      specificity: 1,
    };

    expect(resolveDuplicates([broad, filtered])).toEqual([filtered]);
    // Order of discovery must not matter.
    expect(resolveDuplicates([filtered, broad])).toEqual([filtered]);
  });

  it("breaks a specificity tie deterministically by sourceId", () => {
    const a: DedupCandidate = { sourceId: "source-b", dedupKey: "url:x", specificity: 1 };
    const b: DedupCandidate = { sourceId: "source-a", dedupKey: "url:x", specificity: 1 };

    expect(resolveDuplicates([a, b])).toEqual([b]);
    expect(resolveDuplicates([b, a])).toEqual([b]);
  });

  it("never merges candidates with skipUrlDedup, even when their dedupKey matches", () => {
    const proposalCreated: DedupCandidate = {
      sourceId: "tc39",
      dedupKey: "https://github.com/tc39/proposal-temporal",
      specificity: 0,
      skipUrlDedup: true,
    };
    const stageTransition: DedupCandidate = {
      sourceId: "tc39",
      dedupKey: "https://github.com/tc39/proposal-temporal",
      specificity: 0,
      skipUrlDedup: true,
    };

    const result = resolveDuplicates([proposalCreated, stageTransition]);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(proposalCreated);
    expect(result).toContainEqual(stageTransition);
  });

  it("resolves each distinct dedupKey independently", () => {
    const a: DedupCandidate = { sourceId: "s1", dedupKey: "url:a", specificity: 0 };
    const b: DedupCandidate = { sourceId: "s2", dedupKey: "url:b", specificity: 0 };
    expect(resolveDuplicates([a, b])).toEqual(expect.arrayContaining([a, b]));
  });
});
