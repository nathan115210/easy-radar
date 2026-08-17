import { ensureDataFiles } from "../../server/storage/init.js";
import { defaultDataDir } from "../../server/storage/paths.js";
import { formatIssues } from "./validation-issue.js";
import { validateSourceConfig } from "./source-config.js";
import { validateData } from "./validate-data.js";

/**
 * Data-only validation (PRD §17): source config plus news/state
 * invariants, with no frontend build step. Used standalone (`pnpm
 * validate:data`) and inline by the collection pipeline (#12) before any
 * write to the `data` branch — never as a pull-request check, since there
 * are no data pull requests (PRD §16).
 */
async function main(): Promise<void> {
  const dataDir = defaultDataDir();
  await ensureDataFiles(dataDir);

  const issues = [...(await validateSourceConfig()), ...(await validateData(dataDir))];

  if (issues.length === 0) {
    console.log(
      "Validation passed: source config, news schema, and state sync are all consistent.",
    );
    return;
  }

  console.error(`Validation failed with ${issues.length} issue(s):`);
  console.error(formatIssues(issues));
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
