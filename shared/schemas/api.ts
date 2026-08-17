import { z } from "zod";
import { CategorySchema } from "./category.js";
import { CollectionCoverageSchema, RunRejectionSchema } from "./collection-status.js";
import { NewsItemSchema } from "./news-item.js";
import { NewsStateValueSchema } from "./news-state.js";
import { SourceKindSchema, SourceStatusSchema } from "./source-config.js";

/**
 * The Express server's request/response contract (PRD §14.3), built from
 * the same entity schemas the collector and (eventually) the UI use, so
 * there is exactly one definition of what a NewsItem/SourceConfig/etc.
 * looks like anywhere in the app.
 */

export const NEWS_PAGE_SIZE = 50;

export const NewsStateFilterSchema = z.enum(["all", "unread", "read"]);
export type NewsStateFilter = z.infer<typeof NewsStateFilterSchema>;

export const NewsQuerySchema = z.object({
  category: CategorySchema,
  state: NewsStateFilterSchema.default("all"),
  page: z.coerce.number().int().positive().default(1),
});
export type NewsQuery = z.infer<typeof NewsQuerySchema>;

/**
 * A news item as shown in the main-page list: the stored entity plus its
 * current reading state (PRD §6.2), which lives in news-states.json, not
 * news.json itself. Never `"ignored"` — an ignored item is removed from
 * active news.json on confirmation (PRD §10), so every item reaching the
 * UI is unread or read.
 */
export const NewsItemViewSchema = NewsItemSchema.extend({
  state: z.enum(["unread", "read"]),
});
export type NewsItemView = z.infer<typeof NewsItemViewSchema>;

export const NewsPageResponseSchema = z.object({
  items: z.array(NewsItemViewSchema),
  counts: z.object({
    all: z.int().nonnegative(),
    unread: z.int().nonnegative(),
    read: z.int().nonnegative(),
  }),
  page: z.int().positive(),
  pageSize: z.literal(NEWS_PAGE_SIZE),
  totalPages: z.int().nonnegative(),
});
export type NewsPageResponse = z.infer<typeof NewsPageResponseSchema>;

export const MonitoredSourceViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.url(),
  kind: SourceKindSchema,
  status: SourceStatusSchema,
  lastSuccessAt: z.iso.datetime().optional(),
  lastAttemptAt: z.iso.datetime().optional(),
  failureReason: z.string().optional(),
  tags: z.array(z.string()),
});
export type MonitoredSourceView = z.infer<typeof MonitoredSourceViewSchema>;

export const ReferenceSourceViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.url(),
  note: z.string().optional(),
});
export type ReferenceSourceView = z.infer<typeof ReferenceSourceViewSchema>;

export const CategorySourcesSchema = z.object({
  category: CategorySchema,
  coverage: z.object({
    active: z.int().nonnegative(),
    failing: z.int().nonnegative(),
    planned: z.int().nonnegative(),
    total: z.int().nonnegative(),
  }),
  monitored: z.array(MonitoredSourceViewSchema),
  referenceOnly: z.array(ReferenceSourceViewSchema),
});
export type CategorySources = z.infer<typeof CategorySourcesSchema>;

export const SourcesResponseSchema = z.object({
  categories: z.array(CategorySourcesSchema),
});
export type SourcesResponse = z.infer<typeof SourcesResponseSchema>;

/**
 * Deliberately excludes a "remote data branch has advanced" field — the
 * in-session freshness poll (#49) that populates it doesn't exist yet, and
 * that check must not read news.json (PRD §15.3), which is a git-workflow
 * concern this issue doesn't own.
 */
export const CollectionStatusResponseSchema = z.object({
  lastRunAt: z.iso.datetime(),
  stale: z.boolean(),
  coverage: CollectionCoverageSchema,
  rejected: RunRejectionSchema.optional(),
});
export type CollectionStatusResponse = z.infer<typeof CollectionStatusResponseSchema>;

export const SetNewsStateRequestSchema = z.object({
  state: NewsStateValueSchema,
});
export type SetNewsStateRequest = z.infer<typeof SetNewsStateRequestSchema>;

/**
 * `hasUncommittedChanges` tracks whether any state change has been made
 * since this server process started, or since the last successful
 * `POST /api/finish-reading` reset it — the signal the UI uses to drive
 * the `beforeunload` confirmation (PRD §6.3). This is server-process-
 * lifetime state, not persisted, and not a proxy for the `.data/`
 * worktree's actual git status.
 */
export const SetNewsStateResponseSchema = z.object({
  id: z.string(),
  state: NewsStateValueSchema,
  hasUncommittedChanges: z.literal(true),
});
export type SetNewsStateResponse = z.infer<typeof SetNewsStateResponseSchema>;

/**
 * A successful `POST /api/finish-reading` (PRD §6.3). `committed: false`
 * means there was nothing to commit — the user clicked `Finish reading`
 * with no pending state changes — which is still success, just a no-op;
 * `pushed` is only ever true alongside `committed`. Failure is not
 * represented in this schema: it comes back as a non-2xx response with an
 * `{ error }` body, since it's never something the UI treats as "finished".
 */
export const FinishReadingResponseSchema = z.object({
  committed: z.boolean(),
  pushed: z.boolean(),
  hasUncommittedChanges: z.literal(false),
});
export type FinishReadingResponse = z.infer<typeof FinishReadingResponseSchema>;
