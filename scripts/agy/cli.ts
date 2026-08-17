import { sources } from "../../config/sources/index.js";
import { defaultDataDir, defaultWorktreeDir } from "../../server/storage/paths.js";
import { createDefaultAdapterRegistry } from "../collect/default-registry.js";
import { collectAndPush } from "./collect-and-push.js";

/**
 * The command the AGY Skill (`.agents/skills/collect-news/SKILL.md`)
 * invokes — collect, then commit and push to `data`, then exit with a
 * status the Skill can relay without reading any data file itself (PRD
 * §18.4). `--allow-large-change` mirrors `pnpm collect`'s own flag and
 * must be passed explicitly by whoever runs this.
 */
async function main(): Promise<void> {
  const registry = createDefaultAdapterRegistry();
  const allowLargeChange = process.argv.includes("--allow-large-change");

  const result = await collectAndPush({
    sources,
    registry,
    dataDir: defaultDataDir(),
    worktreeDir: defaultWorktreeDir(),
    allowLargeChange,
  });

  console.log(result.summary);

  switch (result.outcome) {
    case "config-invalid":
    case "rejected":
      process.exitCode = 1;
      return;
    case "diverged":
    case "push-aborted":
      console.error(result.message);
      process.exitCode = 1;
      return;
    case "pushed":
      console.log(
        result.committed ? `Committed and pushed to the data branch.` : "No changes to push.",
      );
      return;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
