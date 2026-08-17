import {
  CollectionStatusResponseSchema,
  NewsPageResponseSchema,
  SetNewsStateResponseSchema,
  SourcesResponseSchema,
  type CollectionStatusResponse,
  type NewsPageResponse,
  type NewsQuery,
  type NewsStateValue,
  type SetNewsStateResponse,
  type SourcesResponse,
} from "../../shared/schemas/index.js";
import type { z } from "zod";

/**
 * A small typed fetch wrapper over the shared Zod schemas (PRD §14.1) — no
 * additional API contract framework. Every response is parsed against the
 * same schema the Express server validates its own output with, so a
 * server/client drift fails loudly here instead of surfacing as a subtly
 * wrong render. Requests are same-origin relative paths: the local server
 * is expected to serve both the API and this built frontend (#22).
 */
async function fetchJson<Schema extends z.ZodType>(
  input: string,
  schema: Schema,
  init?: RequestInit,
): Promise<z.infer<Schema>> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Request to "${input}" failed: HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new Error(`Response from "${input}" failed schema validation: ${result.error.message}`);
  }
  return result.data;
}

export async function getNews(query: NewsQuery): Promise<NewsPageResponse> {
  const params = new URLSearchParams({
    category: query.category,
    state: query.state,
    page: String(query.page),
  });
  return fetchJson(`/api/news?${params.toString()}`, NewsPageResponseSchema);
}

export async function getSources(): Promise<SourcesResponse> {
  return fetchJson("/api/sources", SourcesResponseSchema);
}

export async function getCollectionStatus(): Promise<CollectionStatusResponse> {
  return fetchJson("/api/collection-status", CollectionStatusResponseSchema);
}

export async function setNewsState(
  id: string,
  state: NewsStateValue,
): Promise<SetNewsStateResponse> {
  return fetchJson(`/api/news/${encodeURIComponent(id)}/state`, SetNewsStateResponseSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
}
