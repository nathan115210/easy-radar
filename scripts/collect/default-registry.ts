import { createAdapterRegistry, type AdapterRegistry } from "./engine/adapter.js";
import { createFeedAdapter } from "./adapters/feed.js";
import { createGenericHtmlAdapter } from "./adapters/generic-html.js";
import { createGithubReleaseAdapter } from "./adapters/github-releases.js";
import { createOfficialApiAdapter } from "./adapters/official-api.js";

/**
 * The one adapter registry every real entrypoint uses (`pnpm collect`,
 * the AGY Skill's `pnpm agy:collect-news`, and eventually the cloud
 * workflow #45) — defined once so none of them can quietly drift onto a
 * different set of adapters than the others.
 */
export function createDefaultAdapterRegistry(): AdapterRegistry {
  return createAdapterRegistry([
    createFeedAdapter(),
    createGithubReleaseAdapter(),
    createOfficialApiAdapter(),
    createGenericHtmlAdapter(),
  ]);
}
