import { CategorySchema, type Category } from "../../shared/schemas/index.js";

/** Display order and copy for the category tabs (PRD §5, §6.1). */
export const CATEGORIES: readonly Category[] = CategorySchema.options;

export const CATEGORY_LABELS: Record<Category, string> = {
  "web-core": "Web Core & Frontend Ecosystem",
  "ai-engineering": "AI Engineering & Developer Workflows",
  "mobile-development": "Mobile Development",
  "software-architecture": "Software Design & System Architecture",
  "devops-cloud": "DevOps, Cloud & Infrastructure",
  "testing-quality": "Testing & Release Quality",
  "developer-tooling": "Developer Tooling, Runtimes & Web Standards",
};
