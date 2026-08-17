import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/** Deterministic serialization: sorted keys, fixed indent, trailing newline. */
function serialize(value: unknown): string {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

/**
 * Reads and schema-validates a JSON file, failing loudly (rather than
 * silently losing data) on a missing file, invalid JSON, or a schema
 * mismatch — each error names the file path.
 */
export async function readJsonFile<Schema extends z.ZodType>(
  filePath: string,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to read data file "${filePath}": ${(error as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Data file "${filePath}" contains invalid JSON: ${(error as Error).message}`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Data file "${filePath}" failed schema validation: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Validates then atomically writes a JSON file (temp file + rename), so an
 * interrupted write can never leave a corrupt or partial file on disk.
 * Output is deterministically serialized so rewriting unchanged data
 * produces a byte-identical file.
 */
export async function writeJsonFile<Schema extends z.ZodType>(
  filePath: string,
  schema: Schema,
  data: z.infer<Schema>,
): Promise<void> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Refusing to write invalid data to "${filePath}": ${result.error.message}`);
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${randomBytes(6).toString("hex")}.tmp`,
  );
  await writeFile(tempPath, serialize(result.data), "utf-8");
  await rename(tempPath, filePath);
}
