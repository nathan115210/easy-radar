import { describe, expect, it } from "vitest";
import { withTimeout } from "./timeout.js";

describe("withTimeout", () => {
  it("resolves normally when the function finishes in time", async () => {
    const result = await withTimeout(async () => "ok", 50);
    expect(result).toBe("ok");
  });

  it("rejects with a timeout error when the function hangs, even if it ignores the signal", async () => {
    await expect(withTimeout(() => new Promise(() => {}), 20)).rejects.toThrow(/timed out/i);
  });

  it("aborts the signal passed to the function once the timeout fires", async () => {
    let observedAborted = false;
    await expect(
      withTimeout(
        (signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              observedAborted = true;
              reject(new Error("aborted"));
            });
          }),
        20,
      ),
    ).rejects.toThrow();
    expect(observedAborted).toBe(true);
  });
});
