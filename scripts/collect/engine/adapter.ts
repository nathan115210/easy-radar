import type { NewsItem, SourceConfig, SourceCursor } from "../../../shared/schemas/index.js";

export type AdapterContext = {
  source: SourceConfig;
  signal: AbortSignal;
  /**
   * The source's cursor as of the end of the previous run, when one
   * exists. Almost every adapter ignores this — windowing/gap-recovery
   * already happens generically after collection (`apply-collection-
   * window.ts`). It exists for the rare adapter that needs to diff
   * against its own prior state itself, e.g. TC39 proposal stage
   * tracking (#28), which no generic date-based window can express.
   */
  previousCursor?: SourceCursor;
};

/**
 * The engine owns orchestration; an adapter only fetches and parses one
 * source (PRD §11, §14.4). PRD §11.1's priority order (feed -> GitHub API
 * -> official API -> generic HTML/JSON-LD -> custom adapter) is guidance
 * for choosing which adapter a source is configured with at onboarding
 * time (#36-#42) — a single collection run has exactly one adapter per
 * source already fixed by SourceConfig.adapter, so there's no runtime
 * fallback order for the engine to enforce.
 *
 * `deriveCursorFragment` is optional and almost never implemented: extra
 * fields (e.g. TC39's `proposalStages`) to merge into this source's
 * `SourceCursor` for next run, beyond what the engine already derives
 * generically from item dates. It's synchronous and pure — given the same
 * items and previous cursor `collect()` just ran with, it must produce the
 * same fragment, so the engine can call it right after `collect()`
 * without any extra I/O or nondeterminism.
 */
export type Adapter = {
  name: string;
  collect(context: AdapterContext): Promise<NewsItem[]>;
  deriveCursorFragment?(
    items: readonly NewsItem[],
    previousCursor: SourceCursor | undefined,
  ): Record<string, unknown> | undefined;
};

export type AdapterRegistry = ReadonlyMap<string, Adapter>;

export function createAdapterRegistry(adapters: readonly Adapter[]): AdapterRegistry {
  const registry = new Map<string, Adapter>();
  for (const adapter of adapters) {
    if (registry.has(adapter.name)) {
      throw new Error(`Duplicate adapter registered: "${adapter.name}"`);
    }
    registry.set(adapter.name, adapter);
  }
  return registry;
}
