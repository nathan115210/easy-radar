import { z } from "zod";
import { SourceStatusSchema } from "./source-config.js";

export const FailureClassSchema = z.enum(["config-invalid", "runtime-failing"]);
export type FailureClass = z.infer<typeof FailureClassSchema>;

export const SourceCollectionStatusSchema = z.object({
  status: SourceStatusSchema,
  lastSuccessAt: z.iso.datetime().optional(),
  lastAttemptAt: z.iso.datetime().optional(),
  failureClass: FailureClassSchema.optional(),
  reason: z.string().optional(),
});

export type SourceCollectionStatus = z.infer<typeof SourceCollectionStatusSchema>;

// Change guards that can reject an entire run before it writes (PRD §18.6).
export const RunRejectionReasonSchema = z.enum([
  "volume-guard",
  "active-item-mutation",
  "cursor-regression",
]);
export type RunRejectionReason = z.infer<typeof RunRejectionReasonSchema>;

export const RunRejectionSchema = z.object({
  reason: RunRejectionReasonSchema,
  detail: z.string().min(1),
});

export type RunRejection = z.infer<typeof RunRejectionSchema>;

export const CollectionCoverageSchema = z.object({
  succeeded: z.int().nonnegative(),
  failed: z.int().nonnegative(),
  planned: z.int().nonnegative(),
  added: z.int().nonnegative(),
  total: z.int().nonnegative(),
});

export type CollectionCoverage = z.infer<typeof CollectionCoverageSchema>;

export const CollectionStatusFileSchema = z.object({
  schemaVersion: z.literal(1),
  lastRunAt: z.iso.datetime(),
  coverage: CollectionCoverageSchema,
  rejected: RunRejectionSchema.optional(),
  sources: z.record(z.string(), SourceCollectionStatusSchema),
});

export type CollectionStatusFile = z.infer<typeof CollectionStatusFileSchema>;
