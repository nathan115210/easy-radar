import {
  CollectionStatusFileSchema,
  type CollectionStatusFile,
} from "../../shared/schemas/index.js";
import { readJsonFile, writeJsonFile } from "./json-file.js";
import { dataFilePath } from "./paths.js";

const COLLECTION_STATUS_FILE_NAME = "collection-status.json";

export function collectionStatusFilePath(dataDir: string): string {
  return dataFilePath(dataDir, COLLECTION_STATUS_FILE_NAME);
}

export async function readCollectionStatus(dataDir: string): Promise<CollectionStatusFile> {
  return readJsonFile(collectionStatusFilePath(dataDir), CollectionStatusFileSchema);
}

/**
 * Writes collection-status.json only — never touches news.json,
 * news-states.json, or collection-cursors.json. This lets a failed or
 * rejected run publish its status without writing (or risking corruption
 * of) the other three files (PRD §18.5).
 */
export async function writeCollectionStatus(
  dataDir: string,
  file: CollectionStatusFile,
): Promise<void> {
  await writeJsonFile(collectionStatusFilePath(dataDir), CollectionStatusFileSchema, file);
}
