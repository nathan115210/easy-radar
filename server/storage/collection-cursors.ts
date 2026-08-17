import {
  CollectionCursorsFileSchema,
  type CollectionCursorsFile,
} from "../../shared/schemas/index.js";
import { readJsonFile, writeJsonFile } from "./json-file.js";
import { dataFilePath } from "./paths.js";

const COLLECTION_CURSORS_FILE_NAME = "collection-cursors.json";

export function collectionCursorsFilePath(dataDir: string): string {
  return dataFilePath(dataDir, COLLECTION_CURSORS_FILE_NAME);
}

export async function readCollectionCursors(dataDir: string): Promise<CollectionCursorsFile> {
  return readJsonFile(collectionCursorsFilePath(dataDir), CollectionCursorsFileSchema);
}

export async function writeCollectionCursors(
  dataDir: string,
  file: CollectionCursorsFile,
): Promise<void> {
  await writeJsonFile(collectionCursorsFilePath(dataDir), CollectionCursorsFileSchema, file);
}
