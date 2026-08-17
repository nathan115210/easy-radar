/** Extracts `owner/repo` from a GitHub source URL, shared by every GitHub-backed adapter. */
export function parseGithubRepo(sourceUrl: string): { owner: string; repo: string } {
  const url = new URL(sourceUrl);
  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo) {
    throw new Error(`Cannot determine owner/repo from GitHub source url "${sourceUrl}"`);
  }
  return { owner, repo };
}
