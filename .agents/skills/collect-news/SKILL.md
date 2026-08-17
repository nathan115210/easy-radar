---
name: collect-news
description: Run Easy Radar's deterministic news collector and push the result to the data branch. Use when the user asks to collect news, refresh sources, or run a collection locally in the easy-radar repository.
---

# Collect news

Orchestrates Easy Radar's local collection: run the deterministic
collector, then commit and push whatever changed to the `data` branch,
then report exactly what the collector reported. Nothing more.

## What this Skill is not

This Skill **does not browse sources, read feeds, or decide what counts
as news**. Every source fetch, parse, dedup, classification, cleanup,
schema validation, and change-guard check already happens inside
`pnpm collect` — deterministic code, not an AI judgment call (PRD §4.3).
This Skill's only job is to run that command, run the git commit/push
step, and relay what happened. If any of that reasoning ever seems like
it belongs here instead of in `scripts/collect/`, that's a sign the
Skill is being asked to do something it shouldn't.

**Never open or read `data/news.json`.** Nothing here needs its
contents, and reading it risks summarizing, ranking, or otherwise
editorializing collected items — which is exactly what PRD §18.4
prohibits an AI executor from doing, cloud or local.

## Steps

1. Run:

   ```
   pnpm agy:collect-news
   ```

   This single command calls the same `runCollectPipeline` that
   `pnpm collect` uses — collection, per-source cleanup and state sync,
   schema/invariant validation, and the change guards all run inside it,
   in that order, exactly as they do for a manual `pnpm collect`. If
   everything passes, it also commits and pushes the result to the
   `data` branch (PRD §16) — there is no pull request step, data commits
   land directly.

2. Read the command's own stdout. It is the complete, final report —
   the same terminal summary a human running `pnpm collect` by hand
   would see (succeeded / failed / planned / added counts, plus any
   per-source errors), followed by one line naming what happened to the
   git side (pushed, nothing to push, or a specific failure).

3. Relay that output back to the user, close to verbatim. Do not
   summarize it into your own words, rank the sources, or comment on
   which items look interesting — there is nothing here to interpret,
   only to report.

## Failure paths — stop and report, never "fix"

Each of these is a normal, expected outcome, not a bug to work around.
In every case: do not retry, do not edit `config/sources/`, do not touch
git yourself, do not delete or reset anything. Report the message and
stop.

- **Config invalid** — a source in `config/sources/` has a duplicate id,
  invalid category, or an adapter name that doesn't exist. Collection
  never fetched anything; no data changed. Fix belongs in a reviewed
  code change to `config/sources/`, not here.
- **Guard rejected** — the volume guard, the active-item-mutation guard,
  or the cursor-regression guard tripped (PRD §18.6). `news.json`,
  `news-states.json`, and `collection-cursors.json` are left exactly as
  they were; only `collection-status.json` was updated with the specific
  guard, the observed value, and the threshold. This is what the
  main-page alert will show as red. A guard rejection is not this
  Skill's call to override — `--allow-large-change` (which waives only
  the volume guard) is a deliberate human decision, never something to
  add on your own judgment.
- **Diverged branch** — the local `data` branch worktree couldn't be
  fast-forwarded or rebased onto the remote tip without a conflict. This
  almost always means `news-states.json` changed on both sides. Nothing
  was discarded; report the message, which names the worktree path to
  resolve manually.
- **Push rejected twice** — the automatic rebase-and-retry (PRD §16) was
  attempted once and still failed. Local commits are untouched. Report
  the message; do not attempt a second retry or a force push yourself.

## Escape hatch

`pnpm agy:collect-news --allow-large-change` waives only the volume
guard, never the deletion or cursor-regression guards. Only pass this
when the user has explicitly asked for it — recovering from an outage or
running a source's first full sync are the PRD's stated legitimate uses
(PRD §18.6). Never add it by default or because a run happened to get
rejected.
