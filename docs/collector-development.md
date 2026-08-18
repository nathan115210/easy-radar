# Collector development

Internal maintenance guidance for the collector and its source adapters,
kept separate from [`user-manual.md`](user-manual.md) so the daily
reading/collecting workflow document stays focused. If you're looking
for how to *use* the app, start there instead.

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

## Stateful adapters and cursor fragments

Almost every adapter is stateless across runs — windowing and gap
recovery already happen generically after collection
(`apply-collection-window.ts`), keyed only on item dates. A source that
needs to diff its *own* state between runs (PRD §11.6's TC39 proposal
lifecycle is the only current example) uses two extra, optional hooks on
`Adapter`:

- `AdapterContext.previousCursor` — the source's `SourceCursor` as of the
  end of the previous run, passed into `collect()`.
- `Adapter.deriveCursorFragment(items, previousCursor)` — a synchronous,
  pure function called right after `collect()` returns; its return value
  is merged into that source's `SourceCursor` for next run, on top of
  whatever the engine already derived generically from item dates.

Every other adapter can ignore both entirely — `collect()`'s signature
and return type haven't changed for them, and `deriveCursorFragment` is
optional. See `scripts/collect/adapters/tc39-proposals.ts` for the one
adapter that uses this (proposal → stage tracking).

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

## Repairing a failing source

A source turns `Failing` on the Sources page when it errors during a
run rather than merely returning zero items (an empty feed is a normal,
silent outcome — see `docs/collector-development.md`'s adapter
descriptions above); the specific reason is shown right there next to
the source, and the same run's other sources are unaffected (PRD §7.2's
per-source isolation).

1. **Reproduce.** Run `pnpm collect` locally and read the terminal
   summary for that source's error — a non-2xx HTTP status, a feed that
   no longer parses, or a page whose structure no longer matches the
   configured selectors are the common cases.
2. **Diagnose against PRD §11.1's priority order**, not by immediately
   reaching for a bespoke fix:
   - A feed that started 404ing or redirecting: check whether the site
     moved its feed URL, and update `SourceConfig.url` (a plain
     "redirect normalized without changing source intent" edit, not a
     behavior change).
   - A `generic-html-json-ld` or `official-api` source whose page/API
     shape changed: update the relevant `filters` (`itemSelector`,
     `headingField`, etc.) to match the new shape — see the sections
     above for what each field means.
   - A site that dropped its feed entirely and now requires a lower
     adapter tier: re-onboard it at the next tier down, same as any new
     source (see "Adapter priority order" above).
3. **If nothing at the configured tier works anymore** (the feed is
   gone and no lower tier is viable without a bespoke adapter), set
   `status: "planned"` rather than leaving it `Failing` indefinitely,
   with a code comment stating why — a `Planned` source reads as "known,
   not currently collectible," which is honest; a `Failing` source that
   never gets fixed just becomes permanent alert noise.
4. **Verify the fix** with `pnpm collect` again before committing — a
   source config change is reviewed code, like any other, and should
   actually produce valid items (or a deliberate `planned` status) before
   it merges.
