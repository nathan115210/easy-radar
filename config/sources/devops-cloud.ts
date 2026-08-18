import type { ReferenceSource, SourceConfig } from "../../shared/schemas/index.js";

export const category = "devops-cloud" as const;

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
    id: "docker-blog",
    name: "Docker Blog",
    category,
    kind: "feed",
    url: "https://www.docker.com/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["docker", "containers"],
  },
  {
    id: "sysdig-blog",
    name: "Sysdig Blog",
    category,
    kind: "feed",
    url: "https://www.sysdig.com/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["security", "observability"],
  },
  {
    id: "kubernetes-blog",
    name: "Kubernetes Blog",
    category,
    kind: "feed",
    url: "https://kubernetes.io/feed.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["kubernetes"],
  },
  {
    id: "github-actions-blog-tag",
    name: "GitHub Actions Blog tag",
    category,
    kind: "feed",
    url: "https://github.blog/tag/github-actions/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["github-actions", "ci"],
  },
  {
    id: "buildkite-blog",
    name: "Buildkite Blog",
    category,
    kind: "feed",
    // Site autodiscovery on /resources/blog/ points at this Atom feed.
    url: "https://buildkite.com/blog.atom",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["ci"],
  },
  {
    id: "circleci-blog",
    name: "CircleCI Blog",
    category,
    // PRD §13.5 routing note: CircleCI belongs only to DevOps, never
    // duplicated elsewhere.
    kind: "feed",
    url: "https://circleci.com/blog/feed.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["ci"],
  },
  {
    id: "aws-architecture-blog",
    name: "AWS Architecture Blog",
    category,
    kind: "feed",
    url: "https://aws.amazon.com/blogs/architecture/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["aws", "cloud"],
  },
  {
    id: "google-cloud-blog",
    name: "Google Cloud Blog",
    category,
    kind: "feed",
    url: "https://cloudblog.withgoogle.com/rss/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["gcp", "cloud"],
  },
  {
    id: "cloudflare-blog",
    name: "Cloudflare Blog",
    category,
    // Full blog feed (PRD §13.5 routing note): the Cloudflare changelog is
    // a separate set of virtual sources below, never duplicated here.
    kind: "feed",
    url: "https://blog.cloudflare.com/rss/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["cloudflare"],
  },
  {
    id: "vercel-changelog",
    name: "Vercel Changelog",
    category,
    // https://vercel.com/atom is a single combined "Vercel News" feed that
    // mixes /blog/ and /changelog/ links (verified live). The full Vercel
    // Blog is a separate Web Core source (PRD §13.1/§13.5 routing note);
    // this virtual source scopes the same shared feed down to changelog
    // entries only, so the two categories never see duplicate items.
    kind: "feed",
    url: "https://vercel.com/atom",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["vercel", "changelog"],
    filters: { virtualScope: { linkPathPrefix: "/changelog/" } },
  },
  {
    id: "supabase-blog",
    name: "Supabase Blog",
    category,
    kind: "feed",
    url: "https://supabase.com/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["supabase", "postgres"],
  },
  {
    id: "neon-blog",
    name: "Neon Blog",
    category,
    // neon.tech/blog/rss.xml 308-redirects here (Neon's docs/marketing
    // domain is now neon.com) — verified live.
    kind: "feed",
    url: "https://neon.com/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["neon", "postgres"],
  },
  {
    id: "hashicorp-blog",
    name: "HashiCorp Blog",
    category,
    kind: "feed",
    url: "https://www.hashicorp.com/blog/feed.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["hashicorp"],
  },
  {
    id: "pulumi-blog",
    name: "Pulumi Blog",
    category,
    kind: "feed",
    url: "https://www.pulumi.com/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["pulumi", "iac"],
  },
  {
    id: "opentofu-blog",
    name: "OpenTofu Blog",
    category,
    kind: "feed",
    url: "https://opentofu.org/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["opentofu", "iac"],
  },
  {
    id: "charity-majors",
    name: "Charity Majors",
    category,
    kind: "feed",
    url: "https://charity.wtf/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["observability"],
  },
  {
    id: "honeycomb-blog",
    name: "Honeycomb Blog",
    category,
    kind: "feed",
    url: "https://www.honeycomb.io/rss/blog.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["observability"],
  },
  {
    id: "grafana-blog",
    name: "Grafana Blog",
    category,
    // Full blog feed (PRD §13.5 routing note): its k6-topic virtual slice
    // belongs to Testing & Release Quality (#41), not here.
    kind: "feed",
    url: "https://grafana.com/blog/index.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["grafana", "observability"],
  },
  {
    id: "opentelemetry-blog",
    name: "OpenTelemetry Blog",
    category,
    kind: "feed",
    url: "https://opentelemetry.io/blog/index.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["opentelemetry", "observability"],
  },

  // --- GitHub Changelog virtual source (PRD §13.7, §27; see #27) ---
  // Shares its URL/adapter with the real GitHub Changelog site (the same
  // base feed the AI Engineering category's Copilot virtual slice, #37,
  // scopes independently). The changelog has no per-item label/category
  // field in the feed XML itself (verified live) and no stable link-path
  // segmentation, so titleContains is the only available discriminator.
  // Verified against real entries: many genuine Actions items do carry
  // "Actions" in the title ("Actions steps can now be run in parallel",
  // "GitHub Actions holds potentially malicious workflows for approval"),
  // but some (e.g. "setup-java v5.5.0...", "Xcode 27 runner image...")
  // don't — those are silently missed by this filter, a known limitation
  // of the single-substring virtualScope model rather than a bug.
  {
    id: "github-actions-changelog",
    name: "GitHub Actions changelog",
    category,
    kind: "feed",
    url: "https://github.blog/changelog/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["github-actions", "changelog"],
    filters: { virtualScope: { titleContains: "Actions" } },
  },

  // --- Cloudflare changelog virtual sources, filtered to Workers, Pages,
  // D1, and R2 (PRD §13.5; acceptance criteria requires this be
  // fixture-tested, see devops-cloud.test.ts) ---
  // The real changelog feed (verified live at
  // https://developers.cloudflare.com/changelog/rss/index.xml) has no
  // per-product URL segmentation — every item's link is
  // /changelog/post/<date>-<slug>/ regardless of product — so a single
  // linkPathPrefix can't isolate a product. Titles do carry a reliable
  // "<Product[, Product...]> - <headline>" prefix (e.g. "R2 - Sippy now
  // supports Azure Blob Storage...", "D1 - D1 migrations support nested
  // layouts..."), so each product gets its own titleContains virtual
  // source rather than one filter expressing an OR of four substrings
  // (applyVirtualScope only ANDs a single titleContains/titleExcludes/
  // linkPathPrefix — see scripts/collect/virtual-source-filter.ts). All
  // four share the same URL/adapter as an ordinary virtual source would;
  // dedup.ts resolves the rare case where one item's title matches more
  // than one of these four (e.g. a cross-cutting "Workers, D1, R2, ..."
  // item) so it's kept exactly once, not duplicated across the category.
  {
    id: "cloudflare-changelog-workers",
    name: "Cloudflare changelog: Workers",
    category,
    kind: "feed",
    url: "https://developers.cloudflare.com/changelog/rss/index.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["cloudflare", "workers", "changelog"],
    filters: { virtualScope: { titleContains: "Workers" } },
  },
  {
    id: "cloudflare-changelog-pages",
    name: "Cloudflare changelog: Pages",
    category,
    kind: "feed",
    url: "https://developers.cloudflare.com/changelog/rss/index.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["cloudflare", "pages", "changelog"],
    filters: { virtualScope: { titleContains: "Pages" } },
  },
  {
    id: "cloudflare-changelog-d1",
    name: "Cloudflare changelog: D1",
    category,
    kind: "feed",
    url: "https://developers.cloudflare.com/changelog/rss/index.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["cloudflare", "d1", "changelog"],
    filters: { virtualScope: { titleContains: "D1" } },
  },
  {
    id: "cloudflare-changelog-r2",
    name: "Cloudflare changelog: R2",
    category,
    kind: "feed",
    url: "https://developers.cloudflare.com/changelog/rss/index.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["cloudflare", "r2", "changelog"],
    filters: { virtualScope: { titleContains: "R2" } },
  },

  // --- Stable releases (github-release adapter) ---
  {
    id: "terraform-releases",
    name: "Terraform stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/hashicorp/terraform",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["terraform", "iac"],
  },
  {
    id: "pulumi-releases",
    name: "Pulumi stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/pulumi/pulumi",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["pulumi", "iac"],
  },
  {
    id: "opentofu-releases",
    name: "OpenTofu stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/opentofu/opentofu",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["opentofu", "iac"],
  },

  // --- Planned: no working feed found (generic HTML/JSON-LD adapter, #26) ---
  {
    id: "earthly-blog",
    name: "Earthly Blog",
    category,
    // Verified live: no RSS/Atom autodiscovery on /blog, and /blog/index.xml,
    // /index.xml, /blog/rss.xml, /blog/feed all 404. The page does carry a
    // JSON-LD block, so generic-html-json-ld is the right adapter once wired
    // for a bespoke selector — not yet built for this source's markup.
    kind: "website",
    url: "https://earthly.dev/blog",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["ci", "build-tools"],
  },
  {
    id: "timescale-blog",
    name: "Timescale Blog",
    category,
    // Verified live: timescale.com now redirects to tigerdata.com (product
    // rebrand), and every guessed feed path there (/blog/rss.xml, etc.)
    // resolves 200 but returns the SPA's HTML shell, not real XML — no
    // working feed found. Needs the generic HTML/JSON-LD adapter (#26)
    // confirmed against the new tigerdata.com markup before activation.
    kind: "website",
    url: "https://www.tigerdata.com/blog",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["postgres", "timeseries"],
  },
];

export const referenceSources: ReferenceSource[] = [
  {
    id: "docker-docs",
    name: "Docker docs",
    category,
    url: "https://docs.docker.com/",
  },
  {
    id: "github-actions-docs",
    name: "GitHub Actions docs",
    category,
    url: "https://docs.github.com/en/actions",
  },
  {
    id: "aws-docs",
    name: "AWS docs",
    category,
    url: "https://docs.aws.amazon.com/",
  },
  {
    id: "cloudflare-workers-docs",
    name: "Cloudflare Workers docs",
    category,
    url: "https://developers.cloudflare.com/workers/",
  },
  {
    id: "vercel-docs",
    name: "Vercel docs",
    category,
    url: "https://vercel.com/docs",
  },
  {
    id: "postgresql-docs",
    name: "PostgreSQL docs",
    category,
    url: "https://www.postgresql.org/docs/",
  },
  {
    id: "terraform-docs",
    name: "Terraform docs",
    category,
    url: "https://developer.hashicorp.com/terraform/docs",
  },
];
