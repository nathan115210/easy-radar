import { describe, expect, it } from "vitest";
import {
  GhCliUnauthenticatedError,
  GhCliUnavailableError,
  GhRateLimitError,
  ghApiJson,
} from "./gh-cli.js";

describe("ghApiJson", () => {
  it("parses a successful JSON response", async () => {
    const exec = async () => ({ stdout: JSON.stringify({ ok: true }), stderr: "" });
    await expect(ghApiJson("repos/o/r", exec)).resolves.toEqual({ ok: true });
  });

  it("passes extra args through to the underlying exec call", async () => {
    const calls: (readonly string[])[] = [];
    const exec = async (args: readonly string[]) => {
      calls.push(args);
      return { stdout: "[]", stderr: "" };
    };
    await ghApiJson("repos/o/r/releases", exec, ["--paginate"]);
    expect(calls[0]).toEqual(["api", "repos/o/r/releases", "--paginate"]);
  });

  it("produces an actionable error, not a stack trace, when gh is missing", async () => {
    const exec = async () => {
      const error = new Error("spawn gh ENOENT") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    };
    await expect(ghApiJson("repos/o/r", exec)).rejects.toBeInstanceOf(GhCliUnavailableError);
  });

  it("produces an actionable error when gh is unauthenticated", async () => {
    const exec = async () => {
      const error = new Error("failed") as NodeJS.ErrnoException & { stderr?: string };
      error.stderr = "gh: To use GitHub CLI, please run: gh auth login";
      throw error;
    };
    await expect(ghApiJson("repos/o/r", exec)).rejects.toBeInstanceOf(GhCliUnauthenticatedError);
  });

  it("classifies a rate-limit response distinctly", async () => {
    const exec = async () => {
      const error = new Error("failed") as NodeJS.ErrnoException & { stderr?: string };
      error.stderr = "gh: API rate limit exceeded for user ID 123. (HTTP 403)";
      throw error;
    };
    await expect(ghApiJson("repos/o/r", exec)).rejects.toBeInstanceOf(GhRateLimitError);
  });

  it("throws a clear error on invalid JSON output", async () => {
    const exec = async () => ({ stdout: "not json", stderr: "" });
    await expect(ghApiJson("repos/o/r", exec)).rejects.toThrow(/invalid JSON/i);
  });

  it("wraps an unrecognized failure in a generic error carrying the CLI's message", async () => {
    const exec = async () => {
      const error = new Error("boom") as NodeJS.ErrnoException & { stderr?: string };
      error.stderr = "gh: something unexpected happened";
      throw error;
    };
    await expect(ghApiJson("repos/o/r", exec)).rejects.toThrow(/something unexpected happened/);
  });
});
