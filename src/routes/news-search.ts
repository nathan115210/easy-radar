import { NewsQuerySchema, type NewsQuery } from "../../shared/schemas/index.js";

/**
 * Validates and defaults the `/` route's search params (PRD §14.1):
 * category, state, and page all live in the URL. Reuses NewsQuerySchema —
 * the same schema the Express server validates the equivalent query
 * with — so there's one definition of a valid news query. The one
 * difference from the server: a bare `/` defaults to `web-core` ("Web
 * Core & Frontend Ecosystem initially selected", §6.1), whereas the
 * server requires an explicit category (PRD §7.2-style fail closed). The
 * schema itself is unchanged, so the server's "category is required"
 * behavior isn't affected by this route-local default.
 */
export function validateNewsSearch(input: Record<string, unknown>): NewsQuery {
  return NewsQuerySchema.parse({ category: "web-core", ...input });
}
