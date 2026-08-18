import type { Category, NewsItem } from "../../../shared/schemas/index.js";

/**
 * Deterministic-id-shaped fixture ids (`^[0-9a-f]{16}$`, PRD §7/#7): the
 * finish-reading flow validates news-id-format before it will commit
 * anything, so a hand-written id like `"web-core-1"` would 422 the moment
 * a smoke test reaches #21's workflow.
 */
const CATEGORY_HEX_PREFIX: Record<Category, string> = {
  "web-core": "ca11",
  "ai-engineering": "a1e0",
  "mobile-development": "cafe",
  "software-architecture": "5ec0",
  "devops-cloud": "dea0",
  "testing-quality": "7e57",
  "developer-tooling": "d0f1",
};

function fixtureId(category: Category, index: number): string {
  return CATEGORY_HEX_PREFIX[category] + index.toString(16).padStart(12, "0");
}

function jsonFile(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

/** `daysAgo` days before a fixed anchor, as `YYYY-MM-DD` — avoids month-rollover bugs from naive string padding. */
function isoDate(daysAgo: number): string {
  const date = new Date("2026-06-01T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export type FixtureItem = NewsItem & { id: string };

/** `web-core`: enough unread items to force a second page (PRD §6.1 pagination). */
export const WEB_CORE_ITEM_COUNT = 51;
export const webCoreItems: FixtureItem[] = Array.from({ length: WEB_CORE_ITEM_COUNT }, (_, i) => ({
  id: fixtureId("web-core", i),
  sourceId: "e2e-fixture-web-core",
  heading: `Web Core Item ${i + 1}`,
  label: "Engineering Article",
  link: `https://example.com/web-core/${i + 1}`,
  date: isoDate(i),
  dateBasis: "published",
  category: "web-core",
  tags: [],
}));

/** `ai-engineering` / `software-architecture`: a few items each, for category/state filtering. */
export const aiEngineeringItems: FixtureItem[] = [
  {
    id: fixtureId("ai-engineering", 0),
    sourceId: "e2e-fixture-ai",
    heading: "AI Engineering Item One",
    label: "Announcement",
    link: "https://example.com/ai/1",
    date: "2026-02-01",
    dateBasis: "published",
    category: "ai-engineering",
    tags: [],
  },
  {
    id: fixtureId("ai-engineering", 1),
    sourceId: "e2e-fixture-ai",
    heading: "AI Engineering Item Two",
    label: "Announcement",
    link: "https://example.com/ai/2",
    date: "2026-02-02",
    dateBasis: "published",
    category: "ai-engineering",
    tags: [],
  },
];

export const softwareArchitectureItems: FixtureItem[] = [
  {
    id: fixtureId("software-architecture", 0),
    sourceId: "e2e-fixture-arch",
    heading: "Software Architecture Item One",
    label: "Engineering Article",
    link: "https://example.com/arch/1",
    date: "2026-02-03",
    dateBasis: "published",
    category: "software-architecture",
    tags: [],
  },
];

/** `devops-cloud`: a dedicated pair for the read/ignore/finish-reading workflow spec. */
export const devopsReadItem: FixtureItem = {
  id: fixtureId("devops-cloud", 0),
  sourceId: "e2e-fixture-devops",
  heading: "DevOps Item To Mark Read",
  label: "Release",
  link: "https://example.com/devops/read",
  date: "2026-03-01",
  dateBasis: "published",
  category: "devops-cloud",
  tags: [],
};

export const devopsIgnoreItem: FixtureItem = {
  id: fixtureId("devops-cloud", 1),
  sourceId: "e2e-fixture-devops",
  heading: "DevOps Item To Ignore",
  label: "Release",
  link: "https://example.com/devops/ignore",
  date: "2026-03-02",
  dateBasis: "published",
  category: "devops-cloud",
  tags: [],
};

export const allFixtureItems: FixtureItem[] = [
  ...webCoreItems,
  ...aiEngineeringItems,
  ...softwareArchitectureItems,
  devopsReadItem,
  devopsIgnoreItem,
];

/** Builds the `data/*.json` file contents the e2e server seeds onto the `data` branch. */
export function buildFixtureFiles(): Record<string, string> {
  const now = new Date().toISOString();

  const newsStates = Object.fromEntries(
    allFixtureItems.map((item) => [item.id, { state: "unread" as const, updatedAt: now }]),
  );

  return {
    "data/news.json": jsonFile(allFixtureItems),
    "data/news-states.json": jsonFile({ schemaVersion: 1, items: newsStates }),
    "data/collection-cursors.json": jsonFile({ schemaVersion: 1, cursors: {} }),
    "data/collection-status.json": jsonFile({
      schemaVersion: 1,
      lastRunAt: now,
      coverage: {
        succeeded: allFixtureItems.length,
        failed: 0,
        planned: 0,
        added: allFixtureItems.length,
        total: allFixtureItems.length,
      },
      sources: {},
    }),
  };
}
