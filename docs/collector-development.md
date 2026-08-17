# Collector development

Stub. Expanded in #35 alongside the user manual and reference sources doc.

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
