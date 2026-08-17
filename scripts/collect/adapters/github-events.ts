import { ghApiJson, type GhExec } from "./gh-cli.js";

/**
 * Generic GitHub API JSON fetcher for repository event streams (PRs, tags,
 * proposal files) — the shared primitive `kind: "github-event"` sources
 * build on. This issue deliberately stops here: mapping a specific event
 * shape (a new proposal PR, a tag push, a proposal file added) into a
 * NewsItem requires knowing that event's semantics, which is #28's (TC39
 * proposal lifecycle) and #29's (React RFC / React Native proposals) job,
 * not something to guess ahead of those designs.
 */
export async function fetchGithubEvents<T>(endpoint: string, exec?: GhExec): Promise<T[]> {
  const result = await ghApiJson<T[] | T>(endpoint, exec);
  return Array.isArray(result) ? result : [result];
}
