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
