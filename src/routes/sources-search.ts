import { z } from "zod";
import { CategorySchema } from "../../shared/schemas/index.js";

/**
 * `/sources` search params: both optional, since the page itself (#25) is
 * fine with no filter at all. They exist so the main-page collection
 * status alert (#19) can deep-link to the affected source or category
 * (PRD §7.1) ahead of the real Sources page listing being built.
 */
export const SourcesSearchSchema = z.object({
  category: CategorySchema.optional(),
  sourceId: z.string().optional(),
});
export type SourcesSearch = z.infer<typeof SourcesSearchSchema>;

export function validateSourcesSearch(input: Record<string, unknown>): SourcesSearch {
  return SourcesSearchSchema.parse(input);
}
