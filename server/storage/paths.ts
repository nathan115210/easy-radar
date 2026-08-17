import path from "node:path";

/**
 * The data storage layer is parameterized over a data directory rather than
 * hardcoding `.data/data` everywhere, so tests can point it at a temp
 * directory. The default matches PRD §15.1: the `.data/` worktree, created
 * and synchronized by #22, holding `data/*.json` on disk at `.data/data/`.
 */
export function defaultDataDir(): string {
  return path.join(process.cwd(), ".data", "data");
}

/** The git worktree root that holds `defaultDataDir()` at its `data/` subdirectory (PRD §15.1). */
export function defaultWorktreeDir(): string {
  return path.join(process.cwd(), ".data");
}

export function dataFilePath(dataDir: string, fileName: string): string {
  return path.join(dataDir, fileName);
}
