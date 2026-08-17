import type { NewsItem } from "../../shared/schemas/index.js";

export type MergeResult = {
  mergedNews: NewsItem[];
  addedItems: NewsItem[];
};

/**
 * Merges newly discovered items into the existing active news set,
 * append-only: an id already present in `existing` is left exactly as it
 * is — never overwritten with a freshly refetched version — since PRD §8
 * makes existing active NewsItem metadata append-only. `addedItems` is
 * genuinely new ids only, which is also the run's "added" coverage count.
 */
export function mergeNewsItems(
  existing: readonly NewsItem[],
  discovered: readonly NewsItem[],
): MergeResult {
  const existingIds = new Set(existing.map((item) => item.id));
  const addedItems: NewsItem[] = [];

  for (const item of discovered) {
    if (existingIds.has(item.id)) {
      continue;
    }
    existingIds.add(item.id);
    addedItems.push(item);
  }

  return { mergedNews: [...existing, ...addedItems], addedItems };
}
