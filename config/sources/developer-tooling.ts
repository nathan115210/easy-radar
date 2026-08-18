import type { ReferenceSource, SourceConfig } from "../../shared/schemas/index.js";

export const category = "developer-tooling" as const;

/**
 * Every source's cutoff below was approved as a single batch decision
 * (PRD §22) rather than guessed per source: 30 days back from onboarding,
 * enough real content on first sync without approaching the 200-item
 * volume guard (PRD §18.6).
 */
const INITIAL_SYNC_FROM = "2026-07-18";

export const sources: SourceConfig[] = [
  // --- Runtime blogs (feed adapter) ---
  {
    id: "nodejs-blog",
    name: "Node.js Blog",
    category,
    kind: "feed",
    url: "https://nodejs.org/en/feed/blog.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["nodejs", "runtime"],
  },
  {
    id: "bun-blog",
    name: "Bun Blog",
    category,
    kind: "feed",
    url: "https://bun.sh/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["bun", "runtime"],
  },
  {
    id: "deno-blog",
    name: "Deno Blog",
    category,
    kind: "feed",
    url: "https://deno.com/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["deno", "runtime"],
  },

  // --- Build tools / bundlers (feed adapter) ---
  {
    id: "vite-blog",
    name: "Vite Blog",
    category,
    // PRD §13.1 routing note: Vite belongs here, not Web Core.
    kind: "feed",
    // No feed at the guessed conventional path; discovered via the
    // <link rel="alternate"> autodiscovery tag on https://vite.dev/blog/.
    url: "https://vite.dev/blog.rss",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["vite", "build-tools"],
  },
  {
    id: "biome-blog",
    name: "Biome Blog",
    category,
    // The repo itself doesn't use Biome (PRD §17) — unrelated to whether
    // its blog is a monitored source here.
    kind: "feed",
    url: "https://biomejs.dev/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["biome", "linting"],
  },
  {
    id: "pnpm-blog",
    name: "pnpm Blog",
    category,
    kind: "feed",
    url: "https://pnpm.io/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["pnpm", "package-manager"],
  },
  {
    id: "eslint-blog",
    name: "ESLint Blog",
    category,
    kind: "feed",
    // Discovered via the <link rel="alternate"> autodiscovery tag on
    // https://eslint.org/blog/.
    url: "https://eslint.org/feed.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["eslint", "linting"],
  },
  {
    id: "prettier-blog",
    name: "Prettier Blog",
    category,
    kind: "feed",
    url: "https://prettier.io/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["prettier", "formatting"],
  },
  {
    id: "oxc-blog",
    name: "Oxc Blog",
    category,
    kind: "feed",
    url: "https://oxc.rs/feeds/blog-en.rss",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["oxc", "build-tools"],
  },
  {
    id: "rspack-blog",
    name: "Rspack Blog",
    category,
    kind: "feed",
    // Discovered via the <link rel="alternate"> autodiscovery tag on
    // https://rspack.rs/blog.
    url: "https://rspack.rs/rss/blog-rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["rspack", "build-tools"],
  },

  // --- Rolldown (github-release adapter) ---
  {
    id: "rolldown-releases",
    name: "Rolldown stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/rolldown/rolldown",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["rolldown", "build-tools"],
  },

  // --- Security tooling (feed adapter) ---
  {
    id: "socket-blog",
    name: "Socket Blog",
    category,
    kind: "feed",
    // Discovered via the <link rel="alternate"> autodiscovery tag on
    // https://socket.dev/blog (the plain /blog/rss.xml guess 404s).
    url: "https://socket.dev/api/blog/feed.atom",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["socket", "security"],
  },

  // --- Web standards bodies & engine blogs (feed adapter) ---
  {
    id: "whatwg-blog",
    name: "WHATWG Blog",
    category,
    kind: "feed",
    url: "https://blog.whatwg.org/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["web-standards"],
  },
  {
    id: "w3c-blog",
    name: "W3C Blog",
    category,
    kind: "feed",
    url: "https://www.w3.org/blog/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["web-standards"],
  },
  {
    id: "v8-blog",
    name: "V8 Blog",
    category,
    kind: "feed",
    url: "https://v8.dev/blog.atom",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["v8", "javascript-engine"],
  },
  {
    id: "surma",
    name: "Surma",
    category,
    kind: "feed",
    // Discovered via the <link rel="alternate"> autodiscovery tag on
    // https://surma.dev/.
    url: "https://surma.dev/index.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["web-standards", "wasm"],
  },
  {
    id: "bytecode-alliance-articles",
    name: "Bytecode Alliance articles",
    category,
    kind: "feed",
    // Discovered via the <link rel="alternate"> autodiscovery tag on
    // https://bytecodealliance.org/articles.
    url: "https://bytecodealliance.org/feed.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["wasm", "bytecode-alliance"],
  },

  // --- Planned: needs the RFC/proposal lifecycle adapter for the WASM
  // proposals repo. No adapter has been built for this source yet (unlike
  // TC39 below, whose adapter exists but isn't wired into the registry) —
  // best-guess kind/url/adapter recorded for when one is. ---
  {
    id: "webassembly-proposals",
    name: "WebAssembly proposal/specification updates",
    category,
    kind: "github-event",
    url: "https://github.com/WebAssembly/proposals",
    adapter: "wasm-proposal-lifecycle",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["wasm", "web-standards"],
  },

  // --- Planned: adapter exists (resolves #28) but isn't wired into the
  // default registry (`scripts/collect/default-registry.ts` only wires
  // feed, github-release, official-api, and generic-html-json-ld) — same
  // precedent as `react-rfc-events` in config/sources/web-core.ts. Stage
  // labels (e.g. "Stage 3", "Retired") come from the adapter's own
  // stage-transition logic in scripts/collect/adapters/tc39-proposals.ts,
  // not from this config. ---
  {
    id: "tc39-proposal-lifecycle",
    name: "TC39 proposal lifecycle events",
    category,
    // PRD §13.1 routing note: TC39 belongs here, not Web Core.
    kind: "github-event",
    url: "https://github.com/tc39/proposals",
    adapter: "tc39-proposal-lifecycle",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["tc39", "web-standards"],
  },
];

export const referenceSources: ReferenceSource[] = [
  {
    id: "turbopack-docs",
    name: "Turbopack documentation",
    category,
    // https://turbo.build/pack redirects to the Next.js docs
    // (https://nextjs.org/docs/app/api-reference/turbopack) — a different
    // product's docs, verified live. Per the PRD's "redirects are
    // normalized without changing source intent" principle, this stays
    // Turbopack's reference entry (not re-pointed at Next.js, and not
    // duplicated as a Web Core source) even though the redirect target
    // technically belongs to a different product.
    url: "https://turbo.build/pack",
    note: "Redirects to the Next.js docs (nextjs.org/docs/app/api-reference/turbopack); kept as Turbopack's reference entry, not re-pointed at Next.js.",
  },
  {
    id: "webassembly-reference",
    name: "WebAssembly homepage/reference",
    category,
    url: "https://webassembly.org",
  },
];
