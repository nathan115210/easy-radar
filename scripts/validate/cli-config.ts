import { formatIssues } from "./validation-issue.js";
import { validateSourceConfig } from "./source-config.js";

/**
 * Source-config validation only (schema, unique ids, category/file
 * consistency) — unlike news/state validation, this needs no `data`
 * worktree, so unlike the rest of `pnpm validate:data` it's safe to run as
 * part of the routine `pnpm validate` PR gate (PRD §17 keeps *data*
 * validation out of that gate, not config validation).
 */
async function main(): Promise<void> {
  const issues = await validateSourceConfig();

  if (issues.length === 0) {
    console.log("Source config validation passed.");
    return;
  }

  console.error(`Source config validation failed with ${issues.length} issue(s):`);
  console.error(formatIssues(issues));
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
