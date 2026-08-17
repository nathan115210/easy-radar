import { describe, expect, it } from "vitest";
import { fetchGithubEvents } from "./github-events.js";

describe("fetchGithubEvents", () => {
  it("returns a JSON array response as-is", async () => {
    const exec = async () => ({
      stdout: JSON.stringify([{ number: 1 }, { number: 2 }]),
      stderr: "",
    });
    await expect(fetchGithubEvents("repos/o/r/pulls", exec)).resolves.toEqual([
      { number: 1 },
      { number: 2 },
    ]);
  });

  it("wraps a single JSON object response in an array", async () => {
    const exec = async () => ({ stdout: JSON.stringify({ number: 1 }), stderr: "" });
    await expect(fetchGithubEvents("repos/o/r/pulls/1", exec)).resolves.toEqual([{ number: 1 }]);
  });
});
