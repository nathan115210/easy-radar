import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "./concurrency.js";

describe("runWithConcurrency", () => {
  it("preserves output order regardless of completion order", async () => {
    const delays = [30, 10, 20];
    const result = await runWithConcurrency(delays, 3, (ms) => {
      return new Promise<number>((resolve) => setTimeout(() => resolve(ms), ms));
    });
    expect(result).toEqual(delays);
  });

  it("never runs more than `limit` workers at once", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    await runWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (item) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return item;
    });

    expect(maxInFlight).toBe(2);
  });

  it("handles an empty list", async () => {
    const result = await runWithConcurrency([], 4, async (item) => item);
    expect(result).toEqual([]);
  });

  it("handles a limit larger than the item count", async () => {
    const result = await runWithConcurrency([1, 2], 10, async (item) => item * 2);
    expect(result).toEqual([2, 4]);
  });
});
