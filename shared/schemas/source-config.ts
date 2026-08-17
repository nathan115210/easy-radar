import { z } from "zod";
import { CategorySchema } from "./category.js";

export const SourceKindSchema = z.enum([
  "feed",
  "github-release",
  "github-event",
  "api",
  "website",
]);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const SourceStatusSchema = z.enum(["active", "failing", "planned"]);
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export const ReleasePolicySchema = z.object({
  includePrerelease: z.boolean(),
  includeDraft: z.literal(false),
});
export type ReleasePolicy = z.infer<typeof ReleasePolicySchema>;

export const SourceConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: CategorySchema,
  kind: SourceKindSchema,
  url: z.url(),
  adapter: z.string().min(1),
  initialSyncFrom: z.iso.date(),
  status: SourceStatusSchema,
  filters: z.record(z.string(), z.unknown()).optional(),
  releasePolicy: ReleasePolicySchema.optional(),
  tags: z.array(z.string()),
});

export type SourceConfig = z.infer<typeof SourceConfigSchema>;
