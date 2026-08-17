/**
 * PRD §7.2 class 1 failure: the repository configuration itself is unsafe
 * (here specifically: a source names an adapter that isn't registered).
 * Thrown before any source is fetched and before any file is written —
 * never caught and turned into a per-source failure like a runtime error.
 */
export class ConfigInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigInvalidError";
  }
}
