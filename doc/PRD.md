# PRD: Easy Radar

**Status:** Product and architecture decisions complete for v1  
**Date:** 2026-08-13  
**Revision:** 2026-08-17 — cloud execution model decided; supersedes the earlier "cloud deferred" position  
**Product type:** Local-first personal news reader with cloud-executed deterministic collection

## 1. Product summary

Easy Radar gives one person a complete, readable view of recent items from an explicit, approved source list. It exists to replace repeated visits to X, official blogs, changelogs, GitHub Releases, newsletters, and engineering sites.

The product does not decide what the user should read. It collects every eligible item from each approved source, assigns deterministic metadata, and lets the user choose.

Version 1 is a standalone project. It does not connect to Nathan Brain, including read-only display or bookmark import.

## 2. Goals

- Make all eligible news from the approved source inventory visible in one place.
- Treat official sources as the primary and most authoritative sources.
- Keep collection deterministic, inspectable, and independent of AI token usage.
- Make source failures impossible to miss without creating a complicated monitoring product.
- Let the user track `unread`, `read`, and `ignored` items directly from the app.
- Keep the whole system lightweight, zero-cost, and easy to maintain.
- Keep news current without requiring the user to run, trigger, or approve anything. Opening the local app is the only required daily action.
- Use Git and a dedicated long-lived `data` branch as the durable synchronization boundary.
- Keep AI involvement optional, constant-cost, and confined to triggering deterministic execution.

## 3. Non-goals for v1

- No Nathan Brain integration.
- No collection logic that differs between local and cloud execution. Both paths run the same deterministic collector from the same commit.
- No AI-driven collection. AI may trigger and report a collection run; it never fetches sources, judges relevance, or manufactures NewsItems.
- No X feed collection unless an explicit approved source is added later.
- No AI summaries, semantic ranking, recommendations, or AI filtering.
- No source management UI.
- No database, hosted backend, accounts, or authentication.
- No self-built notification system. GitHub's built-in Actions failure email is relied upon and does not count as one.
- No data pull requests. Collected data and reading state commit directly to the `data` branch.
- No automated change ever reaches `main`. `main` is modified only by reviewed code changes.
- No paid cloud services. Cloud execution must remain inside free public-repository GitHub Actions usage.
- No Swift or native iOS source coverage in the initial scope.

## 4. Product principles

### 4.1 Explicit source coverage

The collector monitors only a reviewed source inventory. A source is never silently discovered, removed, disabled, or replaced.

### 4.2 Official sources first

Official blogs, changelogs, release feeds, APIs, GitHub Releases, and proposal repositories are preferred. Aggregators and newsletters supplement official sources; they do not replace them.

### 4.3 Visibility over automated judgment

Every eligible item from an approved source is collected. The collector must not use an LLM to decide whether an item is interesting.

### 4.4 Low-maintenance architecture

Simple configuration and deterministic adapters are preferred over a generic scraping framework, database, admin UI, or agent-driven website interpretation.

## 5. Categories

Each source belongs to exactly one fixed category. Cross-topic relationships are represented through tags, not duplicate category ownership.

| ID | Category |
|---|---|
| `web-core` | Web Core & Frontend Ecosystem |
| `ai-engineering` | AI Engineering & Developer Workflows |
| `mobile-development` | Mobile Development |
| `software-architecture` | Software Design & System Architecture |
| `devops-cloud` | DevOps, Cloud & Infrastructure |
| `testing-quality` | Testing & Release Quality |
| `developer-tooling` | Developer Tooling, Runtimes & Web Standards |

## 6. User experience

### 6.1 Main page

The main page contains, in order:

1. Collection status alert.
2. Inline category tabs, with `Web Core & Frontend Ecosystem` initially selected. There is no `All categories` tab.
3. Inline state filter: `All (152) | Unread (128) | Read (24)`. `All` is first and selected by default.
4. News cards for the selected category and state.
5. Pagination, 50 items per page.
6. A fixed `Finish reading` button in the bottom-right corner.

Items are sorted newest first.

### 6.2 News card

Each card displays:

- Heading
- Tags
- Category
- State actions

The full card is an anchor to the original item and opens in a new tab. State buttons stop link navigation.

Available actions:

- Mark as `read`
- Mark as `unread`
- Mark as `ignored`

Selecting `ignored` requires a confirmation dialog because it triggers cleanup of the active item.

### 6.3 Finish reading

While the app is open, state changes are written through the local server to `data/news-states.json`.

`Finish reading`:

1. Validates the state and news data.
2. Fetches and rebases onto the remote `data` branch tip.
3. Commits state changes.
4. Pushes to the `data` branch.
5. Reports success inline in the app.

There is no pull request and no redirect to GitHub. The session ends in the app.

If the rebase cannot be applied automatically, the operation fails closed: local changes are preserved, nothing is pushed, and the app shows the conflict and asks the user to resolve it. If there are uncommitted state changes and the user closes or reloads the page, the app uses the native `beforeunload` confirmation. If the Git operation fails, the app keeps the local changes and shows the error; it must not pretend the session finished.

### 6.4 Sources page

The app includes a separate, read-only Sources page. It reads the same TypeScript source configuration used by the collector, preventing UI/config drift.

Sources are grouped by category. Each category shows coverage counts and two sections:

- `Monitored sources`
- `Reference only`

Each monitored source displays:

- Source name and official link
- Adapter/source type
- Status: `Active`, `Failing`, or `Planned`
- Last successful collection time
- Last attempted collection time
- Failure reason, when applicable

Reference-only sources show `Not collected` and do not count toward coverage.

The page is not an admin dashboard. Adding, changing, repairing, replacing, or removing a source is done through TypeScript config and reviewed code changes.

## 7. Collection status and failure visibility

### 7.1 Main-page status alert

The alert is displayed above category tabs and is deliberately eye-catching:

- **Red:** one or more `Failing` sources, invalid runtime collection results, or a change guard that rejected a collection run.
- **Orange:** no failures, but one or more sources remain `Planned`, or the last collection is stale.
- **Green:** all implemented sources succeeded; displayed as a compact success status.

Failure takes priority over planned/incomplete coverage. A collection is stale after 36 hours.

Because collection normally runs in the cloud, this alert is the user's primary failure channel. It reads `data/collection-status.json` from the `data` branch, so it reflects cloud runs, not only local ones. A rejected run is reported with its precise reason rather than surfacing later as generic staleness.

The alert shows:

- Status icon and concise title
- Coverage, such as `94 / 97 Active`
- Counts for `Failing` and `Planned`
- Last collection time
- `View sources` link, deep-linked to the affected source or category where possible

Failure and stale alerts cannot be permanently dismissed. They disappear only when the underlying state is healthy. The alert uses high contrast and `role="alert"`.

### 7.2 Invalid source classification

There are two failure classes:

1. **Config invalid:** duplicate ID, invalid category, missing required URL, unsupported adapter configuration, or schema error. Collection stops before fetching because the repository configuration is unsafe.
2. **Runtime failing:** HTTP error, timeout, rate limit, changed HTML structure, invalid response, parser failure, or equivalent source-specific issue. The affected source is isolated and all other sources continue.

### 7.3 Run reporting

Every collection run prints a concise summary with succeeded, failed, planned, and added counts, followed by source-level errors. The same summary is written to the GitHub Actions job summary for cloud runs, and is the only output an AI executor is permitted to read and relay.

There is no pull request description to report into. The durable reporting surfaces are:

| Surface | Reaches the user when | Covers |
|---|---|---|
| Main-page alert and Sources page | The user opens the local app | Failing sources, rejected runs, staleness |
| Actions job summary | The user chooses to look | Per-run coverage and failure detail |
| GitHub built-in Actions failure email | Pushed to the user | Sustained failure while the app is not opened |

The failure email is a GitHub account setting, not a component of this product. No notification code is written.

### 7.4 Source lifecycle safety

- A failing source is never automatically removed or disabled.
- A source remains `Failing` with a visible alert until repaired or explicitly removed by the user.
- Removal requires explicit user approval.
- An official URL migration requires a verified replacement and preserves source identity and collection cursor where appropriate.
- `Planned` means not yet implemented, not failed.
- `Reference only` sources never enter collection coverage calculations.

## 8. Data model

```ts
type Category =
  | "web-core"
  | "ai-engineering"
  | "mobile-development"
  | "software-architecture"
  | "devops-cloud"
  | "testing-quality"
  | "developer-tooling";

type NewsLabel =
  | "Release"
  | "Improvement"
  | "Breaking Change"
  | "Deprecation"
  | "Retired"
  | "RFC/Proposal"
  | "Security Advisory"
  | "Announcement"
  | "Engineering Article";

type DateBasis = "published" | "discovered";

type NewsItem = {
  id: string;
  sourceId: string;
  heading: string;
  label: NewsLabel;
  link: string;
  date: string; // YYYY-MM-DD
  dateBasis: DateBasis;
  category: Category;
  tags: string[];
};

type NewsState = {
  state: "unread" | "read" | "ignored";
  updatedAt: string;
  readAt?: string;
  ignoredAt?: string;
};

type NewsStatesFile = {
  schemaVersion: 1;
  items: Record<string, NewsState>;
};
```

Rules:

- A new item always starts as `unread`.
- `id` is a deterministic hash of the normalized deduplication key.
- `sourceId` supports diagnosis and source ownership.
- `category` comes from source config, never AI inference.
- `tags` are deterministic: static source tags plus trustworthy structured metadata when available.
- Labels are determined by adapter/event type, not an LLM.
- Existing active NewsItem metadata is append-only; ordinary collection does not rewrite it.

## 9. Storage

```text
data/
├── news.json
├── news-states.json
├── collection-cursors.json
└── collection-status.json
```

- `news.json` stores active NewsItems.
- `news-states.json` stores reading state separately so collector updates do not overwrite user state.
- `collection-cursors.json` stores per-source collection position and gap-recovery metadata.
- `collection-status.json` stores per-source diagnostic status for UI alerts and the Sources page.

All four files live on the `data` branch and are never present on `main`. Locally they are reached through the `.data/` worktree (§15.1), so their full path on disk is `.data/data/<file>`.

`collection-status.json` was originally an uncommitted local runtime artifact. Because collection now normally runs in the cloud, it is committed data: it is the only channel through which a cloud run reports its result to the local app. It remains operational state, not the authoritative news archive.

Collector synchronization is keyed by deterministic NewsItem ID. New IDs receive a new `unread` state entry; existing state entries are preserved.

Writer separation is deliberate but not absolute:

| File | Cloud collection | Local app |
|---|---|---|
| `news.json` | writes | reads |
| `collection-cursors.json` | writes | reads |
| `collection-status.json` | writes | reads |
| `news-states.json` | writes (cleanup only) | writes (reading state) |

`news-states.json` is the single file both writers touch, because cleanup must delete state entries alongside the items they describe. Conflicts are rare because the two writers effectively never run at the same time, and are handled by the fail-closed rules in §16.

## 10. Cleanup rules

- Marking an item `ignored` removes it from active `news.json` after confirmation.
- An ignored item leaves a 48-hour tombstone so the 36-hour collection overlap cannot immediately re-add it.
- A `read` item is deleted from both active news and state data after it is older than two calendar months.
- Unread items are retained.
- Cleanup is deterministic and runs as a step of the collection pipeline, immediately after collection and before validation, in whichever environment the pipeline executes.

Cleanup runs in the cloud pipeline because the user is no longer expected to run collection locally on a routine basis. Leaving cleanup on the local path would mean it effectively never executes.

## 11. Collector behavior

### 11.1 Adapter priority

Use the simplest stable interface available:

1. RSS, Atom, or JSON Feed
2. GitHub API
3. Official API
4. Generic HTML/JSON-LD extraction
5. Custom website adapter

Custom adapters are the last resort and require a small saved HTML fixture plus parser test.

### 11.2 Collection window and recovery

- Normal runs inspect the previous 36 hours.
- Collection cursors are maintained per source.
- Gap recovery starts from the latest known item/cursor for that source rather than blindly importing the source's entire history.
- Initial synchronization respects a configured `initialSyncFrom` cutoff date.
- A source failure is isolated; other sources continue.
- Collection uses bounded concurrency, timeouts, retries with backoff, and respectful rate limits.

### 11.3 Undated sources

- `dateBasis: "published"` is used when the source provides a trustworthy publication date.
- `dateBasis: "discovered"` is used for newly discovered undated content.
- During the initial baseline, existing undated URLs are recorded but not imported.
- Future new undated URLs use the discovery date.
- `Last-Modified` is not treated as a publication date.

### 11.4 Deduplication

- Normal items deduplicate by normalized canonical URL/source key.
- If several virtual sources find the same canonical URL, the most specific filtered source wins.
- Source filters may create virtual sources with independent category, cursor, and diagnostics.
- TC39 proposal lifecycle events are a deliberate exception: each new proposal, stage transition, or withdrawal is a separate NewsItem.

### 11.5 GitHub Releases

- Collect every stable release, including patch releases.
- Exclude draft and prerelease entries by default.
- Allow an explicit per-source override when prereleases are genuinely required.

### 11.6 Proposal sources

- React RFC: a new proposal PR creates an `RFC/Proposal` item.
- React Native discussions-and-proposals: only a new PR that adds a proposal file is collected. Ordinary issues, discussions, and meeting notes are excluded.
- TC39: a new proposal and each stage transition create separate items; withdrawal is `Retired`; wording/link-only changes are ignored.

## 12. Source configuration

```text
config/sources/
├── web-core.ts
├── ai-engineering.ts
├── mobile-development.ts
├── software-architecture.ts
├── devops-cloud.ts
├── testing-quality.ts
├── developer-tooling.ts
└── index.ts
```

The index combines configs and validates unique IDs. A normal RSS or GitHub source should be addable through config only. Exceptional sites use an adapter.

Representative monitored source configuration:

```ts
type SourceConfig = {
  id: string;
  name: string;
  category: Category;
  kind: "feed" | "github-release" | "github-event" | "api" | "website";
  url: string;
  adapter: string;
  initialSyncFrom: string;
  status: "active" | "failing" | "planned";
  filters?: Record<string, unknown>;
  releasePolicy?: {
    includePrerelease: boolean;
    includeDraft: false;
  };
  tags: string[];
};
```

General documentation that does not represent a chronological event stream is kept in `docs/reference-sources.md` and shown as `Reference only` on the Sources page.

## 13. Approved source inventory

The URLs below are product inputs. During implementation, redirects and canonical endpoints should be normalized without changing source intent.

### 13.1 Web Core & Frontend Ecosystem

Monitored:

- React Blog — https://react.dev/blog
- React stable releases — https://github.com/react/react/releases
- React RFC events — React RFC/proposal repository
- Overreacted — https://overreacted.io
- Next.js Blog — https://nextjs.org/blog
- Next.js stable releases — https://github.com/vercel/next.js/releases
- Vercel Blog, full feed — https://vercel.com/blog
- TanStack Portal/Blog — https://tanstack.com and https://tanstack.com/blog
- TanStack Query, Router, Table, Form, and Virtual stable releases
- TkDodo — https://tkdodo.eu/blog/
- TypeScript Blog — https://devblogs.microsoft.com/typescript/
- TypeScript stable releases — https://github.com/microsoft/TypeScript/releases
- MDN Blog — https://developer.mozilla.org/en-US/blog/
- JavaScript Weekly, one issue per item — https://javascriptweekly.com/issues
- web.dev Blog — https://web.dev/blog
- Chrome Developers Blog — https://developer.chrome.com/blog
- Addy Osmani — https://addyosmani.com/blog/
- SpeedCurve — https://speedcurve.com/blog/
- Turborepo Blog — https://turborepo.dev/blog
- Nx Blog — https://nx.dev/blog
- Can I Use news — https://caniuse.com/ciu/news
- This Week in React, one issue per item — https://thisweekinreact.com/newsletter
- Frontend Focus, one issue per item — https://frontendfoc.us/issues
- Module Federation Blog — https://module-federation.io/zh/blog/index.html
- Zustand stable releases
- ModernCSS.dev
- CSS Weekly, one issue per item
- WebKit Blog
- HTTP Archive
- Remix Blog
- React Router stable releases — https://github.com/remix-run/react-router/releases

Routing notes:

- Vite belongs to Developer Tooling.
- TC39 belongs to Developer Tooling.
- `This Week in React` remains in Web Core and is not duplicated in Mobile.

### 13.2 AI Engineering & Developer Workflows

Monitored:

- Claude Blog — https://claude.com/blog
- Anthropic News — https://www.anthropic.com/news
- Anthropic Engineering
- Claude Platform release notes
- Claude Code changelog and stable releases — https://github.com/anthropics/claude-code
- OpenAI News/Blog
- OpenAI API changelog
- OpenAI Cookbook — https://cookbook.openai.com
- OpenAI Codex changelog, Codex developer posts, and stable releases
- OpenAI Agents SDK for TypeScript releases
- Antigravity Blog — https://antigravity.google/blog
- Antigravity CLI stable releases
- Gemini API release notes
- GitHub AI & ML Blog — https://github.blog/category/ai-and-ml/
- GitHub Copilot changelog virtual source
- Model Context Protocol Blog/spec releases — https://modelcontextprotocol.io
- MCP TypeScript SDK releases — https://github.com/modelcontextprotocol
- Cursor Blog — https://www.cursor.com/blog
- Vercel AI SDK blog posts and stable releases
- LangChain Blog — https://blog.langchain.dev
- LangChain JS and LangGraph JS stable releases
- LlamaIndex Blog — https://www.llamaindex.ai/blog
- Pinecone Learn — https://www.pinecone.io/learn/
- Weaviate Blog
- Qdrant Blog — https://qdrant.tech/blog/
- Ollama Blog and stable releases — https://ollama.com/blog
- LM Studio updates — https://lmstudio.ai
- Hugging Face Blog — https://huggingface.co/blog
- CrewAI Blog — https://www.crewai.com/blog
- Simon Willison — https://simonwillison.net
- Eugene Yan — https://eugeneyan.com
- Hamel Husain — https://hamel.dev
- Lil'Log — https://lilianweng.github.io
- fast.ai Blog
- Latent Space — https://www.latent.space
- Jason Liu/Instructor — https://jxnl.co
- AI News, one issue per item — https://buttondown.com/ainews
- Mastra official updates
- assistant-ui official updates
- CopilotKit official updates

Reference only:

- Anthropic/Claude documentation
- OpenAI platform documentation
- Vercel AI SDK documentation
- LangChain and LangGraph documentation
- LlamaIndex documentation
- Ollama and LM Studio documentation
- Vector database documentation for Pinecone, Weaviate, Qdrant, Chroma, and pgvector
- AutoGen documentation — https://microsoft.github.io/autogen/
- Prompt Engineering Guide — https://www.promptingguide.ai

Python-only package release streams and generic provider SDK release streams are excluded from v1; relevant official blogs and API changelogs remain monitored.

### 13.3 Mobile Development

Monitored:

- React Native Blog — https://reactnative.dev/blog
- React Native stable releases — https://github.com/facebook/react-native/releases
- React Native proposal events — https://github.com/react-native-community/discussions-and-proposals
- Meta Engineering Android, explicitly filtered to React Native — https://engineering.fb.com/category/android/
- Callstack Blog — https://www.callstack.com/blog
- Software Mansion Blog — https://swmansion.com/blog
- Expo Blog — https://expo.dev/blog
- Expo Changelog — https://expo.dev/changelog
- Expo stable releases — https://github.com/expo/expo/releases
- Evan Bacon — https://evanbacon.dev/
- Marc Rousavy — https://mrousavy.com/blog
- Start React Native — https://start-react-native.dev
- Shopify Engineering Mobile virtual source — https://shopify.engineering/category/mobile
- Emerge Tools Blog — https://www.emergetools.com/blog
- BAM Tech — https://tech.bam.tech
- Hermes stable releases — https://github.com/facebook/hermes/releases
- Runway Blog — https://www.runway.team/blog
- Bitrise Blog — https://bitrise.io/blog
- Infinite Red/Shift — https://shift.infinite.red
- React Navigation stable releases
- Reanimated stable releases
- Vision Camera stable releases
- Shopify FlashList stable releases

Reference only:

- React Native Architecture — https://reactnative.dev/architecture/overview
- Expo EAS documentation — https://docs.expo.dev/eas/
- fastlane documentation — https://docs.fastlane.tools

Deferred:

- Swift, Apple platform, and native iOS sources
- iOS Dev Weekly

### 13.4 Software Design & System Architecture

Monitored:

- ByteByteGo — https://blog.bytebytego.com
- High Scalability — http://highscalability.com
- Murat Demirbas — https://murat.github.io
- Jepsen analyses — https://jepsen.io/analyses
- AWS Builders' Library — https://aws.amazon.com/builders-library/
- Stripe Engineering — https://stripe.com/blog/engineering
- Netflix TechBlog — https://netflixtechblog.com
- Uber Engineering — https://www.uber.com/blog/engineering/
- Discord Engineering — https://discord.com/category/engineering
- Shopify Engineering — https://shopify.engineering
- Spotify Engineering — https://engineering.atspotify.com
- Martin Fowler — https://martinfowler.com
- Brandur — https://brandur.org
- Clean Coder — https://blog.cleancoder.com
- Khalil Stemmler — https://khalilstemmler.com
- Enterprise Craftsmanship — https://enterprisecraftsmanship.com
- PlanetScale Blog — https://planetscale.com/blog
- Confluent Blog — https://www.confluent.io/blog/
- Redis Blog — https://redis.io/blog/
- APIs You Won't Hate — https://apisyouwonthate.com
- Cockroach Labs Blog — https://www.cockroachlabs.com/blog
- Figma Engineering — https://www.figma.com/blog/engineering/
- Slack Engineering — https://slack.engineering
- Effective TypeScript Blog — https://effectivetypescript.com/blog
- Pragmatic Engineer — https://blog.pragmaticengineer.com
- Architecture Notes — https://architecturenotes.co
- Airbnb Tech Blog
- DoorDash Engineering
- Dropbox Tech Blog

Reference only:

- System Design Primer — https://github.com/donnemartin/system-design-primer
- Refactoring.Guru — https://refactoring.guru
- DDD Crew — https://github.com/ddd-crew
- TypeScript documentation — https://www.typescriptlang.org/docs/

AWS Architecture Blog and Cloudflare Blog belong to DevOps, not this category.

### 13.5 DevOps, Cloud & Infrastructure

Monitored:

- Docker Blog — https://www.docker.com/blog/
- Earthly Blog — https://earthly.dev/blog
- Sysdig Blog — https://sysdig.com/blog/
- Kubernetes Blog
- GitHub Actions Blog tag — https://github.blog/tag/github-actions/
- GitHub Actions changelog virtual source
- Buildkite Blog — https://buildkite.com/blog
- CircleCI Blog — https://circleci.com/blog/
- AWS Architecture Blog — https://aws.amazon.com/blogs/architecture/
- Google Cloud Blog — https://cloud.google.com/blog/
- Cloudflare Blog — https://blog.cloudflare.com
- Cloudflare changelog filtered to Workers, Pages, D1, and R2
- Vercel Changelog
- Supabase Blog — https://supabase.com/blog
- Neon Blog — https://neon.tech/blog
- Timescale Blog — https://www.timescale.com/blog
- HashiCorp Blog — https://www.hashicorp.com/blog
- Terraform stable releases
- Pulumi Blog and stable releases — https://www.pulumi.com/blog/
- OpenTofu Blog and stable releases
- Charity Majors — https://charity.wtf
- Honeycomb Blog — https://www.honeycomb.io/blog
- Grafana Blog — https://grafana.com/blog/
- OpenTelemetry Blog — https://opentelemetry.io/blog/

Reference only:

- Docker documentation — https://docs.docker.com/
- GitHub Actions documentation — https://docs.github.com/en/actions
- AWS documentation — https://docs.aws.amazon.com/
- Cloudflare Workers documentation — https://developers.cloudflare.com/workers/
- Vercel documentation — https://vercel.com/docs
- PostgreSQL documentation — https://www.postgresql.org/docs/
- Terraform documentation — https://developer.hashicorp.com/terraform/docs

Routing notes:

- CircleCI belongs only to DevOps.
- Full Vercel Blog belongs to Web Core; Vercel Changelog belongs here.
- Full Grafana Blog belongs here; its k6 virtual source belongs to Testing.

### 13.6 Testing & Release Quality

Monitored:

- Playwright stable releases
- Cypress Blog and stable releases — https://www.cypress.io/blog
- Checkly Blog — https://www.checklyhq.com/blog/
- Vitest Blog and stable releases — https://vitest.dev
- Jest Blog and stable releases
- React Testing Library stable releases
- Kent C. Dodds testing-topic virtual source — https://kentcdodds.com
- Maestro stable releases
- Detox stable releases
- React Native Testing Library stable releases
- Chromatic Blog — https://www.chromatic.com/blog
- Pact JS stable releases
- BrowserStack Blog — https://www.browserstack.com/blog
- Martin Fowler testing virtual source — https://martinfowler.com/testing/
- Grafana k6 virtual source — https://grafana.com/blog/tags/k6/
- Software Testing Weekly, one issue per item — https://softwaretestingweekly.com
- Storybook Blog and stable releases
- Mock Service Worker Blog and stable releases

Reference only:

- Playwright documentation — https://playwright.dev
- Jest documentation — https://jestjs.io/docs/getting-started
- Testing Library documentation — https://testing-library.com
- Maestro documentation — https://maestro.mobile-dev.inc
- Detox documentation — https://wix.github.io/Detox/
- React Native Testing Library documentation — https://callstack.github.io/react-native-testing-library/
- Pact documentation — https://docs.pact.io
- Kent C. Dodds `Write tests` static article

The former k6.io Blog endpoint is treated as the Grafana k6 source rather than duplicated.

### 13.7 Developer Tooling, Runtimes & Web Standards

Monitored:

- Node.js Blog — https://nodejs.org/en/blog
- Bun Blog — https://bun.sh/blog
- Deno Blog — https://deno.com/blog
- Vite Blog — https://vite.dev/blog/
- Rolldown stable releases — https://rolldown.rs
- Biome Blog — https://biomejs.dev/blog/
- pnpm Blog — https://pnpm.io/blog
- Socket Blog — https://socket.dev/blog
- TC39 proposal lifecycle events — https://github.com/tc39/proposals
- WHATWG Blog — https://blog.whatwg.org
- W3C Blog — https://www.w3.org/blog/
- V8 Blog — https://v8.dev/blog
- Surma — https://surma.dev
- Bytecode Alliance articles
- WebAssembly proposal/specification updates
- ESLint Blog
- Prettier Blog
- Oxc Blog
- Rspack Blog

Reference only:

- Turbopack documentation; `https://turbo.build/pack` redirects to Next.js documentation
- WebAssembly homepage/reference — https://webassembly.org

GitHub Changelog routing:

- Copilot → AI Engineering
- Actions → DevOps
- Projects and Issues → Developer Tooling

## 14. Local technical architecture

```text
easy-radar/
├── .agents/
│   └── skills/
│       └── collect-news/
│           └── SKILL.md
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── collect.yml
│       └── pr-build.yml
├── .data/                 # git worktree on the data branch; gitignored on main
│   └── data/              # news.json, news-states.json, cursors, status
├── config/
│   └── sources/
├── docs/
│   ├── collector-development.md
│   ├── reference-sources.md
│   └── user-manual.md
├── scripts/
│   ├── collect/
│   ├── cleanup/
│   ├── validate/
│   └── git-workflow/
├── server/
├── shared/
│   └── schemas/
├── src/
│   ├── pages/
│   │   ├── NewsPage.tsx
│   │   └── SourcesPage.tsx
│   ├── components/
│   └── domain/
├── tests/
│   ├── adapters/
│   └── fixtures/
├── .node-version
├── eslint.config.ts
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── prettier.config.ts
└── README.md
```

The repository is one pnpm package, not a monorepo or pnpm workspace.

### 14.1 Frontend stack

```text
React + TypeScript + Vite
├── TanStack Router
├── TanStack Query
└── Mantine
```

- TanStack Router uses typed routes and typed search params.
- Category, state filter, and pagination are represented in the URL, for example `/?category=web-core&state=all&page=1`.
- TanStack Query owns API/server state, loading, errors, mutations, and invalidation.
- React local state owns short-lived component UI state.
- Zustand or another global client-state library is not used in v1.
- Mantine is the only component library. Product components compose Mantine primitives; the app does not recreate generic buttons, dialogs, tabs, badges, pagination, or alerts.
- Tailwind, shadcn/ui, Radix as a direct dependency, and MUI are not used.
- The primary browser target is desktop/laptop; tablet-width layouts remain functional. Phone layout is not a v1 acceptance target.

### 14.2 Visual system

The app has one fixed theme. It does not read the system color scheme and does not offer light/dark mode or a theme switch.

The only palette seeds are:

| Seed | Intended role |
|---|---|
| `#3A506B` | Primary, headings, active navigation, dark foreground |
| `#5BC0BE` | Interactive accent, selected state, success |
| `#CDEDF6` | Page surface, subtle highlight, information background |
| `#A8B59F` | Secondary surface, read state, calm success |
| `#C9A68B` | Warning and ignored/destructive confirmation |

Mantine color ramps are generated from these seeds, preferably in OKLCH, to supply hover, active, border, disabled, background, and high-contrast shades. Default Mantine blue/red/green palettes are not introduced. Status communication uses text and an icon as well as color.

The app has no formal WCAG compliance target in v1. It retains Mantine's normal keyboard, focus, and dialog behavior and avoids obviously unreadable color combinations.

The UI uses a local system font stack and no CDN or remotely hosted font.

### 14.3 Local API stack

```text
Express + Zod
├── GET   /api/news
├── GET   /api/sources
├── GET   /api/collection-status
├── PATCH /api/news/:id/state
└── POST  /api/finish-reading
```

- Shared Zod schemas are the contract between the frontend, Express server, collector, and JSON files.
- The frontend uses a small typed `fetch` wrapper with TanStack Query; no additional API contract framework is introduced.
- The server binds only to `127.0.0.1`.
- It restricts file writes to the known data files inside the `.data/` worktree (§15.1) and exposes explicit workflow operations rather than arbitrary shell execution.
- `GET /api/collection-status` also serves the in-session freshness poll (§15.3), reporting whether the remote `data` branch has advanced. The check must not read `news.json`.
- There is no database, authentication layer, hosted service, or `.env` requirement in v1.

### 14.4 Collector stack

```text
Node native fetch
├── Feedsmith — RSS, Atom, and JSON Feed parsing
├── Cheerio — HTML parsing only when no stable feed/API exists
├── gh api — authenticated GitHub Releases and proposal events
└── Zod — normalized NewsItem validation
```

- Axios is not used.
- Octokit is not used; GitHub operations reuse the authenticated `gh` prerequisite.
- Browser automation is not a default collection adapter. A JavaScript-only source remains `Planned` until a small, justified adapter is approved.
- Collector logs use concise structured console output; no hosted logging or telemetry service is introduced.

### 14.5 Runtime and package policy

- Node.js 24 LTS
- ESM only via `"type": "module"`
- TypeScript/TSX only for executable source and tests
- pnpm with an exact version in `packageManager`
- Node major version pinned by `.node-version` and `engines`
- `tsx` runs local TypeScript scripts
- Generated JavaScript may exist in `dist/`, but JavaScript source files are not committed
- `git` and an authenticated `gh` CLI are local prerequisites; Git worktree support is assumed (§15.1)
- `.data/` is gitignored on `main`
- The public repository uses the MIT License with `Copyright (c) 2026 Hongyu Zhao`

## 15. AGY Skill and local execution

The user launches AGY CLI in the `easy-radar` repository and invokes the local collection Skill. The Skill orchestrates deterministic scripts; it does not browse sources or manufacture NewsItems itself.

```text
AGY Skill
  → run deterministic collector
  → run per-source cleanup and state synchronization
  → validate schemas and invariants
  → run tests/build
  → apply change guards
  → commit and push changed data to the data branch
  → report coverage and failures
```

AI token usage stays low because collection, parsing, deduplication, classification, validation, and Git operations are implemented in code. The Skill mainly launches commands and summarizes deterministic output.

Opening the app and collecting news are separate operations:

```text
pnpm start    # sync the data branch, then start the local app
pnpm collect  # run deterministic collection locally, without requiring AGY
```

`pnpm start` runs the frontend and Express server as one user-facing operation. It does not collect sources. The AGY Skill calls the same deterministic collection command rather than implementing its own collector.

### 15.1 Local checkout layout

The `data` branch carries no code (§16), so it cannot simply be checked out in the main working tree — doing so would remove the application from disk. Code and data are therefore held in two working trees simultaneously, using a dedicated Git worktree:

```text
easy-radar/          main branch — code, config, docs
└── .data/           git worktree on the data branch — data/*.json only
```

- `.data/` is created once by a setup step and is gitignored on `main`.
- The main working tree stays on `main` at all times. Reading news never requires changing branches.
- The Express server reads and writes `.data/data/*.json`; no other path accesses these files.
- `Finish reading` commits and pushes from within `.data/`.

The alternative of letting the `data` branch carry a copy of the code was rejected: that copy would never be updated, so any process running from the `data` branch would silently execute a stale collector, which is precisely what §18.5 avoids by reading code from `main`.

### 15.2 Startup data synchronization

Cloud collection writes to the remote `data` branch. The local app reads the `.data/` worktree. `pnpm start` therefore synchronizes before serving, and this is what delivers the product goal that news is current with no user action:

```text
pnpm start
  1. git -C .data fetch
  2. git -C .data pull --ff-only
  3. start the Express server and frontend
```

Rules:

- The synchronization is a fast-forward only. Force-updating the worktree is never performed.
- If the `data` branch has diverged, or uncommitted state changes would be overwritten, startup fails closed: the app explains the situation and asks the user to resolve it rather than discarding local reading state.
- If `.data/` is missing, startup creates it rather than failing.
- If the network is unavailable, the app starts on the last locally known data and the status alert reflects staleness normally.

Local collection remains supported and produces identical output, but it is a diagnostic and development path, not the routine one.

### 15.3 In-session freshness

Startup synchronization alone leaves a gap: a session left open for days would keep showing the data present when it started, with a green alert, while cloud runs continued to land.

The app therefore polls for new commits on the remote `data` branch on a slow interval and, when it finds one, shows a non-blocking "new items available" prompt that the user can act on.

- Refresh is never automatic. Reordering a list while the user is reading it is worse than showing slightly old data.
- The poll is lightweight and independent of `news.json` size.
- The status alert is re-evaluated on the same interval, so a failure that occurs during a long session becomes visible without a restart.

### 15.4 User documentation

All repository documentation and UI copy are written in English because the repository is public.

`README.md` provides the project summary and quick start. `docs/user-manual.md` is a self-contained manual covering:

- Prerequisites and installation
- Starting the app
- Direct manual collection
- Collection through the AGY Skill
- Scheduled cloud collection and how to trigger a run on demand
- Main page and Sources page
- Reading-state actions
- Finish Reading
- The branch model, and recovering by resetting the `data` branch
- Holiday/long-gap recovery, including the `allow_large_change` escape hatch
- Collection status and invalid sources
- Common commands and troubleshooting

Source-adapter implementation and internal maintenance guidance live in `docs/collector-development.md`, keeping the daily User Manual focused.

## 16. Branch model

Two long-lived branches with strictly separated responsibilities:

| Branch | Contains | Written by |
|---|---|---|
| `main` | Code, source configuration, documentation. No `data/` directory. | Reviewed code changes only |
| `data` | `data/*.json` only. No code. | Cloud collection pipeline and the local app |

Because the two branches share no files, they cannot occupy one working tree. Locally this is resolved with a dedicated Git worktree (§15.1); in the cloud pipeline the two are separate checkout and commit steps (§18.5).

Rules:

- `main` never receives automated data changes. Data never reaches `main`, not even periodically.
- The collection pipeline always reads collector code from `main` and writes data to `data`. The `data` branch therefore never needs rebasing and its collector code can never go stale.
- The `data` branch is the branch the local app reads, and the branch `Finish reading` pushes to.
- There are no data pull requests. The commit history of `data` is the audit record.
- Remote is authoritative. Every writer starts from the remote `data` tip; a cloud run gets this for free from a fresh checkout, and the local app must fast-forward before serving and rebase before pushing.
- Force push is never performed on either branch by any automated path.
- A push rejection is retried once after rebase. A second failure aborts and reports; it is never resolved by overwriting.
- Ambiguous or diverged branch state fails closed and asks the user to resolve it.

Branch protection:

| Branch | Protection |
|---|---|
| `main` | Block force push, block deletion |
| `data` | Block force push, block deletion |

The `data` branch must not require reviews or pull requests, which would deadlock automated pushes. Its protection exists only to make history non-destructible, which matters because `main` holds no copy of the data.

Recovery: because no automated change reaches `main`, a bad automated data change is recoverable by resetting `data` to a known-good commit. This bounded blast radius is what makes unattended data commits acceptable.

History growth: `data` receives a commit most days, so while §10 keeps the *files* bounded, the branch *history* grows without bound — on the order of tens of megabytes per year. Compacting it (squashing or rebuilding the branch) is an expected long-term maintenance operation, not a defect. Two consequences follow and are recorded here so they are not mistaken for misconfiguration later:

- Compaction requires **temporarily lifting the force-push protection** on `data`, since that is exactly the operation the protection blocks.
- Compaction must be preceded by a backup, because `main` holds no copy of the data.

No compaction is scheduled for v1.

## 17. Validation and CI

Local validation covers:

- Source configuration schema and unique IDs
- News and state schemas
- Valid category and label values
- Deterministic IDs and no duplicate active items
- State/news synchronization
- Adapter fixture tests
- Frontend build

The testing stack is:

- Vitest for collector units, adapter fixtures, domain logic, and Express API integration
- React Testing Library for component behavior
- A small Playwright suite for critical browser workflow smoke tests

The code-quality stack is:

- Prettier for formatting
- ESLint flat config with TypeScript, React, and React Hooks rules
- TypeScript compiler with strict type checking and `noEmit`

Biome is not used.

Standard commands include:

```text
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm validate
```

`pnpm validate` runs Prettier check, ESLint, TypeScript, Vitest, and the build. Playwright remains an explicit command and is not added to every routine data-only validation run.

Husky acts as a local gate. GitHub Actions runs PR validation for code pull requests targeting `main` with `pnpm install --frozen-lockfile`, the relevant lint, type, and test checks, and `pnpm build`.

Data validation is not a pull-request check, because there are no data pull requests. It runs inline inside the collection workflow, before anything is written to the `data` branch (§18.5). Validation therefore gates the write itself rather than gating a merge.

The repository is public, so GitHub Actions minutes are free and unlimited. The `$0` budget guard with stop-usage enabled remains in place; it exists to prevent any paid usage from being introduced, not to restrict scheduled collection.

Dependabot is enabled with a monthly schedule and grouped PRs for production dependencies, development/testing dependencies, and GitHub Actions. Patch/minor updates are grouped; major updates require explicit review. Auto-merge is disabled. Dependabot targets `main` only and never interacts with the `data` branch.

## 18. Cloud execution

This section supersedes the earlier decision to defer cloud collection.

### 18.1 Purpose and terminology

Cloud execution exists so that news stays current without depending on the user's attention. §11.2 assumes a 36-hour collection window and §7.1 turns orange when collection is older than 36 hours; both assume collection happens roughly daily. If collection only happened when the user sat down at the laptop, the stale warning would become routine noise and §4's failure-visibility principle would be defeated.

Collection is described along four independent axes. Confusing them is the main source of ambiguity in this design:

| Axis | Values |
|---|---|
| Trigger | Manual command, Actions cron, AI agent |
| Execution environment | User's laptop, GitHub Actions runner |
| Collector | The deterministic script, always, in every combination |
| Write target | The `data` branch, always |

**Cloud collection** means only this: the same deterministic collector, running on a GitHub Actions runner instead of the user's laptop. It is not a second collector, and it is never an AI reading sources.

Because the collector and write target are fixed, only the trigger and the environment vary. "Local" and "cloud" are independent in trigger and environment, and identical in collector and data. Staleness between them arises from the shared data, not from concurrency, so synchronization is required even though the two paths effectively never run at the same time.

### 18.2 Platform

GitHub Actions, for reasons largely fixed by existing decisions:

- §14.5 requires `git` and an authenticated `gh` CLI. Actions runners ship `gh` preinstalled with `GITHUB_TOKEN` injected, so no collector code changes are needed.
- Serverless alternatives such as Cloudflare Workers have no filesystem, forcing the §9 JSON-file data layer to be rewritten against object storage and the GitHub API, and forcing Octokit, which §14.4 excludes.
- A VPS would introduce a paid service, machine maintenance, and an additional credential location.
- Public-repository Actions minutes are free and unlimited, and Node 24 and pnpm are first-class.

Accepted cost: Actions `schedule` triggers are best-effort and can be delayed or occasionally skipped under load. For daily news collection this is immaterial, and it is already absorbed by the per-source cursors and gap recovery in §11.2.

### 18.3 Triggers

| Trigger | Cadence | Token cost |
|---|---|---|
| `schedule` cron | Daily, `17 3 * * *` UTC | None |
| `workflow_dispatch` | On demand | Only if an AI agent invokes it |

Cron is the always-on baseline; the AI path is a supplementary on-demand route, not the daily path. The routine daily collection therefore consumes no AI tokens at all.

`17 3 * * *` UTC lands at 05:17 in Helsinki winter time and 06:17 in summer time. Actions cron is UTC-only and does not follow daylight saving, so a one-hour seasonal drift is accepted; both times are early morning. The minute is offset from the hour because GitHub's scheduler is most congested and most delayed at `:00`. The time also sits after the US publishing day has fully closed in UTC terms, so a run captures a complete previous day rather than cutting through it.

Operational note: GitHub disables scheduled workflows in public repositories after 60 days without repository activity. Daily data commits normally prevent this. If it occurs, no status is pushed at all, and the §7.1 staleness warning plus the Actions failure email are the signals that surface it.

### 18.4 AI executors

AI executors are permitted in exactly one role: **triggering a run and relaying its summary**. They never fetch sources, never judge relevance, never produce NewsItems, and never repair anything.

The role restriction is not stylistic. §2 requires collection to be deterministic and independent of AI token usage, §4.3 forbids an LLM from deciding whether an item is interesting, and §15 already restricts the local AGY Skill to orchestration. An AI that collected sources itself would also produce items the deterministic collector could never reproduce, corrupting the dedup keys and cursors in §11.2 and §11.4 for every subsequent run, which makes it a one-way door rather than a reversible experiment.

All AI executors invoke the same workflow rather than running collection in their own sandbox:

```text
agent → gh workflow run collect.yml
      → gh run watch --exit-status
      → read the run summary
      → relay it
```

This makes output identity structural rather than a matter of discipline: every executor runs the same commit, the same lockfile, and the same Node version. It also keeps every credential inside Actions, so no agent platform ever holds one, and it keeps the agent's context free of install logs and per-source fetch output.

Executors are pluggable and interchangeable. **Gemini is the preferred default**, chosen purely because the user does not use it for coding and its quota is therefore abundant; Claude and Copilot are equivalent alternatives. Switching requires no code or configuration change, because the contract is a single `workflow_dispatch` call. The zero-dependency fallback is `gh workflow run collect.yml` from any terminal, or the "Run workflow" button in the GitHub UI.

The fixed prompt is identical across platforms and states these constraints:

1. Execute only the two given commands. Do not explore the repository or read any file. Reading `data/news.json` is specifically forbidden.
2. Do not interpret, diagnose, or repair failing sources. §7.4 requires failures to persist until the user explicitly approves a fix.
3. Do not modify code or configuration.
4. Relay the summary's coverage and failure table verbatim, without additions or evaluation.
5. If the workflow fails, report and stop. Do not attempt remediation.

Constraint 5 exists because the default model tendency is to start investigating a failure, which reads logs and code and destroys the constant-cost property.

**Token budget contract:** the cost of an AI-triggered run is constant and independent of source count and data size. Any design that makes it scale with either is a defect.

### 18.5 Collection pipeline

```text
1. Check out main                 latest collector code, config, lockfile
2. pnpm install --frozen-lockfile
3. pnpm collect                   deterministic collection
4. cleanup                        §10 rules
5. pnpm validate                  schemas, unique IDs, dedup, state sync
6. change guards                  §18.6
7a. all pass  → commit data/*.json to the data branch and push
7b. any fail  → push collection-status.json only; leave data files untouched
```

Step 1 reading code from `main` while step 7 writes to `data` is what keeps the two branches independent: code is always current, data never carries code.

Step 7b is deliberate. A failed run still reports, so the app shows a red alert with a precise reason at the time of failure instead of generic staleness 36 hours later, while `news.json` remains at its last known-good state. This produces occasional status-only commits on `data`, which is acceptable because the user does not read that history.

A `concurrency` group serializes runs. Concurrent execution is expected to be rare, so this is inexpensive insurance rather than a load-bearing mechanism.

### 18.6 Change guards

With no human reviewing data changes, validation is the only line of defense, and schema validation alone cannot catch a change that is perfectly well-formed and substantively wrong — for example a redesigned site whose navigation is parsed as 150 news items. The guards below are the statistical backstop that human review used to provide. Any single trigger rejects the data write:

| Guard | Threshold | Failure it catches |
|---|---|---|
| Items added in one run | > 200 | Adapter parsing page furniture as items; cursor collapse causing full-history re-import |
| Deletion or modification of existing active items | > 0, excluding §10 cleanup | §8 makes item metadata append-only; any rewrite is anomalous |
| `collection-cursors.json` timestamp regression | Any source | Corrupted cursor causing repeated re-collection |

The threshold of 200 is calibrated against roughly 150 monitored sources producing a few dozen items on a normal day, leaving three-to-five-fold headroom. It is a configuration constant to be tuned against real data after a few weeks.

Because the guards run before the write and `data` is resettable, their cost of a false positive is low. They are an early warning, not an irreversible gate.

Runtime source failures do **not** block the write. §7.2 isolates a failing source so the others continue; blocking on failure would let one permanently broken source freeze all collection. Failures are reported through §7.3 instead.

**Escape hatch:** `workflow_dispatch` accepts an `allow_large_change` input that bypasses the volume guard. Its legitimate uses are recovering from an outage, where a genuine backlog is expected, and the `initialSyncFrom` first full synchronization in §11.2. Cron can never set it: bypassing a guard must always be a deliberate human or explicitly authorized act.

### 18.7 Secrets and permissions

No new secrets are required for v1. Every approved source in §13 is a feed, HTML page, or GitHub API endpoint; none needs a private API key. GitHub API access uses the runner's injected `GITHUB_TOKEN` through the `gh` CLI, consistent with §14.4, and stays well inside the 1,000 requests per hour per repository limit.

```yaml
permissions:
  contents: write   # push to the data branch
  # everything else: none
```

`pull-requests: write` is not granted, since the data pull-request flow no longer exists. With minimum permissions, the worst outcome of a compromised or broken workflow is a bad write to `data`, which is resettable.

Each AI platform's GitHub integration needs `actions: write` to invoke `workflow_dispatch`. Configuring this differs per platform and is user-owned (§22).

## 19. Rollout plan

1. Build one complete vertical slice: source config → collector → JSON → local server → UI → state update → push to the `data` branch.
2. Onboard several official, high-signal sources from each category.
3. Batch-onboard the remaining approved sources using the adapter priority.
4. Mark unsupported sources as `Planned`; do not disguise incomplete coverage.
5. Declare v1 complete only when every approved collectable source is `Active`.

The app may be usable during onboarding, but its alert must continue to show incomplete coverage.

## 20. Acceptance criteria

- All seven categories appear as Main-page tabs and Sources-page groups.
- All approved collectable sources are represented by executable config and ultimately reach `Active` for v1 completion.
- Reference sources are visible but never collected or counted in coverage.
- Every eligible newly collected item appears once with valid deterministic metadata and initial `unread` state.
- One source failure does not block successful sources.
- Config errors stop collection before writes.
- Runtime source failures are obvious in the terminal, the Main page, the Sources page, and the Actions run summary.
- No failing source is silently removed or disabled.
- Reading state survives collector runs and page reloads.
- Ignore confirmation and cleanup rules work as specified.
- `Finish reading` commits and pushes reading state to the `data` branch and preserves changes on failure.
- The system works without paid services or AI-driven collection.
- Scheduled cloud collection runs daily and commits to the `data` branch with no user action.
- Opening the local app shows data collected by the most recent successful cloud run, without the user pulling, merging, or approving anything.
- Local, cron-triggered, and AI-triggered collection produce identical output because all three execute the same workflow.
- A run that fails validation or trips a change guard writes no data files, publishes its status, and surfaces a red alert with a precise reason.
- No automated process ever writes to `main`.
- An AI-triggered run's token cost does not scale with source count or data size, and the AI never reads `data/news.json`.
- Resetting the `data` branch to a prior commit fully recovers from a bad automated data change.
- `pnpm start` synchronizes the `data` worktree and opens a functional local app without triggering collection.
- Code and data never share a working tree; the main checkout stays on `main` and reading news never requires switching branches.
- A session left open across a cloud run surfaces a non-blocking prompt that new items are available, and never reorders the list underneath the reader.
- `pnpm collect` runs the same deterministic collector used by the AGY Skill.
- All executable source and test files are TypeScript/TSX.
- The app uses Mantine as its only component library and one fixed theme derived from the five approved palette seeds.
- The English User Manual explains the complete daily, collection, branch, holiday, and troubleshooting workflows without relying on chat history.

## 21. Decisions delegated to implementation

The following details should be chosen for low maintenance and do not require additional product approval unless they change visible behavior:

- Bounded concurrency values, timeouts, and retry counts
- Precise branch and commit naming
- Internal layout of adapter modules
- Status file serialization details
- Deterministic static tags for each source
- Exact shades in each generated Mantine color ramp, subject to the approved five seed colors
- Exact patch versions, subject to the pinned Node 24/pnpm policy and committed lockfile

## 22. Deferred and user-owned inputs

- Exact `initialSyncFrom` cutoff date for each source or source batch must be supplied/approved before activation.
- Any later source addition, removal, category reassignment, or verified replacement requires user approval.
- Branch protection rules for `main` and `data` must be configured in repository settings.
- GitHub account notification settings must have Actions failure email enabled; §18 relies on it as the only push-based failure signal.
- Each AI platform's GitHub integration must be granted `actions: write` so it can invoke `workflow_dispatch`. Whether Gemini can currently do this against this repository is unverified and should be confirmed before relying on it; the `gh workflow run` fallback is unaffected.
- The change-guard thresholds in §18.6 are initial estimates and should be tuned after several weeks of real collection data.
- Nathan Brain integration is a separate future product decision.
- Swift and native iOS coverage is deferred.

Superseded by §18: the earlier deferral of cloud/scheduled collection, and the earlier treatment of auto-merge as a future option requiring separate review. The safety review that deferral required was carried out and is recorded in §16 and §18.6.

## 23. Open questions

No unresolved question blocks the v1 architecture. Remaining choices are implementation details or explicitly deferred product expansions.

Two items are worth flagging as assumptions rather than blockers:

- The §18.6 volume threshold of 200 is an estimate derived from source count, not from observed data. It will produce false positives or false negatives until tuned.
- Whether Gemini can currently invoke `workflow_dispatch` against this repository is unverified. If it cannot, the executor falls back to Claude, Copilot, or a plain `gh workflow run`, none of which changes the architecture.
