import type { ReferenceSource, SourceConfig } from "../../shared/schemas/index.js";

export const category = "software-architecture" as const;

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
    id: "bytebytego-blog",
    name: "ByteByteGo",
    category,
    kind: "feed",
    url: "https://blog.bytebytego.com/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["system-design"],
  },
  {
    id: "high-scalability",
    name: "High Scalability",
    category,
    kind: "feed",
    url: "http://highscalability.com/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["system-design", "scalability"],
  },
  {
    id: "murat-demirbas-blog",
    name: "Murat Demirbas",
    category,
    kind: "feed",
    // Issue #39 listed https://murat.github.io, which is an unrelated
    // person's site (verified live during onboarding). Murat Demirbas's
    // actual distributed-systems blog is muratbuffalo.blogspot.com.
    url: "https://muratbuffalo.blogspot.com/feeds/posts/default?alt=rss",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["distributed-systems"],
  },
  {
    id: "netflix-techblog",
    name: "Netflix TechBlog",
    category,
    kind: "feed",
    url: "https://netflixtechblog.com/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["engineering-blog"],
  },
  {
    id: "spotify-engineering",
    name: "Spotify Engineering",
    category,
    kind: "feed",
    url: "https://engineering.atspotify.com/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["engineering-blog"],
  },
  {
    id: "martin-fowler",
    name: "Martin Fowler",
    category,
    kind: "feed",
    // Full feed (PRD routing note, #39): the /testing/ path-filtered
    // virtual slice belongs to Testing (#41), not duplicated here.
    url: "https://martinfowler.com/feed.atom",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["architecture", "design"],
  },
  {
    id: "brandur",
    name: "Brandur",
    category,
    kind: "feed",
    url: "https://brandur.org/articles.atom",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["engineering-blog"],
  },
  {
    id: "clean-coder",
    name: "Clean Coder",
    category,
    kind: "feed",
    url: "https://blog.cleancoder.com/atom.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["craftsmanship"],
  },
  {
    id: "khalil-stemmler",
    name: "Khalil Stemmler",
    category,
    kind: "feed",
    url: "https://khalilstemmler.com/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["ddd", "typescript"],
  },
  {
    id: "enterprise-craftsmanship",
    name: "Enterprise Craftsmanship",
    category,
    kind: "feed",
    url: "https://enterprisecraftsmanship.com/index.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["ddd", "craftsmanship"],
  },
  {
    id: "planetscale-blog",
    name: "PlanetScale Blog",
    category,
    kind: "feed",
    url: "https://planetscale.com/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["databases"],
  },
  {
    id: "confluent-blog",
    name: "Confluent Blog",
    category,
    kind: "feed",
    url: "https://www.confluent.io/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["streaming", "kafka"],
  },
  {
    id: "redis-blog",
    name: "Redis Blog",
    category,
    kind: "feed",
    url: "https://redis.io/blog/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["databases"],
  },
  {
    id: "apis-you-wont-hate",
    name: "APIs You Won't Hate",
    category,
    kind: "feed",
    url: "https://apisyouwonthate.com/rss/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["api-design"],
  },
  {
    id: "slack-engineering",
    name: "Slack Engineering",
    category,
    kind: "feed",
    url: "https://slack.engineering/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["engineering-blog"],
  },
  {
    id: "pragmatic-engineer",
    name: "Pragmatic Engineer",
    category,
    kind: "feed",
    url: "https://blog.pragmaticengineer.com/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["engineering-blog"],
  },
  {
    id: "architecture-notes",
    name: "Architecture Notes",
    category,
    kind: "feed",
    url: "https://architecturenotes.co/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["architecture"],
  },
  {
    id: "airbnb-techblog",
    name: "Airbnb Tech Blog",
    category,
    kind: "feed",
    url: "https://medium.com/feed/airbnb-engineering",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["engineering-blog"],
  },
  {
    id: "dropbox-techblog",
    name: "Dropbox Tech Blog",
    category,
    kind: "feed",
    url: "https://dropbox.tech/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["engineering-blog"],
  },

  // --- Planned: feed endpoint unverified or unreachable during onboarding ---
  {
    id: "stripe-engineering",
    name: "Stripe Engineering",
    category,
    kind: "feed",
    // Page's own <link rel="alternate"> advertises this exact path, but
    // it 404s live — verified during onboarding. Kept as the best-guess
    // URL pending Stripe fixing the endpoint.
    url: "https://stripe.com/blog/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["engineering-blog"],
  },
  {
    id: "uber-engineering",
    name: "Uber Engineering",
    category,
    kind: "feed",
    // Every URL variant tried (rss/, rss.xml, feed) returned 403/406
    // regardless of user agent — verified during onboarding. Site
    // appears to bot-block unauthenticated feed requests.
    url: "https://www.uber.com/blog/engineering/rss/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["engineering-blog"],
  },
  {
    id: "discord-engineering",
    name: "Discord Engineering",
    category,
    kind: "feed",
    // Only a general company blog feed was found (verified live); it
    // mixes non-engineering posts (community/policy announcements) and
    // isn't scoped to the /category/engineering/ section, so activating
    // it as-is would misrepresent this category's coverage. Needs a
    // validated virtualScope filter (or a category-specific feed, if
    // Discord ever adds one) before activation.
    url: "https://discord.com/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["engineering-blog"],
  },
  {
    id: "doordash-engineering",
    name: "DoorDash Engineering",
    category,
    kind: "feed",
    // Returns 403 across every user agent tried during onboarding —
    // likely bot-blocked. URL unverified.
    url: "https://doordash.engineering/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["engineering-blog"],
  },

  // --- Planned: needs the generic HTML/JSON-LD adapter path; no working feed found ---
  {
    id: "jepsen-analyses",
    name: "Jepsen analyses",
    category,
    kind: "website",
    // Static HTML table of analyses; no RSS/Atom feed found on the
    // domain during onboarding.
    url: "https://jepsen.io/analyses",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["distributed-systems", "correctness"],
  },
  {
    id: "aws-builders-library",
    name: "AWS Builders' Library",
    category,
    kind: "website",
    // Static content library; no RSS/Atom feed found during onboarding.
    url: "https://aws.amazon.com/builders-library/",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["aws", "architecture"],
  },
  {
    id: "shopify-engineering",
    name: "Shopify Engineering",
    category,
    kind: "website",
    // Full blog (PRD routing note, #39): the mobile-filtered virtual
    // slice belongs to Mobile (#38), not duplicated here. blog.atom
    // returns the client-rendered app shell, not feed content — no
    // working static feed found during onboarding.
    url: "https://shopify.engineering",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["engineering-blog"],
  },
  {
    id: "cockroach-labs-blog",
    name: "Cockroach Labs Blog",
    category,
    kind: "website",
    // No feed found after several common paths tried live during
    // onboarding (rss.xml, feed.xml, atom.xml, rss/, index.xml).
    url: "https://www.cockroachlabs.com/blog/",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["databases"],
  },
  {
    id: "figma-engineering",
    name: "Figma Engineering",
    category,
    kind: "website",
    // /blog/engineering/rss.xml returns HTTP 200 with an XML content
    // type, but the body is actually Figma's Next.js error page — a
    // false positive caught by inspecting the response body, not just
    // the status/content-type, during onboarding. No working feed found.
    url: "https://www.figma.com/blog/engineering/",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["engineering-blog"],
  },
  {
    id: "effective-typescript-blog",
    name: "Effective TypeScript Blog",
    category,
    kind: "website",
    // feed.xml returns HTTP 200 but the body is GitHub Pages's "not
    // found" page — a false positive caught by inspecting the response
    // body during onboarding. No working feed found.
    url: "https://effectivetypescript.com/blog",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["typescript"],
  },
];

export const referenceSources: ReferenceSource[] = [
  {
    id: "system-design-primer",
    name: "System Design Primer",
    category,
    url: "https://github.com/donnemartin/system-design-primer",
    note: "Community-maintained reference for learning system design fundamentals.",
  },
  {
    id: "refactoring-guru",
    name: "Refactoring.Guru",
    category,
    url: "https://refactoring.guru",
    note: "Catalog of design patterns and refactoring techniques.",
  },
  {
    id: "ddd-crew",
    name: "DDD Crew",
    category,
    url: "https://github.com/ddd-crew",
    note: "Community-maintained Domain-Driven Design tools and templates.",
  },
  {
    id: "typescript-documentation",
    name: "TypeScript documentation",
    category,
    url: "https://www.typescriptlang.org/docs/",
    note: "Official TypeScript language and compiler reference.",
  },
];
