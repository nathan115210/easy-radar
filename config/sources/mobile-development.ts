import type { ReferenceSource, SourceConfig } from "../../shared/schemas/index.js";

export const category = "mobile-development" as const;

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
    id: "react-native-blog",
    name: "React Native Blog",
    category,
    kind: "feed",
    url: "https://reactnative.dev/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native"],
  },
  {
    id: "callstack-blog",
    name: "Callstack Blog",
    category,
    kind: "feed",
    url: "https://www.callstack.com/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native", "callstack"],
  },
  {
    id: "software-mansion-blog",
    name: "Software Mansion Blog",
    category,
    kind: "feed",
    url: "https://swmansion.com/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native", "reanimated"],
  },
  {
    id: "expo-blog",
    name: "Expo Blog",
    category,
    kind: "feed",
    url: "https://expo.dev/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["expo"],
  },
  {
    id: "expo-changelog",
    name: "Expo Changelog",
    category,
    kind: "feed",
    url: "https://expo.dev/changelog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["expo", "changelog"],
  },
  {
    id: "start-react-native",
    name: "Start React Native",
    category,
    kind: "feed",
    url: "https://start-react-native.dev/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native", "newsletter"],
  },
  {
    id: "emerge-tools-blog",
    name: "Emerge Tools Blog",
    category,
    kind: "feed",
    // RSS href verified via <link rel="alternate" type="application/rss+xml">
    // autodiscovery tag on https://www.emergetools.com/blog.
    url: "https://www.emergetools.com/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["mobile", "app-size"],
  },
  {
    id: "runway-blog",
    name: "Runway Blog",
    category,
    kind: "feed",
    url: "https://www.runway.team/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["mobile", "release-management"],
  },
  {
    id: "bitrise-blog",
    name: "Bitrise Blog",
    category,
    kind: "feed",
    url: "https://bitrise.io/blog/rss.xml",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["mobile", "ci-cd"],
  },
  {
    id: "infinite-red-shift",
    name: "Infinite Red / Shift",
    category,
    kind: "feed",
    url: "https://shift.infinite.red/feed",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native", "newsletter"],
  },

  // --- Planned: no working feed found (verified live during onboarding;
  // 2-3 URL variants each, plus autodiscovery-tag checks) ---
  {
    id: "evan-bacon",
    name: "Evan Bacon",
    category,
    kind: "website",
    // No /rss.xml, /feed.xml, or <link rel="alternate" ...rss+xml> found —
    // the site is a client-rendered Expo Router app with no server feed.
    url: "https://evanbacon.dev/",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["expo", "react-native"],
  },
  {
    id: "marc-rousavy",
    name: "Marc Rousavy",
    category,
    kind: "website",
    // No /rss.xml, /feed.xml, or autodiscovery tag found on the homepage
    // or /blog.
    url: "https://mrousavy.com/blog",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["react-native", "vision-camera"],
  },
  {
    id: "bam-tech",
    name: "BAM Tech",
    category,
    kind: "website",
    // Domain does not resolve (NXDOMAIN for tech.bam.tech during onboarding)
    // — kept as the URL from the issue in case it's a transient DNS/hosting
    // issue, but unverified.
    url: "https://tech.bam.tech",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["mobile"],
  },

  // --- Stable releases (github-release adapter) ---
  {
    id: "react-native-releases",
    name: "React Native stable releases",
    category,
    kind: "github-release",
    // facebook/react-native now redirects to react/react-native (same org
    // move already reflected by react-releases in web-core.ts).
    url: "https://github.com/react/react-native",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native"],
  },
  {
    id: "expo-releases",
    name: "Expo stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/expo/expo",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["expo"],
  },
  {
    id: "hermes-releases",
    name: "Hermes stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/facebook/hermes",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["hermes", "react-native"],
  },
  {
    id: "react-navigation-releases",
    name: "React Navigation stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/react-navigation/react-navigation",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native", "navigation"],
  },
  {
    id: "reanimated-releases",
    name: "Reanimated stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/software-mansion/react-native-reanimated",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native", "reanimated"],
  },
  {
    id: "vision-camera-releases",
    name: "Vision Camera stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/mrousavy/react-native-vision-camera",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native", "camera"],
  },
  {
    id: "shopify-flashlist-releases",
    name: "Shopify FlashList stable releases",
    category,
    kind: "github-release",
    url: "https://github.com/Shopify/flash-list",
    adapter: "github-release",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native", "flashlist"],
  },

  // --- Planned: needs the RFC/proposal lifecycle adapter, built but not
  // wired into the default registry (mirrors react-rfc-events in
  // web-core.ts, #29) ---
  {
    id: "react-native-proposal-events",
    name: "React Native proposal events",
    category,
    kind: "github-event",
    url: "https://github.com/react-native-community/discussions-and-proposals",
    // scripts/collect/adapters/react-native-proposals.ts exists but is not
    // registered in scripts/collect/default-registry.ts yet.
    adapter: "react-native-proposals",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["react-native", "rfc"],
  },

  // --- Virtual filtered sources (share a fetch with a broader source,
  // narrowed via filters.virtualScope; see
  // scripts/collect/virtual-source-filter.ts) ---
  {
    id: "meta-engineering-android-rn",
    name: "Meta Engineering Android (React Native)",
    category,
    kind: "feed",
    // Meta Engineering's Android-category feed, verified live to return a
    // real RSS document; filtered to just React Native coverage since the
    // category as a whole is general Android engineering.
    url: "https://engineering.fb.com/category/android/feed/",
    adapter: "feed",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "active",
    tags: ["react-native", "meta"],
    filters: { virtualScope: { titleContains: "React Native" } },
  },
  {
    id: "shopify-engineering-mobile",
    name: "Shopify Engineering Mobile",
    category,
    kind: "website",
    // No feed found for shopify.engineering (base or /category/mobile —
    // checked /feed, /feed.xml, /rss, /rss.xml, /index.xml, and the
    // homepage for an autodiscovery <link> tag; it's a client-rendered
    // site with no server feed). Kept as a virtual source definition so
    // the filter/tests are ready once a working fetch path is found.
    url: "https://shopify.engineering/category/mobile",
    adapter: "generic-html-json-ld",
    initialSyncFrom: INITIAL_SYNC_FROM,
    status: "planned",
    tags: ["shopify", "mobile"],
    filters: { virtualScope: { linkPathPrefix: "/category/mobile" } },
  },
];

export const referenceSources: ReferenceSource[] = [
  {
    id: "react-native-architecture",
    name: "React Native Architecture",
    category,
    url: "https://reactnative.dev/architecture/overview",
    note: "Reference documentation on the New Architecture, not a chronological event stream.",
  },
  {
    id: "expo-eas-docs",
    name: "Expo EAS documentation",
    category,
    url: "https://docs.expo.dev/eas/",
    note: "Build/submit/update service docs.",
  },
  {
    id: "fastlane-docs",
    name: "fastlane documentation",
    category,
    url: "https://docs.fastlane.tools",
    note: "Mobile release automation tooling docs.",
  },
];
