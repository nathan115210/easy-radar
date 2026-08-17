import { z } from "zod";

export const CategorySchema = z.enum([
  "web-core",
  "ai-engineering",
  "mobile-development",
  "software-architecture",
  "devops-cloud",
  "testing-quality",
  "developer-tooling",
]);

export type Category = z.infer<typeof CategorySchema>;
