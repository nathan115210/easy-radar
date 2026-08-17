import { readCollectionStatus } from "../storage/index.js";
import {
  CategorySchema,
  type CategorySources,
  type ReferenceSource,
  type SourceConfig,
} from "../../shared/schemas/index.js";

/**
 * Joins the TypeScript source configuration (#5) with the runtime
 * diagnostics in collection-status.json (#6) — the same config the
 * collector reads, preventing UI/config drift (PRD §6.4). Takes the
 * source lists as parameters rather than importing config/sources
 * directly, so it composes with whatever config the caller has (the real
 * one in production, a synthetic fixture in tests).
 *
 * Reference-only sources carry no runtime status and are never part of
 * coverage math (PRD §7.4) — they're joined in as-is, unconditionally
 * "not collected".
 */
export async function getSourcesGroupedByCategory(
  dataDir: string,
  sources: readonly SourceConfig[],
  referenceSources: readonly ReferenceSource[],
): Promise<CategorySources[]> {
  const status = await readCollectionStatus(dataDir);

  return CategorySchema.options.map((category) => {
    const inCategory = sources.filter((source) => source.category === category);

    const monitored = inCategory.map((source) => {
      const runtime = status.sources[source.id];
      return {
        id: source.id,
        name: source.name,
        url: source.url,
        kind: source.kind,
        status: runtime?.status ?? source.status,
        lastSuccessAt: runtime?.lastSuccessAt,
        lastAttemptAt: runtime?.lastAttemptAt,
        failureReason: runtime?.reason,
        tags: source.tags,
      };
    });

    const referenceOnly = referenceSources
      .filter((reference) => reference.category === category)
      .map((reference) => ({
        id: reference.id,
        name: reference.name,
        url: reference.url,
        note: reference.note,
      }));

    return {
      category,
      coverage: {
        active: monitored.filter((source) => source.status === "active").length,
        failing: monitored.filter((source) => source.status === "failing").length,
        planned: monitored.filter((source) => source.status === "planned").length,
        total: monitored.length,
      },
      monitored,
      referenceOnly,
    };
  });
}
