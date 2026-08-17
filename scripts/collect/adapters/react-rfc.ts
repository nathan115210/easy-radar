import type { NewsItem } from "../../../shared/schemas/index.js";
import type { Adapter, AdapterContext } from "../engine/adapter.js";
import { computeDeterministicId } from "../deterministic-id.js";
import { deriveLabel } from "../labels.js";
import { normalizeUrl } from "../normalize-url.js";
import { deriveTags } from "../tags.js";
import { fetchGithubEvents } from "./github-events.js";
import type { GhExec } from "./gh-cli.js";
import { parseGithubRepo } from "./parse-github-repo.js";

type PullRequest = {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
};

export type ReactRfcAdapterOptions = {
  exec?: GhExec;
};

/**
 * React's RFC repository (PRD §11.6, §13.1): every pull request opened
 * against it *is* a proposal, unlike the mixed-content React Native repo
 * (`react-native-proposals.ts`) — no changed-files filtering needed. Idempotency
 * across runs comes from the same mechanism every other GitHub-sourced
 * adapter relies on: item ids are deterministic from the PR's own URL, and
 * `apply-collection-window.ts`/merge already never re-import an id that's
 * already active.
 */
export function createReactRfcAdapter(options: ReactRfcAdapterOptions = {}): Adapter {
  return {
    name: "react-rfc",
    async collect(context: AdapterContext): Promise<NewsItem[]> {
      const { owner, repo } = parseGithubRepo(context.source.url);
      const pulls = await fetchGithubEvents<PullRequest>(
        `repos/${owner}/${repo}/pulls?state=all&per_page=100&sort=created&direction=desc`,
        options.exec,
      );

      return pulls.map((pr) => {
        const link = normalizeUrl(pr.html_url);
        return {
          id: computeDeterministicId(link),
          sourceId: context.source.id,
          heading: pr.title,
          label: deriveLabel("rfc-proposal-opened"),
          link,
          date: pr.created_at.slice(0, 10),
          dateBasis: "published",
          category: context.source.category,
          tags: deriveTags(context.source.tags),
        };
      });
    },
  };
}
