# Collector development

Further expanded in #35 alongside the user manual and reference sources doc.

## Adapter priority order (PRD §11.1)

When onboarding a source, pick the *first* tier that actually works for
it — lower tiers exist only for sources the higher ones can't cover:

1. **`feed`** — RSS 2.0, Atom, or JSON Feed. One adapter handles all
   three formats; adding a source needs config only
   (`scripts/collect/adapters/feed.ts`).
2. **`github-release`** — a repo's GitHub Releases
   (`scripts/collect/adapters/github-releases.ts`).
3. **`official-api`** — a documented official JSON endpoint with no feed
   (a changelog API, for example). Configure `SourceConfig.filters`:
   - `itemsPath` — dot-path to the array of items in the response body
     (omit if the response is itself the array).
   - `headingField` / `linkField` — keys on each item; default to
     `"title"` / `"url"`.
   - `dateField` — key holding a parseable date string; omit for a
     source with no trustworthy date (PRD §11.3 undated handling
     applies — items get `dateBasis: "discovered"`).

   A response that no longer matches these filters (a renamed field, the
   items array moved) throws a specific error naming what broke, never a
   silent empty result.
4. **`generic-html-json-ld`** — the last resort, only when no feed or API
   exists. Prefers a schema.org `ItemList` JSON-LD block on the page;
   falls back to Cheerio HTML parsing only when no JSON-LD is found.
   Configure `SourceConfig.filters` for the Cheerio tier:
   - `itemSelector` — CSS selector for each item's container; omit when
     the whole page is a single article.
   - `headingSelector` — default `"h1, h2, h3"`.
   - `linkSelector` — omit to use the heading's own link, or its nearest
     ancestor `<a>`.
   - `dateSelector` / `dateAttr` — selector for the date element, and
     which attribute to read it from (element text otherwise).

   **Browser automation is never a default collection adapter** (PRD
   §14.4). A JavaScript-only source that renders nothing in the raw HTML
   response stays `status: "planned"` — with a code comment stating why —
   rather than getting a bespoke headless-browser adapter without
   explicit product approval.

Both `official-api` and `generic-html-json-ld` are single, generic,
config-driven adapters — the same code serves every source of that
kind. A genuinely bespoke, source-specific adapter (parsing a page no
generic selector set can express) is the true last resort beyond even
these two, and needs the same fixture-plus-test treatment described
below, at minimum.

## Virtual filtered sources (PRD §11.4, §12, §27)

A "virtual source" is a `SourceConfig` that shares a URL and adapter
with a broader source but scopes itself to a subset of what that URL
returns — its own id, category, cursor, and status entry, but the same
underlying fetch. Set `filters.virtualScope` on the narrower source:

```ts
filters: {
  virtualScope: {
    titleContains: "Copilot",   // heading must contain this (case-insensitive)
    titleExcludes: "deprecated", // heading must NOT contain this
    linkPathPrefix: "/testing/", // the link's path must start with this
  },
}
```

Every constraint present must match; omit any you don't need. This
applies generically after any adapter's `collect()` returns
(`applyVirtualScope` in `virtual-source-filter.ts`), so it works
identically whether the shared source is a feed, an official API, or
generic HTML. `resolveDuplicates` (`dedup.ts`) already resolves the case
where a broad and a filtered source both discover the same canonical
URL — the source with more filter constraints wins, exactly once.

## Newsletter sources (PRD §30)

A newsletter where one issue is one `NewsItem` (JavaScript Weekly,
Frontend Focus, This Week in React, ...) is an ordinary `kind: "feed"`
source — every newsletter onboarded so far has a real RSS/Atom feed, and
one feed entry per issue is exactly what `createFeedAdapter` already
produces, with no fan-out into the issue's embedded article links. There
is no dedicated "newsletter" adapter or kind.

The one thing worth setting explicitly is the label: a newsletter issue
reads as `Announcement`, not the feed adapter's default `Engineering
Article`. Set it via `filters.label`:

```ts
filters: { label: "Announcement" }
```

Any `NewsLabel` value works here, not just `Announcement` — it overrides
the feed adapter's default for that one source.

## Testing conventions

- Tests run on Vitest (`pnpm test`), configured in `vitest.config.ts`.
- Adapter tests live in `tests/adapters/`. Per PRD §11.1, any custom adapter (the
  last-resort tier below RSS/Atom/JSON Feed, the GitHub API, an official API, and
  generic HTML/JSON-LD extraction) requires a small saved fixture plus a parser test.
- Fixtures live in `tests/fixtures/`, grouped in a subdirectory named after the
  adapter or source they belong to, e.g. `tests/fixtures/<adapter-name>/<case>.<ext>`.
  Keep fixtures small and trimmed to the parts the parser actually exercises.
- Load a fixture with the `loadFixture` helper in `tests/fixtures/load-fixture.ts`,
  which resolves a path relative to `tests/fixtures/`:

  ```ts
  import { loadFixture } from "../fixtures/load-fixture.js";

  const html = loadFixture("some-adapter/basic-page.html");
  ```

- Domain logic and Express API integration tests are colocated with their source
  files as `*.test.ts`, rather than living under `tests/`.
