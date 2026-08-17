import type { NewsItem } from "../../../shared/schemas/index.js";
import type { Adapter, AdapterContext } from "../engine/adapter.js";
import { computeDeterministicId } from "../deterministic-id.js";
import { deriveLabel } from "../labels.js";
import { normalizeUrl } from "../normalize-url.js";
import { deriveTags } from "../tags.js";
import { ghApiJson, type GhExec } from "./gh-cli.js";

type GithubRelease = {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
};

function parseGithubRepo(sourceUrl: string): { owner: string; repo: string } {
  const url = new URL(sourceUrl);
  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo) {
    throw new Error(`Cannot determine owner/repo from GitHub source url "${sourceUrl}"`);
  }
  return { owner, repo };
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toNewsItem(release: GithubRelease, context: AdapterContext, now: Date): NewsItem {
  const link = normalizeUrl(release.html_url);
  const publishedAt = release.published_at ? new Date(release.published_at) : undefined;
  const hasTrustworthyDate = publishedAt !== undefined && !Number.isNaN(publishedAt.getTime());

  return {
    id: computeDeterministicId(link),
    sourceId: context.source.id,
    heading: release.name || release.tag_name,
    label: deriveLabel("github-stable-release"),
    link,
    date: toDateOnly(hasTrustworthyDate ? publishedAt! : now),
    dateBasis: hasTrustworthyDate ? "published" : "discovered",
    category: context.source.category,
    tags: deriveTags(context.source.tags),
  };
}

export type GithubReleaseAdapterOptions = {
  exec?: GhExec;
  now?: () => Date;
};

/**
 * kind: "github-release" (PRD §11.5): every stable release, including
 * patch releases — no filtering by version number, only by draft/prerelease
 * status. Drafts are always excluded; SourceConfig.releasePolicy
 * .includeDraft is fixed to `false` by schema, so there's no override.
 * Prereleases are excluded unless a source's releasePolicy explicitly sets
 * includePrerelease: true.
 *
 * Fetches a single page of up to 100 releases (GitHub's max page size).
 * That comfortably covers a normal 36h incremental run and the initial
 * sync for a typical repo's release cadence; a source with a genuinely
 * deeper backlog needs real pagination, which belongs with #11's
 * cursor/gap-recovery work rather than being bolted on here.
 */
export function createGithubReleaseAdapter(options: GithubReleaseAdapterOptions = {}): Adapter {
  const now = options.now ?? ((): Date => new Date());

  return {
    name: "github-release",
    async collect(context: AdapterContext): Promise<NewsItem[]> {
      const { owner, repo } = parseGithubRepo(context.source.url);
      const releases = await ghApiJson<GithubRelease[]>(
        `repos/${owner}/${repo}/releases?per_page=100`,
        options.exec,
      );

      const includePrerelease = context.source.releasePolicy?.includePrerelease ?? false;

      return releases
        .filter((release) => !release.draft)
        .filter((release) => !release.prerelease || includePrerelease)
        .map((release) => toNewsItem(release, context, now()));
    },
  };
}
