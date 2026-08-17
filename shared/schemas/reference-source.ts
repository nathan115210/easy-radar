import { z } from "zod";
import { CategorySchema } from "./category.js";

/**
 * General documentation that isn't a chronological event stream (PRD §12, §6.4).
 * Reference-only sources are shown as "Not collected" on the Sources page and
 * never enter collection or coverage math — they carry no adapter/kind/status.
 */
export const ReferenceSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: CategorySchema,
  url: z.url(),
  note: z.string().optional(),
});

export type ReferenceSource = z.infer<typeof ReferenceSourceSchema>;
