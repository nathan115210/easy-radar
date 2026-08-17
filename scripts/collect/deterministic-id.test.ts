import { describe, expect, it } from "vitest";
import { computeDeterministicId } from "./deterministic-id.js";
import { normalizeUrl } from "./normalize-url.js";

describe("computeDeterministicId", () => {
  it("is stable across repeated calls (same run)", () => {
    const key = normalizeUrl("https://react.dev/blog/react-19");
    expect(computeDeterministicId(key)).toBe(computeDeterministicId(key));
  });

  it("produces the same id for equivalent URL variants once normalized", () => {
    const a = computeDeterministicId(normalizeUrl("https://www.react.dev/blog/react-19/"));
    const b = computeDeterministicId(
      normalizeUrl("HTTPS://react.dev:443/blog/react-19?utm_source=newsletter"),
    );
    expect(a).toBe(b);
  });

  it("produces different ids for different keys", () => {
    const a = computeDeterministicId(normalizeUrl("https://react.dev/blog/react-19"));
    const b = computeDeterministicId(normalizeUrl("https://react.dev/blog/react-18"));
    expect(a).not.toBe(b);
  });

  it("supports a custom composite key for sources that opt out of URL dedup", () => {
    const proposalCreated = computeDeterministicId("tc39:temporal:proposal-created");
    const proposalStage2 = computeDeterministicId("tc39:temporal:stage-2");
    expect(proposalCreated).not.toBe(proposalStage2);
  });

  it("is not affected by unrelated process/machine state (pure function of its input)", () => {
    // Regression guard: this must never call Date.now(), Math.random(), or
    // read the hostname/pid — those would break cross-machine stability.
    const key = "a-fixed-key";
    const results = new Set(Array.from({ length: 5 }, () => computeDeterministicId(key)));
    expect(results.size).toBe(1);
  });
});
