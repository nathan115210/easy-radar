import { z } from "zod";
import { NewsItemSchema, type NewsItem } from "../../shared/schemas/index.js";
import { readJsonFile, writeJsonFile } from "./json-file.js";
import { dataFilePath } from "./paths.js";

const NEWS_FILE_NAME = "news.json";

const NewsFileSchema = z.array(NewsItemSchema);

export function newsFilePath(dataDir: string): string {
  return dataFilePath(dataDir, NEWS_FILE_NAME);
}

export async function readNews(dataDir: string): Promise<NewsItem[]> {
  return readJsonFile(newsFilePath(dataDir), NewsFileSchema);
}

export async function writeNews(dataDir: string, items: NewsItem[]): Promise<void> {
  await writeJsonFile(newsFilePath(dataDir), NewsFileSchema, items);
}
