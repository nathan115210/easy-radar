import type { ReferenceSource, SourceConfig } from "../../shared/schemas/index.js";

export const category = "testing-quality" as const;

/**
 * Every source's cutoff below was approved as a single batch decision
 * (PRD §22) rather than guessed per source: 30 days back from onboarding,
 * enough real content on first sync without approaching the 200-item
 * volume guard (PRD §18.6).
 */
const INITIAL_SYNC_FROM = "2026-07-18";

export const sources: SourceConfig[] = [
  // --- Blogs (feed adapter) ---
  {
    id: "cypress-blog",
    name: "Cypress Blog",
    category,
    kind: "feed",
    url: "https://www.cypress.io/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["cypress", "e2e-testing"],
  },
  {
    id: "checkly-blog",
    name: "Checkly Blog",
    category,
    kind: "feed",
    url: "https://www.checklyhq.com/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["monitoring", "e2e-testing"],
  },
  {
    id: "jest-blog",
    name: "Jest Blog",
    category,
    kind: "feed",
    url: "https://jestjs.io/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["jest", "unit-testing"],
  },
  {
    id: "browserstack-blog",
    name: "BrowserStack Blog",
    category,
    kind: "feed",
    url: "https://www.browserstack.com/blog/rss/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["cross-browser-testing"],
  },
  {
    id: "storybook-blog",
    name: "Storybook Blog",
    category,
    kind: "feed",
    url: "https://storybook.js.org/blog/rss",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["storybook", "component-testing"],
  },

  // --- Stable releases (github-release adapter) ---
  {
    id: "playwright-releases",
    name: "Playwright stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/microsoft/playwright",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["playwright", "e2e-testing"],
  },
  {
    id: "cypress-releases",
    name: "Cypress stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/cypress-io/cypress",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["cypress", "e2e-testing"],
  },
  {
    id: "vitest-releases",
    name: "Vitest stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/vitest-dev/vitest",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["vitest", "unit-testing"],
  },
  {
    id: "jest-releases",
    name: "Jest stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/jestjs/jest",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["jest", "unit-testing"],
  },
  {
    id: "react-testing-library-releases",
    name: "React Testing Library stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/testing-library/react-testing-library",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["testing-library", "react"],
  },
  {
    id: "maestro-releases",
    name: "Maestro stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/mobile-dev-inc/Maestro",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["maestro", "mobile-testing"],
  },
  {
    id: "detox-releases",
    name: "Detox stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/wix/Detox",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["detox", "mobile-testing"],
  },
  {
    id: "react-native-testing-library-releases",
    name: "React Native Testing Library stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/callstack/react-native-testing-library",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["testing-library", "react-native"],
  },
  {
    id: "pact-js-releases",
    name: "Pact JS stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/pact-foundation/pact-js",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["pact", "contract-testing"],
  },
  {
    id: "storybook-releases",
    name: "Storybook stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/storybookjs/storybook",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["storybook", "component-testing"],
  },
  {
    id: "mock-service-worker-releases",
    name: "Mock Service Worker stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/mswjs/msw",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["msw", "mocking"],
  },

  // --- Virtual filtered sources (PRD §11.4, §12, §27): share URL + adapter
  // with a broader source in a different category, scoped down via
  // filters.virtualScope so the two never double-count the same item
  // (dedup.ts resolves the shared-URL case; the more-constrained source
  // wins whenever both would claim an item, but titleContains/linkPathPrefix
  // below already keep the sets disjoint in practice). ---
  {
    id: "kent-c-dodds-testing-virtual",
    name: "Kent C. Dodds testing-topic virtual source",
    category,
    kind: "feed",
    // Same feed as any broader Kent C. Dodds Blog source. The RSS feed has
    // no per-item tag/category field (verified live), so the discriminator
    // is a title substring rather than a link path.
    url: "https://kentcdodds.com/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["testing", "virtual-source"],
    filters: { virtualScope: { titleContains: "test" } },
  },
  {
    id: "martin-fowler-testing-virtual",
    name: "Martin Fowler testing virtual source",
    category,
    kind: "feed",
    // Same feed as the broader Martin Fowler source (Software Architecture
    // category). martinfowler.com's /testing/ section is a real URL path,
    // verified live against the site's Atom feed.
    url: "https://martinfowler.com/feed.atom",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["testing", "virtual-source"],
    filters: { virtualScope: { linkPathPrefix: "/testing/" } },
  },
  {
    id: "grafana-k6-virtual",
    name: "Grafana k6 virtual source",
    category,
    kind: "feed",
    // Same feed as the broader Grafana Blog source (DevOps category). The
    // former k6.io Blog endpoint no longer exists as its own source (PRD
    // §13.6) — k6 content is folded into the main Grafana blog and tagged
    // https://grafana.com/tags/k6/ there, but that tag has no dedicated
    // feed (verified live: /tags/k6/index.xml redirects, no standalone
    // RSS). k6-focused posts consistently carry "k6" in the title (verified
    // against live entries, e.g. "Grafana k6 1.0 release"), so titleContains
    // is the working discriminator against the shared blog feed.
    url: "https://grafana.com/blog/index.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["k6", "performance-testing", "virtual-source"],
    filters: { virtualScope: { titleContains: "k6" } },
  },

  // --- Newsletter: one issue per item, via the feed adapter + a label
  // override (#30) ---
  // Planned, not active: verified live during onboarding that
  // softwaretestingweekly.com exposes no working RSS/Atom feed — /rss and
  // /rss/ both 404, and there's no autodiscovery <link> on the homepage or
  // the /issues/ archive. Needs the real feed endpoint (or a platform
  // migration) confirmed before activation.
  {
    id: "software-testing-weekly",
    name: "Software Testing Weekly",
    category,
    kind: "feed",
    url: "https://softwaretestingweekly.com/rss",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["newsletter", "testing"],
    filters: { label: "Announcement" },
  },

  // --- Planned: needs a generic HTML/JSON-LD adapter (#26); no feed found ---
  {
    id: "vitest-blog",
    name: "Vitest Blog",
    category,
    kind: "website",
    // Verified live: vitest.dev/blog has no RSS/Atom feed and no
    // autodiscovery <link> tag (VitePress site, blog is just static pages).
    url: "https://vitest.dev/blog",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["vitest", "unit-testing"],
  },
  {
    id: "chromatic-blog",
    name: "Chromatic Blog",
    category,
    kind: "website",
    // Verified live: no rss.xml/feed.xml, no autodiscovery <link> tag.
    url: "https://www.chromatic.com/blog",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["storybook", "visual-testing"],
  },
  {
    id: "mock-service-worker-blog",
    name: "Mock Service Worker Blog",
    category,
    kind: "website",
    // Verified live: mswjs.io/blog is a static page list with no feed and
    // no autodiscovery <link> tag.
    url: "https://mswjs.io/blog",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["msw", "mocking"],
  },
];

export const referenceSources: ReferenceSource[] = [
  {
    id: "playwright-docs",
    name: "Playwright docs",
    category,
    url: "https://playwright.dev/docs/intro",
    note: "Official Playwright documentation.",
  },
  {
    id: "jest-docs",
    name: "Jest docs",
    category,
    url: "https://jestjs.io/docs/getting-started",
    note: "Official Jest documentation.",
  },
  {
    id: "testing-library-docs",
    name: "Testing Library docs",
    category,
    url: "https://testing-library.com/docs/",
    note: "Official Testing Library documentation (covers React, React Native, and other framework bindings).",
  },
  {
    id: "maestro-docs",
    name: "Maestro docs",
    category,
    url: "https://docs.maestro.dev/",
    note: "Official Maestro mobile UI testing documentation.",
  },
  {
    id: "detox-docs",
    name: "Detox docs",
    category,
    url: "https://wix.github.io/Detox/docs/introduction/getting-started/",
    note: "Official Detox gray-box mobile E2E testing documentation.",
  },
  {
    id: "react-native-testing-library-docs",
    name: "React Native Testing Library docs",
    category,
    url: "https://callstack.github.io/react-native-testing-library/",
    note: "Official React Native Testing Library documentation.",
  },
  {
    id: "pact-docs",
    name: "Pact docs",
    category,
    url: "https://docs.pact.io/",
    note: "Official Pact contract-testing documentation.",
  },
  {
    id: "kent-c-dodds-write-tests",
    name: "Kent C. Dodds: Write tests",
    category,
    url: "https://kentcdodds.com/blog/write-tests",
    note: 'Static reference article, not a chronological feed entry: "Write tests. Not too many. Mostly integration."',
  },
];
