import { describe, expect, it } from "vitest";
import { createAdapterRegistry } from "../../scripts/collect/engine/adapter.js";
import { runCollection } from "../../scripts/collect/engine/run-collection.js";
import { makeSource } from "../../scripts/collect/engine/test-fixtures.js";
import {
  GhCliUnauthenticatedError,
  GhCliUnavailableError,
} from "../../scripts/collect/adapters/gh-cli.js";
import { createGithubReleaseAdapter } from "../../scripts/collect/adapters/github-releases.js";
import { loadFixture } from "../fixtures/load-fixture.js";

const releasesJson = loadFixture("github-release/releases-sample.json");

const noSleep = async (): Promise<void> => {};

const source = makeSource({
  id: "example-repo-releases",
  adapter: "github-release",
  kind: "github-release",
  url: "https://github.com/example/repo",
});

describe("createGithubReleaseAdapter", () => {
  it("collects only stable releases by default (excludes prerelease and draft)", async () => {
    const adapter = createGithubReleaseAdapter({
      exec: async () => ({ stdout: releasesJson, stderr: "" }),
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });

    expect(items.map((item) => item.heading).sort()).toEqual(["v19.0.1", "v19.1.0"]);
  });

  it("always excludes draft releases, even with an explicit prerelease override", async () => {
    const adapter = createGithubReleaseAdapter({
      exec: async () => ({ stdout: releasesJson, stderr: "" }),
    });
    const withPrereleaseOverride = {
      ...source,
      releasePolicy: { includePrerelease: true, includeDraft: false as const },
    };

    const items = await adapter.collect({
      source: withPrereleaseOverride,
      signal: new AbortController().signal,
    });

    expect(items.map((item) => item.heading)).not.toContain("v19.2.0-draft");
  });

  it("includes prereleases only under an explicit releasePolicy override", async () => {
    const adapter = createGithubReleaseAdapter({
      exec: async () => ({ stdout: releasesJson, stderr: "" }),
    });
    const withPrereleaseOverride = {
      ...source,
      releasePolicy: { includePrerelease: true, includeDraft: false as const },
    };

    const items = await adapter.collect({
      source: withPrereleaseOverride,
      signal: new AbortController().signal,
    });

    expect(items.map((item) => item.heading).sort()).toEqual([
      "v19.0.1",
      "v19.1.0",
      "v19.1.0-rc.0",
    ]);
  });

  it("collects patch releases as their own items, not collapsed into a minor release", async () => {
    const adapter = createGithubReleaseAdapter({
      exec: async () => ({ stdout: releasesJson, stderr: "" }),
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });
    const patch = items.find((item) => item.heading === "v19.0.1");

    expect(patch).toBeDefined();
    expect(patch).toMatchObject({ label: "Release", dateBasis: "published", date: "2026-01-05" });
  });

  it("maps a release to a NewsItem with label Release and the release's published date", async () => {
    const adapter = createGithubReleaseAdapter({
      exec: async () => ({ stdout: releasesJson, stderr: "" }),
    });

    const items = await adapter.collect({ source, signal: new AbortController().signal });
    const latest = items.find((item) => item.heading === "v19.1.0");

    expect(latest).toMatchObject({
      sourceId: "example-repo-releases",
      label: "Release",
      link: "https://github.com/example/repo/releases/tag/v19.1.0",
      date: "2026-01-10",
      dateBasis: "published",
    });
  });

  it("produces an actionable error, not a stack trace, when gh is unauthenticated", async () => {
    const adapter = createGithubReleaseAdapter({
      exec: async () => {
        throw new GhCliUnauthenticatedError();
      },
    });
    await expect(
      adapter.collect({ source, signal: new AbortController().signal }),
    ).rejects.toBeInstanceOf(GhCliUnauthenticatedError);
  });

  it("produces an actionable error when gh is not installed", async () => {
    const adapter = createGithubReleaseAdapter({
      exec: async () => {
        throw new GhCliUnavailableError();
      },
    });
    await expect(
      adapter.collect({ source, signal: new AbortController().signal }),
    ).rejects.toBeInstanceOf(GhCliUnavailableError);
  });
});

describe("a rate-limited GitHub source through the collector engine", () => {
  it("is marked Failing with a reason, leaving other sources unaffected", async () => {
    const rateLimited = makeSource({
      id: "rate-limited-repo",
      adapter: "github-release",
      url: "https://github.com/example/rate-limited",
    });
    const healthyFeed = makeSource({ id: "healthy-repo", adapter: "healthy" });

    const registry = createAdapterRegistry([
      createGithubReleaseAdapter({
        exec: async () => {
          const error = new Error("failed") as NodeJS.ErrnoException & { stderr?: string };
          error.stderr = "gh: API rate limit exceeded (HTTP 403)";
          throw error;
        },
      }),
      { name: "healthy", collect: async () => [] },
    ]);

    const result = await runCollection({
      sources: [rateLimited, healthyFeed],
      registry,
      retries: 0,
      sleep: noSleep,
    });

    const rateLimitedOutcome = result.outcomes.find((o) => o.source.id === "rate-limited-repo");
    const healthyOutcome = result.outcomes.find((o) => o.source.id === "healthy-repo");

    expect(rateLimitedOutcome).toMatchObject({
      outcome: "failed",
      failureClass: "runtime-failing",
      reason: expect.stringMatching(/rate limit/i),
    });
    expect(healthyOutcome?.outcome).toBe("succeeded");
  });
});
