# v1 acceptance review

An audit of PRD §20's acceptance checklist and §3's non-goals against the
actual repository state, as of this review. Per PRD §19, **v1 is declared
complete only once every approved collectable source reaches `Active`** —
that condition alone is not yet met, so this review's conclusion is: **v1
is not yet complete.** The sections below record exactly what is and
isn't done, so the remaining gap is a short, concrete list rather than a
vague "almost there."

This document is a snapshot, not a live status page — re-run this audit
before actually declaring v1 complete, since several of the "done" items
below assume in-flight pull requests land as described.

## PRD §20 acceptance checklist

| # | Criterion | Status | Notes |
|---|---|---|---|
| 1 | All seven categories appear as Main-page tabs and Sources-page groups | ✅ Done | `CategorySchema` (7 values), `CATEGORY_LABELS`, `NewsPage`/`SourcesPage` all render every category unconditionally. |
| 2 | All approved collectable sources are represented by executable config and reach `Active` | ❌ Not yet | `web-core` is populated and merged (#36). `ai-engineering`, `mobile-development`, `software-architecture`, `devops-cloud`, `testing-quality`, `developer-tooling` are populated in open PRs (#37-#42) as of this review, each with some sources genuinely `planned` (unverifiable feed/API, or an adapter that exists but isn't wired into `scripts/collect/default-registry.ts` yet — see the "Remaining `Planned` sources" section below). This is the actual v1 blocker. |
| 3 | Reference sources are visible but never collected or counted in coverage | ✅ Done (mechanism); ⏳ content in progress | `ReferenceSourceRow` always renders `Not collected`; `getSourcesGroupedByCategory` never includes `referenceSources` in coverage math. `docs/reference-sources.md` is being populated alongside #37-#42. |
| 4 | Every eligible newly collected item appears once with valid deterministic metadata and initial `unread` state | ✅ Done | `computeDeterministicId`, dedup (`dedup.ts`), and `syncNewsStatesWithItems` are implemented and covered by the Vitest suite; verified at the unit/integration level, not yet by a full production collection run (none has happened — see #45 below). |
| 5 | One source failure does not block successful sources | ✅ Done | The collector engine isolates each source's fetch/parse; a thrown error marks that source `Failing` and the run continues. Covered by `scripts/collect` tests. |
| 6 | Config errors stop collection before writes | ✅ Done | `combineAndValidate` (`config/sources/index.ts`) throws on a duplicate id or category mismatch before any source is fetched. |
| 7 | Runtime source failures are obvious in the terminal, the Main page, the Sources page, and the Actions run summary | ⏳ Partial | Terminal (`pnpm collect`'s summary), Main page (`CollectionStatusAlert`), and Sources page (`Failing` badge + reason) are all done. The Actions run summary can't exist yet — there is no cloud workflow (#45, open, not part of this range). |
| 8 | No failing source is silently removed or disabled | ✅ Done | No code path auto-disables or removes a source from config; `Failing` is purely a status label. |
| 9 | Reading state survives collector runs and page reloads | ✅ Done | `news-states.json` is a separate file collection only syncs (never overwrites existing entries); covered by `news-states.test.ts` and the RTL/Playwright suites (#31, #32). |
| 10 | Ignore confirmation and cleanup rules work as specified | ✅ Done | Confirmed via `NewsCard`'s modal flow (#31) and `scripts/cleanup` (tombstone pruning, ignored-item re-add scrubbing, read-item expiry), all tested. |
| 11 | `Finish reading` commits and pushes reading state to the `data` branch and preserves changes on failure | ✅ Done | `server/finish-reading.test.ts` covers success, no-op, rebase-conflict, and invalid-state paths; a failure never touches `news-states.json`. |
| 12 | The system works without paid services or AI-driven collection | ✅ Done | `pnpm collect` runs standalone, no AI/network dependency beyond the sources themselves; Actions minutes are free on this public repo (confirmed in #33). |
| 13 | Scheduled cloud collection runs daily and commits to the `data` branch with no user action | ❌ Not built | No `.github/workflows/collect.yml` exists anywhere in this repository's history. This is #45 (open, not part of this review's assigned range). |
| 14 | Opening the local app shows data from the most recent successful cloud run, without pulling, merging, or approving anything | ⏳ Mechanism done, unexercised | `pnpm start`'s fast-forward-only sync (#22) is implemented and tested, but there has never been a cloud run to sync from — depends on #45. |
| 15 | Local, cron-triggered, and AI-triggered collection produce identical output because all three execute the same workflow | ⏳ Partial | `pnpm collect` and `pnpm agy:collect-news` already share one `runCollectPipeline` call with one `createDefaultAdapterRegistry()` — confirmed by reading both CLI entry points. The cron/cloud path itself doesn't exist yet (#45), so this can't be verified end-to-end, only at the shared-code level. |
| 16 | A run that fails validation or trips a change guard writes no data files, publishes its status, and surfaces a red alert with a precise reason | ✅ Done | Covered by `scripts/collect/guards.test.ts` and the `finish-reading` invalid-state test; `collection-status.json` is the only file touched on rejection. |
| 17 | No automated process ever writes to `main` | ✅ Done | `.github/workflows/pr-build.yml` (#33) is `permissions: contents: read`; `finishDataBranchWrite`/collection code only ever targets the `data` branch. No workflow file in the repo grants `contents: write`. |
| 18 | An AI-triggered run's token cost does not scale with source count or data size, and the AI never reads `data/news.json` | ✅ Done at the design/contract level | `.agents/skills/collect-news/SKILL.md` explicitly forbids reading `data/news.json` and restricts the Skill to running `pnpm agy:collect-news` and relaying its stdout — no source-count-dependent reasoning happens in the Skill itself. The formal cloud "AI executor contract" (#46, open, not part of this range) hasn't been written yet for the cloud path specifically. |
| 19 | Resetting the `data` branch to a prior commit fully recovers from a bad automated data change | ✅ Done | `scripts/git-workflow/reset-data-branch.ts` (branch-guarded `git reset --hard`), documented for operators in `docs/user-manual.md` (#35). |
| 20 | `pnpm start` synchronizes the `data` branch and opens a functional local app without triggering collection | ✅ Done | Confirmed by reading `scripts/start/cli.ts` — it syncs, builds, and serves; it never calls anything in `scripts/collect`. |
| 21 | `pnpm collect` runs the same deterministic collector used by the AGY Skill | ✅ Done | Same as #15 above — both call `runCollectPipeline` with `createDefaultAdapterRegistry()`. |
| 22 | All executable source and test files are TypeScript/TSX | ✅ Done | `find . -name "*.js" -o -name "*.jsx"` (excluding `node_modules`/`dist`) returns nothing. |
| 23 | The app uses Mantine as its only component library and one fixed theme derived from the five approved palette seeds | ✅ Done | No other UI library appears in `package.json`; `src/theme.ts` defines the fixed theme from the five approved seeds (confirmed by reading it). |
| 24 | The English User Manual explains the complete daily, collection, branch, holiday, and troubleshooting workflows without relying on chat history | ⏳ Mostly done | `docs/user-manual.md` (#35, open PR as of this review) covers every listed topic; its cloud-collection and on-demand-trigger sections are explicit that those features aren't built yet rather than fabricating instructions for them — will need a follow-up edit once #45/#46 land. |

## v1 non-goals held (PRD §3)

| Non-goal | Status | Notes |
|---|---|---|
| No Nathan Brain integration; no X feed collection | ✅ Held | Neither appears anywhere in the codebase. |
| No collection logic differs between local and cloud execution | ✅ Held (by construction) | Single shared pipeline/registry, as above; there is no cloud-specific collection code to diverge, because there is no cloud collection code at all yet. |
| No AI-driven collection: AI triggers and reports only, never fetches sources or produces NewsItems | ✅ Held | The AGY Skill is a thin trigger-and-relay wrapper (see #18 above); all fetching/parsing/classification is deterministic TypeScript. |
| No AI summaries, semantic ranking, recommendations, or AI filtering | ✅ Held | No such code exists anywhere in `src/`, `server/`, or `scripts/`. |
| No source management UI, no database, no hosted backend, no accounts/auth | ✅ Held | Sources page is read-only by design (no add/edit/delete control); storage is flat JSON files; no auth code anywhere. |
| No self-built notification system; only GitHub's built-in Actions failure email is relied upon | ⏳ Held in code; unverified in repo settings | No email/webhook/Slack code exists. Whether the *repository setting* for Actions-failure email is actually enabled is a manual GitHub configuration check, not a code change — tracked separately by #47 (open, not part of this range). |
| No data pull requests, and no automated change reached `main` | ✅ Held | Confirmed above (#17); there has never been a PR from the `data` branch. |
| No paid cloud services; all execution stayed inside free public-repository Actions usage | ✅ Held | Repository confirmed public (`gh api repos/.../easy-radar` → `"visibility": "public"`); documented in #33. |
| No Swift / native iOS coverage | ✅ Held | The Mobile Development onboarding (#38, open PR as of this review) explicitly excludes Swift, native iOS, and iOS Dev Weekly per the issue's own "Deferred" list. |

## Remaining `Planned` sources

As of this review, the per-category source-onboarding work (#37-#42) is
in open, unmerged pull requests. Each PR's own description states its
exact `active`/`planned` counts and the reason for every `planned`
source (an unverifiable feed/API during onboarding, or — for a small,
known set — an adapter that's implemented (`react-native-proposals`,
`tc39-proposal-lifecycle`) but not yet registered in
`scripts/collect/default-registry.ts`). **Re-run this section once those
PRs are merged**, consolidating the final list here with an explicit
decision (activate, defer, or remove) for each, per PRD §19's "declare
v1 complete only when every approved collectable source is `Active`."

The one concrete, cross-cutting gap already visible from the source
work: wiring `react-rfc`, `react-native-proposals`, and
`tc39-proposal-lifecycle` into `createDefaultAdapterRegistry()` is real,
scoped follow-up work — each adapter already has a full implementation
and tests, they're just never called from the one registry every real
entry point uses.

## Threshold review (#44)

**Not yet reviewed.** PRD §22/§23 call for reviewing the change-guard
thresholds (the 200-item volume guard, in particular) against several
weeks of real collection data. No real production collection has run
yet — the only source category live in `main` is `web-core`, and cloud
collection (#45) doesn't exist — so there is no real data to review
against. This is issue #44 (open, not part of this review's assigned
range) and should be revisited only after cloud collection has been
running across the full source set for a few weeks.

## Summary

**v1 is not yet complete.** The concrete blockers, in dependency order:

1. Merge #37-#42 (source onboarding) and settle the remaining `Planned`
   sources per the section above.
2. Build #45 (scheduled cloud collection workflow) and #46 (AI executor
   contract) — several checklist items above are structurally ready but
   unexercised without them.
3. Verify #47's repository settings (branch protection, failure email,
   executor permissions) are actually configured, not just documented.
4. Run #48's unattended cloud collection checkpoint once #45 exists.
5. Revisit #44's threshold review after a few weeks of real cloud data.
6. Re-run this checklist end to end and update this document before
   declaring v1 complete.

Everything gated only on local, already-implemented mechanics — the
collector engine, the Express API, the frontend, `Finish reading`, data
recovery, and the `pnpm start`/`pnpm collect` commands themselves — is
done and tested today.
