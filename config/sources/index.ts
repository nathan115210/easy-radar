import {
  CategorySchema,
  ReferenceSourceSchema,
  SourceConfigSchema,
  type Category,
  type ReferenceSource,
  type SourceConfig,
} from "../../shared/schemas/index.js";
import * as aiEngineering from "./ai-engineering.js";
import * as developerTooling from "./developer-tooling.js";
import * as devopsCloud from "./devops-cloud.js";
import * as mobileDevelopment from "./mobile-development.js";
import * as softwareArchitecture from "./software-architecture.js";
import * as testingQuality from "./testing-quality.js";
import * as webCore from "./web-core.js";

const categoryModules = [
  webCore,
  aiEngineering,
  mobileDevelopment,
  softwareArchitecture,
  devopsCloud,
  testingQuality,
  developerTooling,
] as const;

function idOf(raw: unknown): string {
  return typeof raw === "object" && raw !== null && "id" in raw && typeof raw.id === "string"
    ? raw.id
    : "<unknown>";
}

export type CategorySourceModule = {
  category: string;
  sources: readonly unknown[];
  referenceSources: readonly unknown[];
};

/**
 * Combines every category's exports into flat, validated lists and enforces
 * the two invariants schema validation alone can't: a source's id is unique
 * repository-wide, and its `category` field matches the file that declares
 * it. Per PRD §7.2, any violation here is a config-invalid failure and must
 * stop collection before any fetch — so this throws rather than returning a
 * result to check. Exported (rather than kept private) so tests can exercise
 * these invariants against synthetic fixtures without touching real config.
 */
export function combineAndValidate(modules: readonly CategorySourceModule[]): {
  sources: SourceConfig[];
  referenceSources: ReferenceSource[];
} {
  const sources: SourceConfig[] = [];
  const referenceSources: ReferenceSource[] = [];
  const seenIds = new Map<string, string>();

  const claimId = (id: string, category: string): void => {
    const existingCategory = seenIds.get(id);
    if (existingCategory !== undefined) {
      throw new Error(
        `Duplicate source id "${id}": declared in both "${existingCategory}" and "${category}"`,
      );
    }
    seenIds.set(id, category);
  };

  for (const mod of modules) {
    for (const raw of mod.sources) {
      const parsed = SourceConfigSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `Invalid source config in "${mod.category}" for id "${idOf(raw)}": ${parsed.error.message}`,
        );
      }
      const source = parsed.data;
      if (source.category !== mod.category) {
        throw new Error(
          `Source "${source.id}" declares category "${source.category}" but is listed in the "${mod.category}" file`,
        );
      }
      claimId(source.id, mod.category);
      sources.push(source);
    }

    for (const raw of mod.referenceSources) {
      const parsed = ReferenceSourceSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `Invalid reference source in "${mod.category}" for id "${idOf(raw)}": ${parsed.error.message}`,
        );
      }
      const reference = parsed.data;
      if (reference.category !== mod.category) {
        throw new Error(
          `Reference source "${reference.id}" declares category "${reference.category}" but is listed in the "${mod.category}" file`,
        );
      }
      claimId(reference.id, mod.category);
      referenceSources.push(reference);
    }
  }

  return { sources, referenceSources };
}

const combined = combineAndValidate(categoryModules);

/** All monitored sources across every category, validated and unique by id. */
export const sources: SourceConfig[] = combined.sources;

/** All reference-only sources across every category. Never enters collection or coverage. */
export const referenceSources: ReferenceSource[] = combined.referenceSources;

export type CategoryCoverage = {
  category: Category;
  active: number;
  failing: number;
  planned: number;
  total: number;
};

/** Per-category coverage counts for the Sources page. Reference-only sources are excluded. */
export function getCoverageByCategory(): CategoryCoverage[] {
  return CategorySchema.options.map((category) => {
    const inCategory = sources.filter((source) => source.category === category);
    return {
      category,
      active: inCategory.filter((source) => source.status === "active").length,
      failing: inCategory.filter((source) => source.status === "failing").length,
      planned: inCategory.filter((source) => source.status === "planned").length,
      total: inCategory.length,
    };
  });
}
