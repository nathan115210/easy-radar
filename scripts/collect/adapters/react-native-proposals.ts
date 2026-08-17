import type { NewsItem } from "../../../shared/schemas/index.js";
import type { Adapter, AdapterContext } from "../engine/adapter.js";
import { computeDeterministicId } from "../deterministic-id.js";
import { deriveLabel } from "../labels.js";
import { normalizeUrl } from "../normalize-url.js";
import { deriveTags } from "../tags.js";
import { ghApiJson, type GhExec } from "./gh-cli.js";
import { fetchGithubEvents } from "./github-events.js";
import { parseGithubRepo } from "./parse-github-repo.js";

type PullRequest = {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
};

type PullRequestFile = {
  filename: string;
  status: string;
};

const PROPOSALS_DIR_PREFIX = "proposals/";

/**
 * A PR "adds a proposal file" (PRD §11.6, §13.3) only if at least one of
 * its changed files is newly added (`status: "added"`, not modified or
 * renamed) under `proposals/`. Checked against the PR's actual changed-
 * files list — never the PR title — so a meeting-notes PR, a docs typo
 * fix, or an ordinary discussion PR (none of which add a new file there)
 * is excluded regardless of how it's titled.
 */
function addsProposalFile(files: readonly PullRequestFile[]): boolean {
  return files.some(
    (file) => file.status === "added" && file.filename.startsWith(PROPOSALS_DIR_PREFIX),
  );
}

export type ReactNativeProposalsAdapterOptions = {
  exec?: GhExec;
};

/**
 * `react-native-community/discussions-and-proposals` (PRD §11.6, §13.3)
 * mixes proposals with ordinary issues, discussions, and meeting notes in
 * one repo — unlike React's dedicated RFC repo (`react-rfc.ts`), so every
 * open-all pull request needs its own changed-files check before it
 * counts as a proposal. The GitHub `/pulls` endpoint already excludes
 * ordinary issues (they're a separate resource); this adapter's own
 * filter is what excludes discussion/meeting-notes/typo PRs opened
 * against the repo.
 */
export function createReactNativeProposalsAdapter(
  options: ReactNativeProposalsAdapterOptions = {},
): Adapter {
  return {
    name: "react-native-proposals",
    async collect(context: AdapterContext): Promise<NewsItem[]> {
      const { owner, repo } = parseGithubRepo(context.source.url);
      const pulls = await fetchGithubEvents<PullRequest>(
        `repos/${owner}/${repo}/pulls?state=all&per_page=100&sort=created&direction=desc`,
        options.exec,
      );

      const items: NewsItem[] = [];
      for (const pr of pulls) {
        const files = await ghApiJson<PullRequestFile[]>(
          `repos/${owner}/${repo}/pulls/${pr.number}/files`,
          options.exec,
        );
        if (!addsProposalFile(files)) {
          continue;
        }

        const link = normalizeUrl(pr.html_url);
        items.push({
          id: computeDeterministicId(link),
          sourceId: context.source.id,
          heading: pr.title,
          label: deriveLabel("rfc-proposal-opened"),
          link,
          date: pr.created_at.slice(0, 10),
          dateBasis: "published",
          category: context.source.category,
          tags: deriveTags(context.source.tags),
        });
      }

      return items;
    },
  };
}
