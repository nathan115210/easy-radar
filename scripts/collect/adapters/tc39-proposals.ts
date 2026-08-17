import type { NewsItem } from "../../../shared/schemas/index.js";
import type { Adapter, AdapterContext } from "../engine/adapter.js";
import { computeDeterministicId } from "../deterministic-id.js";
import { deriveLabel } from "../labels.js";
import { deriveTags } from "../tags.js";
import { ghApiJson, type GhExec } from "./gh-cli.js";

type ProposalSnapshot = { slug: string; name: string; url: string; stage: string };

const STAGE_HEADER_PATTERN = /^#{1,3}\s*Stage\s+(\d)\b/i;
const WITHDRAWN_HEADER_PATTERN = /^#{1,3}\s*Withdrawn\b/i;
const PROPOSAL_LINK_PATTERN = /\[([^\]]+)]\((https:\/\/github\.com\/tc39\/[^)\s]+)\)/g;

function slugFromUrl(url: string): string {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? url;
}

/**
 * Parses `tc39/proposals`' README into a snapshot of every proposal's
 * current stage (PRD §11.6). Sections are `## Stage N` headers (or a
 * `## Withdrawn Proposals` header) each followed by a markdown table of
 * `[Name](https://github.com/tc39/proposal-slug)` links — the actual
 * README's exact wording may drift; if a real onboarded source (#42)
 * finds it has, this parser is the one place to update, not the
 * diffing/labeling logic below it.
 */
export function parseProposalReadme(markdown: string): ProposalSnapshot[] {
  const lines = markdown.split("\n");
  const snapshots: ProposalSnapshot[] = [];
  let currentStage: string | undefined;

  for (const line of lines) {
    const stageMatch = STAGE_HEADER_PATTERN.exec(line);
    if (stageMatch) {
      currentStage = stageMatch[1];
      continue;
    }
    if (WITHDRAWN_HEADER_PATTERN.test(line)) {
      currentStage = "withdrawn";
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      // Any other heading (e.g. an intro section) is outside every known stage.
      currentStage = undefined;
      continue;
    }
    if (!currentStage) continue;

    for (const match of line.matchAll(PROPOSAL_LINK_PATTERN)) {
      const [, name, url] = match;
      snapshots.push({ slug: slugFromUrl(url!), name: name!, url: url!, stage: currentStage });
    }
  }

  return snapshots;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function makeItem(
  proposal: ProposalSnapshot,
  context: AdapterContext,
  now: Date,
  dedupSuffix: string,
  label: ReturnType<typeof deriveLabel>,
): NewsItem {
  return {
    id: computeDeterministicId(`tc39:${proposal.slug}:${dedupSuffix}`),
    sourceId: context.source.id,
    heading: `${proposal.name} — ${dedupSuffix === "withdrawn" ? "withdrawn" : `Stage ${proposal.stage}`}`,
    label,
    link: proposal.url,
    date: toDateOnly(now),
    dateBasis: "discovered",
    category: context.source.category,
    tags: deriveTags(context.source.tags),
  };
}

export type Tc39ProposalsAdapterOptions = {
  exec?: GhExec;
  now?: () => Date;
};

/**
 * The one deliberate exception to URL-level dedup (PRD §11.4, §11.6):
 * every proposal shares its repo URL across every lifecycle event it will
 * ever have, so this adapter's ids incorporate the event itself
 * (`tc39:<slug>:new:<stage>` / `transition:<stage>` / `withdrawn`), never
 * just the URL — no `skipUrlDedup` flag is needed elsewhere in the
 * pipeline because item ids, not raw URLs, are what dedup actually keys
 * on (`pipeline.ts`).
 *
 * A proposal appearing for the first time (no entry in
 * `previousCursor.proposalStages`) is a new-proposal event at its current
 * stage. An existing proposal whose stage changed is a transition event —
 * a multi-stage jump between runs is still exactly one event, at the
 * newly observed stage, since only two snapshots (previous, current) are
 * ever compared, never a real-time feed of every intermediate stage.
 * Reaching `"withdrawn"` is a withdrawal event, labeled `Retired`.
 * Wording-only or link-only README edits that don't move a proposal
 * between sections produce no event, since only `stage` is diffed.
 * `deriveCursorFragment` reports every proposal's current stage so the
 * next run's diff is deterministic regardless of what changed in between.
 */
export function createTc39ProposalsAdapter(options: Tc39ProposalsAdapterOptions = {}): Adapter {
  const now = options.now ?? ((): Date => new Date());
  // Captured across the two calls run-collection.ts makes in sequence for
  // one source in one run (collect(), then deriveCursorFragment()) — never
  // read before collect() has set it for this run.
  let lastObservedStages: Record<string, string> | undefined;

  return {
    name: "tc39-proposal-lifecycle",
    async collect(context: AdapterContext): Promise<NewsItem[]> {
      const response = await ghApiJson<{ content: string; encoding: string }>(
        "repos/tc39/proposals/contents/README.md",
        options.exec,
      );
      const markdown = Buffer.from(response.content, "base64").toString("utf-8");
      const proposals = parseProposalReadme(markdown);
      if (proposals.length === 0) {
        throw new Error(
          `Parsed zero proposals from tc39/proposals' README — its structure may have changed`,
        );
      }

      lastObservedStages = Object.fromEntries(proposals.map((p) => [p.slug, p.stage]));

      const previousStages = context.previousCursor?.proposalStages ?? {};
      const items: NewsItem[] = [];

      for (const proposal of proposals) {
        const previousStage = previousStages[proposal.slug];

        if (previousStage === undefined) {
          items.push(
            makeItem(
              proposal,
              context,
              now(),
              `new:${proposal.stage}`,
              deriveLabel("tc39-proposal-created"),
            ),
          );
          continue;
        }
        if (previousStage === proposal.stage) {
          continue;
        }
        if (proposal.stage === "withdrawn") {
          items.push(
            makeItem(proposal, context, now(), "withdrawn", deriveLabel("tc39-withdrawal")),
          );
          continue;
        }
        items.push(
          makeItem(
            proposal,
            context,
            now(),
            `transition:${proposal.stage}`,
            deriveLabel("tc39-stage-transition"),
          ),
        );
      }

      return items;
    },
    deriveCursorFragment(): Record<string, unknown> | undefined {
      return lastObservedStages ? { proposalStages: lastObservedStages } : undefined;
    },
  };
}
