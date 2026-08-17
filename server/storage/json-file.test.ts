import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { readJsonFile, writeJsonFile } from "./json-file.js";

const Schema = z.object({ b: z.string(), a: z.number() });

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "easy-radar-storage-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("readJsonFile / writeJsonFile", () => {
  it("round-trips valid data", async () => {
    const file = path.join(dir, "data.json");
    await writeJsonFile(file, Schema, { a: 1, b: "x" });
    await expect(readJsonFile(file, Schema)).resolves.toEqual({ a: 1, b: "x" });
  });

  it("serializes with sorted keys regardless of input order", async () => {
    const file = path.join(dir, "data.json");
    await writeJsonFile(file, Schema, { b: "x", a: 1 });
    const raw = await readFile(file, "utf-8");
    expect(raw).toBe('{\n  "a": 1,\n  "b": "x"\n}\n');
  });

  it("produces a byte-identical file when rewriting unchanged data", async () => {
    const file = path.join(dir, "data.json");
    await writeJsonFile(file, Schema, { a: 1, b: "x" });
    const first = await readFile(file, "utf-8");
    await writeJsonFile(file, Schema, { a: 1, b: "x" });
    const second = await readFile(file, "utf-8");
    expect(second).toBe(first);
  });

  it("throws a clear error for invalid JSON rather than losing data silently", async () => {
    const file = path.join(dir, "data.json");
    await writeFile(file, "{ not valid json", "utf-8");
    await expect(readJsonFile(file, Schema)).rejects.toThrow(/invalid JSON/i);
  });

  it("throws a clear error when the file doesn't match the schema", async () => {
    const file = path.join(dir, "data.json");
    await writeFile(file, JSON.stringify({ a: "not-a-number", b: "x" }), "utf-8");
    await expect(readJsonFile(file, Schema)).rejects.toThrow(/schema validation/i);
  });

  it("throws a clear error for a missing file", async () => {
    const file = path.join(dir, "does-not-exist.json");
    await expect(readJsonFile(file, Schema)).rejects.toThrow(/failed to read/i);
  });

  it("refuses to write data that fails the schema", async () => {
    const file = path.join(dir, "data.json");
    await expect(
      writeJsonFile(file, Schema, { a: "not-a-number", b: "x" } as unknown as {
        a: number;
        b: string;
      }),
    ).rejects.toThrow(/refusing to write invalid data/i);
  });

  it("does not leave a temp file behind after a successful write", async () => {
    const file = path.join(dir, "data.json");
    await writeJsonFile(file, Schema, { a: 1, b: "x" });
    const entries = await readdir(dir);
    expect(entries).toEqual(["data.json"]);
  });
});
