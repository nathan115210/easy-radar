import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { ensureDataFiles } from "./storage/init.js";
import { createApp } from "./app.js";

let dataDir: string;
let staticDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "easy-radar-server-"));
  await ensureDataFiles(dataDir);

  staticDir = await mkdtemp(path.join(tmpdir(), "easy-radar-static-"));
  await mkdir(path.join(staticDir, "assets"), { recursive: true });
  await writeFile(path.join(staticDir, "index.html"), "<html>app shell</html>", "utf-8");
  await writeFile(path.join(staticDir, "assets", "index.js"), "console.log('app')", "utf-8");
});

afterEach(async () => {
  await Promise.all([
    rm(dataDir, { recursive: true, force: true }),
    rm(staticDir, { recursive: true, force: true }),
  ]);
});

describe("static frontend serving (PRD §22)", () => {
  it("serves a real static asset by exact path", async () => {
    const app = createApp({ dataDir, staticDir });
    const res = await request(app).get("/assets/index.js");
    expect(res.status).toBe(200);
    expect(res.text).toBe("console.log('app')");
  });

  it("falls back to index.html for a client-side route so a full reload works", async () => {
    const app = createApp({ dataDir, staticDir });
    const res = await request(app).get("/sources");
    expect(res.status).toBe(200);
    expect(res.text).toBe("<html>app shell</html>");
  });

  it("serves the root path as index.html", async () => {
    const app = createApp({ dataDir, staticDir });
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("<html>app shell</html>");
  });

  it("never lets the SPA fallback swallow an actual /api/ route", async () => {
    const app = createApp({ dataDir, staticDir });
    const res = await request(app).get("/api/collection-status");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("404s an unmatched /api/ path instead of serving index.html", async () => {
    const app = createApp({ dataDir, staticDir });
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.text).not.toContain("app shell");
  });
});
