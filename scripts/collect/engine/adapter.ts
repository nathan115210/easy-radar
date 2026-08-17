import type { NewsItem, SourceConfig } from "../../../shared/schemas/index.js";

export type AdapterContext = {
  source: SourceConfig;
  signal: AbortSignal;
};

/**
 * The engine owns orchestration; an adapter only fetches and parses one
 * source (PRD §11, §14.4). PRD §11.1's priority order (feed -> GitHub API
 * -> official API -> generic HTML/JSON-LD -> custom adapter) is guidance
 * for choosing which adapter a source is configured with at onboarding
 * time (#36-#42) — a single collection run has exactly one adapter per
 * source already fixed by SourceConfig.adapter, so there's no runtime
 * fallback order for the engine to enforce.
 */
export type Adapter = {
  name: string;
  collect(context: AdapterContext): Promise<NewsItem[]>;
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
