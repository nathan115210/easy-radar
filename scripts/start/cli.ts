import { build } from "vite";
import { ensureDataFiles } from "../../server/storage/init.js";
import { defaultDataDir, defaultWorktreeDir } from "../../server/storage/paths.js";
import { createApp } from "../../server/app.js";
import { DataBranchDivergedError } from "../git-workflow/errors.js";
import { openBrowser } from "./open-browser.js";
import { syncWorktree } from "./sync-worktree.js";

const HOST = "127.0.0.1";
const PORT = Number(process.env["PORT"] ?? 3000);

/**
 * `pnpm start` (PRD §15, §22): the single command that syncs `.data/` with
 * the remote `data` branch, builds the frontend, and serves both from one
 * Express process bound to `127.0.0.1` only (PRD §14.3). It never
 * collects — that's `pnpm collect`, a separate operation the user runs on
 * demand.
 */
async function main(): Promise<void> {
  const worktreeDir = defaultWorktreeDir();
  const dataDir = defaultDataDir();

  // PRD §16 calls the code branch "main"; this repository's actual default
  // branch is "master" — override rather than renaming it, since that's a
  // separate, much larger change outside this issue's scope.
  const sync = await syncWorktree(worktreeDir, { mainBranch: "master" });
  if (sync.outcome === "created") {
    console.log(`Created "${worktreeDir}" from the "data" branch.`);
  } else if (sync.outcome === "offline") {
    console.warn("Could not reach the remote — starting on the last locally known data.");
  } else {
    console.log(`Synced "${worktreeDir}" with the remote "data" branch.`);
  }

  await ensureDataFiles(dataDir);

  console.log("Building the frontend...");
  await build();

  const app = createApp({ dataDir, worktreeDir });
  const server = app.listen(PORT, HOST, () => {
    const url = `http://${HOST}:${PORT}/`;
    console.log(`Easy Radar is running at ${url}`);
    openBrowser(url);
  });

  function shutdown(): void {
    console.log("Shutting down...");
    server.close(() => process.exit(0));
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  if (error instanceof DataBranchDivergedError) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
