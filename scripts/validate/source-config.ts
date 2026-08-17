import type { ValidationIssue } from "./validation-issue.js";

/**
 * config/sources/index.ts (PRD §12) already validates schema, unique ids,
 * and category/file consistency at import time (#5) — throwing there is
 * exactly right for that module's own contract (fail before any fetch).
 * This wraps the same import in a try/catch so a validation *run* can
 * report the failure as one issue among others rather than crashing the
 * whole process.
 */
export async function validateSourceConfig(
  loadConfig: () => Promise<unknown> = () => import("../../config/sources/index.js"),
): Promise<ValidationIssue[]> {
  try {
    await loadConfig();
    return [];
  } catch (error) {
    return [{ check: "source-config", message: (error as Error).message }];
  }
}
