# Collector development

Stub. Expanded in #35 alongside the user manual and reference sources doc.

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
