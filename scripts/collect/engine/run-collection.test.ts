import { describe, expect, it, vi } from "vitest";
import type { NewsItem } from "../../../shared/schemas/index.js";
import { createAdapterRegistry, type Adapter } from "./adapter.js";
import { ConfigInvalidError } from "./errors.js";
import { runCollection } from "./run-collection.js";
import { makeSource } from "./test-fixtures.js";

const item = (id: string): NewsItem => ({
  id,
  sourceId: "react-blog",
  heading: `Item ${id}`,
  label: "Release",
  link: `https://react.dev/${id}`,
  date: "2026-01-01",
  dateBasis: "published",
  category: "web-core",
  tags: [],
});

const noSleep = async (): Promise<void> => {};

describe("runCollection", () => {
  it("isolates a source that throws; other sources still complete and their items are returned", async () => {
    const good = makeSource({ id: "good-source", adapter: "good" });
    const bad = makeSource({ id: "bad-source", adapter: "bad" });

    const registry = createAdapterRegistry([
      { name: "good", collect: async () => [item("a")] },
      {
        name: "bad",
        collect: async () => {
          throw new Error("boom");
        },
      },
    ]);

    const result = await runCollection({
      sources: [good, bad],
      registry,
      retries: 0,
      sleep: noSleep,
    });

    expect(result.items).toEqual([item("a")]);

    const goodOutcome = result.outcomes.find((o) => o.source.id === "good-source");
    const badOutcome = result.outcomes.find((o) => o.source.id === "bad-source");
    expect(goodOutcome?.outcome).toBe("succeeded");
    expect(badOutcome).toMatchObject({
      outcome: "failed",
      failureClass: "runtime-failing",
      reason: "boom",
    });
  });

  it("isolates a source that times out; other sources still complete", async () => {
    const hanging = makeSource({ id: "hanging-source", adapter: "hanging" });
    const good = makeSource({ id: "good-source", adapter: "good" });

    const registry = createAdapterRegistry([
      { name: "hanging", collect: () => new Promise(() => {}) },
      { name: "good", collect: async () => [item("a")] },
    ]);

    const result = await runCollection({
      sources: [hanging, good],
      registry,
      timeoutMs: 20,
      retries: 0,
      sleep: noSleep,
    });

    const hangingOutcome = result.outcomes.find((o) => o.source.id === "hanging-source");
    const goodOutcome = result.outcomes.find((o) => o.source.id === "good-source");
    expect(hangingOutcome).toMatchObject({ outcome: "failed", failureClass: "runtime-failing" });
    expect(goodOutcome?.outcome).toBe("succeeded");
  });

  it("isolates a source returning malformed data (adapter throws on validation)", async () => {
    const malformed = makeSource({ id: "malformed-source", adapter: "malformed" });
    const good = makeSource({ id: "good-source", adapter: "good" });

    const registry = createAdapterRegistry([
      {
        name: "malformed",
        collect: async () => {
          throw new Error("received malformed feed XML");
        },
      },
      { name: "good", collect: async () => [item("a")] },
    ]);

    const result = await runCollection({
      sources: [malformed, good],
      registry,
      retries: 0,
      sleep: noSleep,
    });

    expect(result.items).toEqual([item("a")]);
    expect(result.outcomes.find((o) => o.source.id === "malformed-source")).toMatchObject({
      outcome: "failed",
      reason: "received malformed feed XML",
    });
  });

  it("retries a failing source before giving up", async () => {
    let attempts = 0;
    const flaky = makeSource({ id: "flaky-source", adapter: "flaky" });
    const registry = createAdapterRegistry([
      {
        name: "flaky",
        collect: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error(`attempt ${attempts} failed`);
          }
          return [item("a")];
        },
      },
    ]);

    const result = await runCollection({
      sources: [flaky],
      registry,
      retries: 3,
      retryBaseDelayMs: 1,
      sleep: noSleep,
    });

    expect(attempts).toBe(3);
    expect(result.outcomes[0]).toMatchObject({ outcome: "succeeded" });
  });

  it("throws ConfigInvalidError before fetching anything when a source names an unregistered adapter", async () => {
    const fetchSpy = vi.fn(async () => [item("a")]);
    const unsupported = makeSource({ id: "bad-config", adapter: "does-not-exist" });
    const good = makeSource({ id: "good-source", adapter: "good" });
    const registry = createAdapterRegistry([{ name: "good", collect: fetchSpy }]);

    await expect(
      runCollection({ sources: [unsupported, good], registry, sleep: noSleep }),
    ).rejects.toThrow(ConfigInvalidError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips Planned sources entirely — never fetched, never marked failed", async () => {
    const fetchSpy = vi.fn(async () => [item("a")]);
    const planned = makeSource({
      id: "planned-source",
      status: "planned",
      adapter: "unimplemented",
    });
    const registry = createAdapterRegistry([{ name: "unimplemented", collect: fetchSpy }]);

    const result = await runCollection({ sources: [planned], registry, sleep: noSleep });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ source: planned, outcome: "planned" }]);
  });

  it("respects the concurrency limit across sources", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const sources = Array.from({ length: 6 }, (_, i) =>
      makeSource({ id: `source-${i}`, adapter: "slow" }),
    );
    const registry = createAdapterRegistry([
      {
        name: "slow",
        collect: async () => {
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 5));
          inFlight--;
          return [];
        },
      },
    ]);

    await runCollection({ sources, registry, concurrency: 2, sleep: noSleep });

    expect(maxInFlight).toBe(2);
  });

  const failingAdapter: Adapter = {
    name: "failing",
    collect: async () => {
      throw new Error("still broken");
    },
  };

  it("a source that was already Failing is attempted again (never auto-disabled)", async () => {
    const fetchSpy = vi.fn(failingAdapter.collect);
    const failingSource = makeSource({ id: "flaky", status: "failing", adapter: "failing" });
    const registry = createAdapterRegistry([{ name: "failing", collect: fetchSpy }]);

    await runCollection({ sources: [failingSource], registry, retries: 0, sleep: noSleep });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
