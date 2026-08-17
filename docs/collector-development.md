# Collector development

Stub. Expanded in #35 alongside the user manual and reference sources doc.

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
