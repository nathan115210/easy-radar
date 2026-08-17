import { z } from "zod";

export const NewsLabelSchema = z.enum([
  "Release",
  "Improvement",
  "Breaking Change",
  "Deprecation",
  "Retired",
  "RFC/Proposal",
  "Security Advisory",
  "Announcement",
  "Engineering Article",
]);

export type NewsLabel = z.infer<typeof NewsLabelSchema>;
