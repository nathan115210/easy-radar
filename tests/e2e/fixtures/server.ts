import path from "node:path";
import {
  cloneOnBranch,
  initBareRemote,
  seedDataBranch,
  seedMainBranch,
} from "../../../scripts/git-workflow/test-helpers.js";
import { createApp } from "../../../server/app.js";
import { listen } from "../../../server/listen.js";
import { buildFixtureFiles } from "./fixture-data.js";

const PORT = Number(process.env.E2E_PORT ?? 4173);

/**
 * The process Playwright's `webServer` config starts (playwright.config.ts):
 * a real Express server (server/app.ts) over a real, hermetic local `data`
 * branch — the same git worktree layout `pnpm start`/`Finish reading` use
 * in production (#22), just pointed at a throwaway local bare "remote"
 * instead of GitHub. That's what #32 means by "Git layer stubbed": no
 * network calls, but `Finish reading` still runs the genuine commit/push
 * code path end to end.
 */
async function main(): Promise<void> {
  const remote = await initBareRemote();
  await seedMainBranch(remote);
  await seedDataBranch(remote, buildFixtureFiles());
  const worktreeDir = await cloneOnBranch(remote, "data");

  const app = createApp({
    dataDir: path.join(worktreeDir, "data"),
    worktreeDir,
    staticDir: path.join(process.cwd(), "dist"),
  });

  await listen(app, PORT);
  // Playwright's webServer only needs the port to answer; stdout here is
  // for a human running `tsx tests/e2e/fixtures/server.ts` directly.
  console.log(`e2e fixture server listening on http://127.0.0.1:${PORT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
