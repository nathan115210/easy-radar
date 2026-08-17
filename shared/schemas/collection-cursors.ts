import { z } from "zod";

/**
 * Per-source collection position and gap-recovery metadata (PRD §11.2).
 * `lastItemDate`/`lastItemId` anchor gap recovery to the latest known item
 * for that source rather than re-walking its entire history.
 */
export const SourceCursorSchema = z.object({
  lastRunAt: z.iso.datetime(),
  lastItemDate: z.iso.date().optional(),
  lastItemId: z.string().min(1).optional(),
});

export type SourceCursor = z.infer<typeof SourceCursorSchema>;

export const CollectionCursorsFileSchema = z.object({
  schemaVersion: z.literal(1),
  cursors: z.record(z.string(), SourceCursorSchema),
});

export type CollectionCursorsFile = z.infer<typeof CollectionCursorsFileSchema>;
