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
  /**
   * Deterministic ids of undated ("discovered") items already decided on
   * (PRD §11.3): recorded during the initial baseline and never imported,
   * or imported once as a genuinely new undated discovery. Either way,
   * once an id is here it's never reconsidered — this is what stops the
   * pre-existing undated backlog from resurfacing on every later run.
   */
  knownUndatedIds: z.array(z.string()).optional(),
  /**
   * TC39 proposal lifecycle tracking (PRD §11.6, #28): the last stage
   * observed for each proposal (by repo slug), so a transition is
   * detected by diffing this run's observed stage against what's recorded
   * here — never by re-deriving history from scratch each run.
   */
  proposalStages: z.record(z.string(), z.string()).optional(),
});

export type SourceCursor = z.infer<typeof SourceCursorSchema>;

export const CollectionCursorsFileSchema = z.object({
  schemaVersion: z.literal(1),
  cursors: z.record(z.string(), SourceCursorSchema),
});

export type CollectionCursorsFile = z.infer<typeof CollectionCursorsFileSchema>;
