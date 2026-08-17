# User manual

Everything you need to run Easy Radar day to day: starting the app,
collecting news, reading and acting on items, the branch model, and
recovering when something goes wrong. This document is self-contained —
it doesn't assume you've read any chat history or design discussion.

For adding or maintaining source adapters, see
[`collector-development.md`](collector-development.md). For the full
list of `Reference only` sources, see
[`reference-sources.md`](reference-sources.md).

## Prerequisites and installation

- Node.js 24 LTS
- `pnpm`
- `git`
- An authenticated `gh` CLI (`gh auth status` should succeed) — Easy
  Radar uses `git`/`gh` directly, never a hosted API client, for every
  branch and push operation

```bash
git clone <this repository>
cd easy-radar
pnpm install
```

## Starting the app

```bash
pnpm start
```

This is the one command that gets you a running app. Before it opens
anything, it:

1. Syncs `.data/` — a second git worktree, checked out on the `data`
   branch, that lives alongside your normal `main`-branch working tree
   (see [The branch model](#the-branch-model-main-vs-data) below). On a
   fresh clone `.data/` doesn't exist yet; `pnpm start` creates it. On
   every subsequent run, it fetches and fast-forwards `.data/` onto the
   remote `data` branch, so **anything a cloud collection run committed
   is visible in the app immediately, with no manual `git pull`, merge,
   or approval on your part.**
2. Builds the frontend.
3. Starts the local Express server (bound to `127.0.0.1` only — Easy
   Radar is never exposed to your network) and opens the app in your
   browser.

**`pnpm start` never collects news.** Opening the app and collecting are
two separate operations — see [Collecting news](#collecting-news) below.

If your network is unavailable when you run `pnpm start`, the sync step
is skipped (not failed) and the app starts on whatever data was already
in `.data/` locally; the main-page status alert reflects staleness
normally in that case (see
[Collection status](#collection-status-invalid-sources-and-change-guard-rejections)).

If `.data/` has diverged from the remote in a way that can't be
fast-forwarded, or has local uncommitted reading-state changes an
automatic merge would overwrite, startup **fails closed**: it prints an
explanation and exits rather than discarding anything. See
[Recovering from a bad automated change](#recovering-from-a-bad-automated-change)
if this happens.

Press `Ctrl+C` to stop; both the server and the sync are shut down
cleanly.

## Scheduled cloud collection

By design, **you don't need to do anything for news to stay current.**
A GitHub Actions workflow runs the same deterministic collector once a
day and pushes straight to the `data` branch; `pnpm start`'s sync step
(above) means whatever it collected is already there the next time you
open the app — no manual pull, merge, or approval.

**Status in this checkout: not yet built.** The scheduled workflow file
doesn't exist here yet, so until it lands, get the same result by
running [manual collection](#collecting-news) yourself — `pnpm collect`
whenever you want fresh items. `pnpm start` will show whatever is on the
`data` branch either way, local or (once the workflow exists) cloud.

## Triggering a collection run on demand

**Not yet available in this checkout** — there is currently no
`gh workflow run` command or GitHub UI button for this, because the
underlying cloud workflow doesn't exist yet (see above). In the
meantime, run collection directly from your own machine:

## Collecting news

Two equivalent ways to run the same deterministic collector — pick
whichever fits how you work:

### Direct manual collection

```bash
pnpm collect
```

Fetches every `active` source in `config/sources/`, deduplicates,
classifies, and writes `data/news.json`, `data/news-states.json`,
`data/collection-cursors.json`, and `data/collection-status.json` inside
`.data/`. Prints a terminal summary of succeeded / failed / planned /
added counts and does **not** commit or push anything by itself — the
files are left as local, uncommitted changes in the `.data/` worktree
for you to review with `git -C .data status` and `git -C .data diff`
before committing.

### Collection through the AGY Skill

```bash
pnpm agy:collect-news
```

The same underlying pipeline as `pnpm collect`, orchestrated by the
`collect-news` AGY Skill (`.agents/skills/collect-news/SKILL.md`) — it
additionally commits and pushes the result to the `data` branch when
collection succeeds, and relays the same terminal summary verbatim. The
Skill never reads `data/news.json` itself or makes any judgment call
about which items matter; it only runs the deterministic pipeline and
reports what happened.

### The volume-guard escape hatch

Both commands accept `--allow-large-change`, which waives only the
**volume guard** (more than 200 items added in one run — see
[Change-guard rejections](#collection-status-invalid-sources-and-change-guard-rejections)).
It never waives the deletion guard or the cursor-regression guard. Pass
it deliberately, only for its two legitimate uses:

- Recovering from an outage, where a genuine backlog of real items is
  expected.
- A source's very first sync (its `initialSyncFrom` cutoff), which can
  legitimately produce more than a normal day's worth of items.

```bash
pnpm collect --allow-large-change
pnpm agy:collect-news --allow-large-change
```

Never pass this reflexively just because a run got rejected — read the
rejection reason first (it's specific: which guard, the observed value,
and the threshold).

## Main page and Sources page

The **Main page** (`/`) is where you read: a collection status alert at
the top, category tabs, an unread/read/all state filter, the list of
news cards for the selected category and filter, and pagination when
there's more than one page. Category, state, and page are all part of
the URL, so a link to a specific view is shareable and survives a
reload.

The **Sources page** (`/sources`) is read-only — every category, always,
with each source's coverage counts and its `Active` / `Failing` /
`Planned` status, last-success and last-attempt timestamps, and (for a
failing source) the specific failure reason. `Reference only` sources
are listed too, always labeled `Not collected` and excluded from
coverage math. There is deliberately no add/edit/delete/disable control
anywhere on this page — source changes are a reviewed code change to
`config/sources/`, not a page action.

## Reading-state actions

Each news card is a link to the original item (opens in a new tab) plus
two actions:

- **Mark as read / Mark as unread** — toggles immediately, no
  confirmation.
- **Ignore** — opens a confirmation dialog first, since it's the one
  action that removes the item from your active list rather than just
  relabeling it. Cancelling is a no-op; confirming removes it. An
  ignored item won't reappear even if it's collected again.

None of these actions commit or push anything by themselves — they only
update local state and mark it as having uncommitted changes (see
`Finish Reading` below). If you close the tab or navigate away with
uncommitted changes pending, the browser asks you to confirm first.

## Finish Reading

A fixed button in the bottom-right corner of the Main page. Click it to
commit and push everything you've marked read/unread/ignored since the
last successful `Finish Reading` (or since the app started) to the
`data` branch:

- **Success, something to push** — "Your reading state was committed
  and pushed."
- **Success, nothing pending** — "Nothing to push — you're already up
  to date." (still a success, just a no-op)
- **Failure** — reported inline, in the same place, with the server's
  actual reason (an invalid local state, a rebase conflict, or a push
  that was rejected after a retry). The session stays exactly where it
  is either way — **there is no pull request and no redirect.** A
  failure never discards or resets your local reading-state changes;
  they stay pending until you resolve whatever the message describes and
  try again.

## The branch model

- **`main`** — code, configuration, and documentation. Your normal
  working tree stays on `main` at all times; reading news never requires
  switching branches yourself.
- **`data`** — `data/*.json` only, no code. Checked out in a *second*
  working tree at `.data/` (a git worktree, not a branch switch in your
  main checkout), because `data` carries no code and checking it out
  directly in your main tree would remove the application from disk.
  `.data/` is gitignored on `main` and never shows up in `git status`
  there.

### Recovering from a bad automated change

If an automated collection run (local or cloud) ever writes something
you need to undo, recovery is a plain `git reset` **scoped to the `data`
branch only** — `main` is never touched and never needs to be:

```bash
cd .data
git log --oneline          # find the last good commit
git reset --hard <good-commit-sha>
git push --force-with-lease origin data
cd ..
pnpm start                  # re-sync your local .data/ (it's already there, so this is a no-op fast-forward)
```

This is a manual, deliberate operator action — nothing in Easy Radar
ever runs a `data`-branch reset automatically. Because change guards
already reject most bad writes before they land (see below), you should
rarely need this; when you do, the fix is always this same three-line
recovery, never a `main`-branch operation.

## Holiday / long-gap recovery

If you don't run collection (locally or via a future cloud schedule) for
an extended period, each source's own cursor and gap-recovery logic
brings it back up to date on the next run — you don't need to do
anything special for a normal gap of days to a couple of weeks.

For a genuinely large gap (or a source's very first sync), the number of
items a catch-up run adds can legitimately exceed the 200-item volume
guard. That's exactly what the `--allow-large-change` escape hatch
(above) is for — pass it once, deliberately, to let that one run
through: `pnpm collect --allow-large-change` or
`pnpm agy:collect-news --allow-large-change`.

## Collection status, invalid sources, and change-guard rejections

The Main page's status alert is your primary signal for whether
collection is healthy, ordered by severity:

- **Red** — at least one source is currently `Failing`, or the last run
  was rejected outright. Never dismissable.
- **Orange** — at least one source is `Planned` (known-not-yet-collected)
  or the data is stale (no successful run in the last 36 hours). Never
  dismissable.
- **Green** — everything is collecting successfully. Compact, shows
  coverage and the last collection time.

Clicking through takes you to the Sources page, deep-linked to the
affected category or source.

A rejected run is reported with a specific reason, never a bare
failure:

| Rejection | What it means |
|---|---|
| Config invalid | A source in `config/sources/` has a duplicate id, an invalid category, or references an adapter that doesn't exist. Nothing was fetched; nothing changed. Fix requires a reviewed code change to `config/sources/`, not a rerun. |
| Volume guard | More than 200 items were added in one run. See the escape hatch above if this is a legitimate backlog. |
| Active-item mutation | Something tried to modify or delete an existing active item outside the normal read/unread/ignore flow — item metadata is append-only by design, so this always indicates a bug, never a legitimate case to override. |
| Cursor regression | A source's `collection-cursors.json` timestamp moved backward, which would otherwise cause a full re-import. |

Whichever guard trips, `news.json`, `news-states.json`, and
`collection-cursors.json` are left completely untouched — only
`collection-status.json` is updated with the specific guard, the
observed value, and the threshold, which is what the red alert
surfaces. A single failing source (a broken feed, a changed page
structure) never blocks the others — it's isolated, marked `Failing` on
the Sources page with its specific error, and the rest of the run
proceeds normally.

## Common commands

```bash
pnpm start                                # sync .data/, then start the local app
pnpm collect                              # run collection, don't commit/push
pnpm collect --allow-large-change         # ...waiving only the volume guard
pnpm agy:collect-news                     # collect, then commit + push to data
pnpm agy:collect-news --allow-large-change
pnpm cleanup                              # standalone tombstone/expiry cleanup pass
pnpm validate:data                        # validate data/*.json invariants directly
```

Development/code commands (`pnpm format`, `pnpm lint`, `pnpm typecheck`,
`pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm validate`) are covered
in the [README](../README.md#development).

## Troubleshooting

- **`pnpm start` fails with a divergence error.** See
  [Recovering from a bad automated change](#recovering-from-a-bad-automated-change) —
  don't force-push over it or delete `.data/` without checking `git
  status` there first; you may have unpushed reading-state changes.
- **A `Finish Reading` click reports a rebase conflict.** Someone else
  (or a cloud run) pushed to `data` in the meantime. Your local changes
  are untouched — resolve the conflict in `.data/` the same way you
  would for `main` (`git -C .data status`, fix the conflicting file,
  `git -C .data add`, `git -C .data commit`), or simply click `Finish
  Reading` again once the conflicting change is one you're fine
  rebasing onto.
- **A source shows `Planned` forever on the Sources page.** This is
  expected, not a bug — it means the source doesn't yet have a working
  adapter/URL, and the Sources page will say so rather than silently
  pretending it's covered. See
  [`collector-development.md`](collector-development.md) to add one.
- **`gh` commands fail with an auth error.** Run `gh auth status`; if
  it's not authenticated, `gh auth login` before retrying `pnpm start`,
  `pnpm collect`, or `pnpm agy:collect-news` — all of them shell out to
  `git`/`gh` directly and need a working credential.
