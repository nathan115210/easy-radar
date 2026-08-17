import { z } from "zod";

export const NewsStateValueSchema = z.enum(["unread", "read", "ignored"]);
export type NewsStateValue = z.infer<typeof NewsStateValueSchema>;

export const NewsStateSchema = z.object({
  state: NewsStateValueSchema,
  updatedAt: z.iso.datetime(),
  readAt: z.iso.datetime().optional(),
  ignoredAt: z.iso.datetime().optional(),
});

export type NewsState = z.infer<typeof NewsStateSchema>;

export const NewsStatesFileSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.record(z.string(), NewsStateSchema),
});

export type NewsStatesFile = z.infer<typeof NewsStatesFileSchema>;

/**
 * An ignored item's state entry doubles as its cleanup tombstone (PRD §10):
 * news.json drops the item immediately, but the "ignored" state entry is kept
 * around so the collection overlap window can't re-add it. There is no
 * separate tombstone file — PRD §9 fixes the on-disk file set to four files.
 * Expiry logic (the 48h window) belongs to the cleanup rules, not this schema.
 */
export const TombstoneSchema = NewsStateSchema.extend({
  state: z.literal("ignored"),
  ignoredAt: z.iso.datetime(),
});

export type Tombstone = z.infer<typeof TombstoneSchema>;
