import { describe, expect, it, vi } from "vitest";
import { withRetries } from "./retry.js";

describe("withRetries", () => {
  it("returns immediately on success without sleeping", async () => {
    const sleep = vi.fn(async () => {});
    const result = await withRetries(async () => "ok", { retries: 3, baseDelayMs: 100, sleep });
    expect(result).toBe("ok");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries with exponential backoff and eventually succeeds", async () => {
    const sleep = vi.fn(async () => {});
    let attempts = 0;
    const result = await withRetries(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`fail ${attempts}`);
        }
        return "ok";
      },
      { retries: 3, baseDelayMs: 100, sleep },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(sleep.mock.calls).toEqual([[100], [200]]);
  });

  it("throws the last error once retries are exhausted", async () => {
    const sleep = vi.fn(async () => {});
    await expect(
      withRetries(
        async () => {
          throw new Error("always fails");
        },
        { retries: 2, baseDelayMs: 10, sleep },
      ),
    ).rejects.toThrow("always fails");
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
