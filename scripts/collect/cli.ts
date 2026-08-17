import { appendFile } from "node:fs/promises";
import { sources } from "../../config/sources/index.js";
import { defaultDataDir } from "../../server/storage/paths.js";
import { createFeedAdapter } from "./adapters/feed.js";
import { createGithubReleaseAdapter } from "./adapters/github-releases.js";
import { createAdapterRegistry } from "./engine/adapter.js";
import { runCollectPipeline } from "./pipeline.js";

/**
 * The single entrypoint every execution path uses (manual, the AGY Skill
 * #34, the cloud workflow #45) — `pnpm collect`. Runs standalone: no AGY,
 * no assumption of a cloud environment. The same summary that goes to the
 * terminal is appended to GITHUB_STEP_SUMMARY when set, so a cloud run's
 * job summary is identical in content (PRD §7.3) — this is also the only
 * output an AI executor is permitted to read and relay (§18.4).
 */
async function main(): Promise<void> {
  const registry = createAdapterRegistry([createFeedAdapter(), createGithubReleaseAdapter()]);

  const result = await runCollectPipeline({
    sources,
    registry,
    dataDir: defaultDataDir(),
  });

  console.log(result.summary);

  const jobSummaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (jobSummaryPath) {
    await appendFile(jobSummaryPath, `${result.summary}\n`, "utf-8");
  }

  process.exitCode = result.exitCode;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
