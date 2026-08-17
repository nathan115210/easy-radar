import type { NewsItem } from "../../shared/schemas/index.js";

export type UndatedBaselineResult = {
  itemsToImport: NewsItem[];
  updatedKnownUndatedIds: string[];
};

/**
 * Applies the undated-source baseline rule (PRD §11.3): on a source's
 * initial sync, an undated ("discovered") item is recorded but not
 * imported — so the first run doesn't flood the reader with a backlog of
 * old undated pages. Once an id has been decided on (baselined, or already
 * imported as a genuinely new post-baseline discovery), it's never
 * reconsidered on a later run — `knownUndatedIds` is that permanent record.
 *
 * Dated items (dateBasis "published") are unaffected; this rule only ever
 * withholds undated content.
 */
export function applyUndatedBaseline(
  items: readonly NewsItem[],
  isInitialSync: boolean,
  previouslyKnownUndatedIds: readonly string[],
): UndatedBaselineResult {
  const known = new Set(previouslyKnownUndatedIds);
  const itemsToImport: NewsItem[] = [];
  const newlyKnown: string[] = [];

  for (const item of items) {
    if (item.dateBasis !== "discovered") {
      itemsToImport.push(item);
      continue;
    }

    if (known.has(item.id)) {
      continue;
    }

    if (isInitialSync) {
      newlyKnown.push(item.id);
      continue;
    }

    itemsToImport.push(item);
    newlyKnown.push(item.id);
  }

  return {
    itemsToImport,
    updatedKnownUndatedIds: [...previouslyKnownUndatedIds, ...newlyKnown],
  };
}
