import { access } from "node:fs/promises";
import type {
  CollectionCursorsFile,
  CollectionStatusFile,
  NewsItem,
  NewsStatesFile,
} from "../../shared/schemas/index.js";
import { collectionCursorsFilePath, writeCollectionCursors } from "./collection-cursors.js";
import { collectionStatusFilePath, writeCollectionStatus } from "./collection-status.js";
import { newsFilePath, writeNews } from "./news.js";
import { newsStatesFilePath, writeNewsStates } from "./news-states.js";

/**
 * No collection has ever run yet. collection-status.json requires a
 * lastRunAt timestamp (PRD §21 leaves status file serialization details to
 * implementation), so a first-run file uses the Unix epoch as an explicit
 * "never run" sentinel rather than a fabricated recent time.
 */
export const NEVER_RUN_SENTINEL = "1970-01-01T00:00:00.000Z";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Creates any of the four data files that don't already exist, with valid empty contents. */
export async function ensureDataFiles(dataDir: string): Promise<void> {
  if (!(await exists(newsFilePath(dataDir)))) {
    const emptyNews: NewsItem[] = [];
    await writeNews(dataDir, emptyNews);
  }

  if (!(await exists(newsStatesFilePath(dataDir)))) {
    const emptyStates: NewsStatesFile = { schemaVersion: 1, items: {} };
    await writeNewsStates(dataDir, emptyStates);
  }

  if (!(await exists(collectionCursorsFilePath(dataDir)))) {
    const emptyCursors: CollectionCursorsFile = { schemaVersion: 1, cursors: {} };
    await writeCollectionCursors(dataDir, emptyCursors);
  }

  if (!(await exists(collectionStatusFilePath(dataDir)))) {
    const emptyStatus: CollectionStatusFile = {
      schemaVersion: 1,
      lastRunAt: NEVER_RUN_SENTINEL,
      coverage: { succeeded: 0, failed: 0, planned: 0, added: 0, total: 0 },
      sources: {},
    };
    await writeCollectionStatus(dataDir, emptyStatus);
  }
}
