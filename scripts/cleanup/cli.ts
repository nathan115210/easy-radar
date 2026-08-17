import {
  readNews,
  readNewsStates,
  writeNews,
  writeNewsStates,
} from "../../server/storage/index.js";
import { defaultDataDir } from "../../server/storage/paths.js";
import { runCleanup } from "./run-cleanup.js";

/**
 * Standalone entrypoint (PRD §10: "invocable standalone") — the same
 * `runCleanup` the collection pipeline calls inline, wired to real files
 * here instead of pipeline-in-memory data.
 */
async function main(): Promise<void> {
  const dataDir = defaultDataDir();
  const [items, statesFile] = await Promise.all([readNews(dataDir), readNewsStates(dataDir)]);

  const result = runCleanup(items, statesFile);

  await writeNews(dataDir, result.items);
  await writeNewsStates(dataDir, result.statesFile);

  console.log(
    `Cleanup: ${result.prunedTombstoneIds.length} tombstone(s) pruned, ` +
      `${result.reAddedIgnoredIds.length} re-added ignored item(s) scrubbed, ` +
      `${result.expiredReadIds.length} read item(s) expired.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
