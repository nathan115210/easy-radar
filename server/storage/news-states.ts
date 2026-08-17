import {
  NewsStatesFileSchema,
  type NewsItem,
  type NewsStatesFile,
} from "../../shared/schemas/index.js";
import { readJsonFile, writeJsonFile } from "./json-file.js";
import { dataFilePath } from "./paths.js";

const NEWS_STATES_FILE_NAME = "news-states.json";

export function newsStatesFilePath(dataDir: string): string {
  return dataFilePath(dataDir, NEWS_STATES_FILE_NAME);
}

export async function readNewsStates(dataDir: string): Promise<NewsStatesFile> {
  return readJsonFile(newsStatesFilePath(dataDir), NewsStatesFileSchema);
}

export async function writeNewsStates(dataDir: string, file: NewsStatesFile): Promise<void> {
  await writeJsonFile(newsStatesFilePath(dataDir), NewsStatesFileSchema, file);
}

/**
 * Collector synchronization, keyed by deterministic NewsItem id (PRD §9):
 * every item without an existing state entry gets a fresh "unread" entry;
 * every existing entry — including read/ignored state a user has already
 * set — is preserved untouched. Cleanup (removing stale entries) is a
 * separate concern (#24), not this function's job.
 */
export function syncNewsStatesWithItems(
  states: NewsStatesFile,
  items: readonly NewsItem[],
  now: Date = new Date(),
): NewsStatesFile {
  const updatedAt = now.toISOString();
  const nextItems: NewsStatesFile["items"] = { ...states.items };

  for (const item of items) {
    if (!(item.id in nextItems)) {
      nextItems[item.id] = { state: "unread", updatedAt };
    }
  }

  return { schemaVersion: states.schemaVersion, items: nextItems };
}
