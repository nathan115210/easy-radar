import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Direct git access for test arrange/assert steps — not the injectable `GitExec` under test. */
export async function git(dir: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", dir, ...args]);
  return stdout;
}

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

async function configureIdentity(dir: string): Promise<void> {
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "Test"]);
  await git(dir, ["config", "commit.gpgsign", "false"]);
}

/** A bare "remote" repo, hermetic to the running test — no relation to the real project's origin. */
export async function initBareRemote(): Promise<string> {
  const dir = await makeTempDir("easy-radar-remote-");
  await git(dir, ["init", "--bare", "-b", "main"]);
  return dir;
}

/** Seeds `main` with one file, so `data` bootstrap has a real commit to branch from. */
export async function seedMainBranch(remoteDir: string): Promise<void> {
  const scratch = await makeTempDir("easy-radar-seed-main-");
  await git(scratch, ["clone", remoteDir, "."]);
  await configureIdentity(scratch);
  await writeFile(path.join(scratch, "README.md"), "code lives here\n", "utf-8");
  await git(scratch, ["add", "README.md"]);
  await git(scratch, ["commit", "-m", "seed main"]);
  await git(scratch, ["push", "origin", "main"]);
}

/** Seeds `data` directly (bypassing `ensureDataBranch`), for tests that only need the branch to already exist. */
export async function seedDataBranch(
  remoteDir: string,
  files: Record<string, string> = { "data/news.json": "[]\n" },
): Promise<void> {
  const scratch = await makeTempDir("easy-radar-seed-data-");
  await git(scratch, ["clone", remoteDir, "."]);
  await configureIdentity(scratch);
  await git(scratch, ["checkout", "--orphan", "data"]);
  await git(scratch, ["rm", "-rf", "--ignore-unmatch", "."]);
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(scratch, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf-8");
  }
  await git(scratch, ["add", "-A"]);
  await git(scratch, ["commit", "-m", "seed data"]);
  await git(scratch, ["push", "-u", "origin", "data"]);
}

/** Clones `remoteDir` on `branch` into a fresh temp directory, identity pre-configured. */
export async function cloneOnBranch(remoteDir: string, branch: string): Promise<string> {
  const dir = await makeTempDir(`easy-radar-clone-${branch}-`);
  await git(dir, ["clone", "--branch", branch, remoteDir, "."]);
  await configureIdentity(dir);
  return dir;
}

/** Clones `remoteDir` on `main` (for tests exercising `ensureDataBranch` from a normal code checkout). */
export async function cloneMain(remoteDir: string): Promise<string> {
  const dir = await makeTempDir("easy-radar-clone-main-");
  await git(dir, ["clone", "--branch", "main", remoteDir, "."]);
  await configureIdentity(dir);
  return dir;
}
