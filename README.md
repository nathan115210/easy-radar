# Easy Radar

Easy Radar is a local-first personal news reader that gathers every eligible item from an explicit, approved source list and displays the results in one place. It replaces repeatedly checking X, official blogs, changelogs, GitHub Releases, newsletters, and engineering sites for updates.

Easy Radar does not decide what you should read. It collects every eligible item from each approved source, assigns deterministic metadata, and lets you choose.

## Why

Keeping up with AI, frontend, mobile, architecture, DevOps, testing, and developer tooling currently means manually visiting many sources. That creates coverage gaps during holidays or busy periods and encourages endless scrolling. Easy Radar makes source coverage explicit, keeps failures visible, and never uses an AI system to silently filter the feed.

## Product principles

- **Explicit source coverage** — the collector monitors only a reviewed source inventory. Sources are never silently discovered, removed, disabled, or replaced.
- **Official sources first** — official blogs, changelogs, release feeds, APIs, GitHub Releases, and proposal repositories are preferred. Aggregators and newsletters supplement them; they don't replace them.
- **Visibility over automated judgment** — every eligible item from an approved source is collected. No LLM decides whether an item is interesting.
- **Low-maintenance architecture** — deterministic adapters over a generic scraping framework, database, admin UI, or agent-driven website interpretation.

## Categories

| ID | Category |
|---|---|
| `web-core` | Web Core & Frontend Ecosystem |
| `ai-engineering` | AI Engineering & Developer Workflows |
| `mobile-development` | Mobile Development |
| `software-architecture` | Software Design & System Architecture |
| `devops-cloud` | DevOps, Cloud & Infrastructure |
| `testing-quality` | Testing & Release Quality |
| `developer-tooling` | Developer Tooling, Runtimes & Web Standards |

## How it works

1. A deterministic TypeScript collector fetches from RSS/Atom/JSON feeds, GitHub APIs, official APIs, or a small stable website adapter — in that priority order — for every source in `config/sources/`.
2. Collected entries are normalized into a validated `NewsItem` schema and written to `data/news.json`; reading state is tracked separately in `data/news-states.json` so collector runs never clobber your read/unread/ignored state.
3. The local app (React + Express, bound to `127.0.0.1`) displays category tabs, state filters, and news cards, plus a read-only Sources page showing each source's status (`Active`, `Failing`, `Planned`) and last collection time.
4. A collection status alert on the Main page turns red on failures, orange on incomplete/stale coverage, and green when everything succeeds — it can't be dismissed away, only resolved.
5. `Finish reading` commits your reading-state changes through a manually reviewed GitHub PR — the durable sync and review boundary. There is no database or hosted backend.

## Non-goals for v1

- No Nathan Brain integration
- No cloud or scheduled collector
- No AI summaries, ranking, recommendations, or semantic filtering
- No source-management UI, database, hosted backend, or accounts
- No automatic PR merge

## Tech stack

```text
Frontend
├── React + TypeScript + Vite
├── TanStack Router
├── TanStack Query
└── Mantine

Local backend
├── Express
└── Zod

Collector
├── Node native fetch
├── Feedsmith
├── Cheerio
└── gh api

Tooling
├── pnpm
├── Node.js 24 LTS + ESM
├── Prettier
├── ESLint
└── TypeScript strict mode
```

All executable source and tests are TypeScript/TSX. The app uses one fixed theme derived from an approved five-color palette, targeting desktop/laptop use with functional tablet-width layouts.

## Getting started

Prerequisites: Node.js 24 LTS, pnpm, `git`, and an authenticated `gh` CLI.

```bash
pnpm install

pnpm start    # start the local app and open it in the browser
pnpm collect  # run deterministic collection (no AGY required)
```

`pnpm start` does not automatically collect sources — opening the app and collecting news are separate operations. Collection can also be run through the AGY CLI's local `collect-news` Skill, which orchestrates the same deterministic scripts.

See [`docs/user-manual.md`](docs/user-manual.md) for the full workflow: manual collection, reading-state actions, Finish Reading and PR review, holiday/long-gap recovery, and troubleshooting. See [`docs/collector-development.md`](docs/collector-development.md) for adding or maintaining source adapters.

## Development

```bash
pnpm format     # Prettier
pnpm lint       # ESLint
pnpm typecheck  # TypeScript, strict, noEmit
pnpm test       # Vitest
pnpm test:e2e   # Playwright smoke tests
pnpm build
pnpm validate   # format check + lint + typecheck + test + build
```

### Continuous integration and cost

[`.github/workflows/pr-build.yml`](.github/workflows/pr-build.yml) runs install, lint, typecheck, tests, and build on every code pull request targeting `main`. It is read-only (`permissions: contents: read`) and cannot push to `main`; there are no data pull requests (`data` carries no code), so data validation is not a PR check — it runs inline in the collection pipeline before the write instead. Playwright is not part of routine PR validation; it stays an explicit, opt-in command (`pnpm test:e2e`).

This repository is public, so GitHub Actions minutes — including the scheduled cloud collection workflow — are free and unlimited. The account's Actions spending limit should remain at **$0** with paid usage disabled; this guard exists solely to prevent the account from ever being charged if a private repository or a paid runner were introduced later, not to restrict scheduled collection here. Verify it at [github.com/settings/billing](https://github.com/settings/billing).

[`.github/dependabot.yml`](.github/dependabot.yml) opens grouped monthly PRs (patch/minor only; majors are left ungrouped for explicit review) for production dependencies, development dependencies, and GitHub Actions. Auto-merge is not configured anywhere in this repository. Dependabot only ever targets `main` — the `data` branch has no `package.json` or workflow files for it to touch.

## License

[MIT](LICENSE) © 2026 Hongyu Zhao
