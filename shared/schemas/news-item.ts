import { z } from "zod";
import { CategorySchema } from "./category.js";
import { NewsLabelSchema } from "./news-label.js";

export const DateBasisSchema = z.enum(["published", "discovered"]);
export type DateBasis = z.infer<typeof DateBasisSchema>;

export const NewsItemSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  heading: z.string().min(1),
  label: NewsLabelSchema,
  link: z.url(),
  date: z.iso.date(),
  dateBasis: DateBasisSchema,
  category: CategorySchema,
  tags: z.array(z.string()),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;
