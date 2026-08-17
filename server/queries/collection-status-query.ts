import { readCollectionStatus } from "../storage/index.js";
import type { CollectionStatusResponse } from "../../shared/schemas/index.js";

/** A collection is stale after 36 hours (PRD §7.1). */
const STALE_THRESHOLD_MS = 36 * 60 * 60 * 1000;

export async function getCollectionStatusSummary(
  dataDir: string,
  now: Date = new Date(),
): Promise<CollectionStatusResponse> {
  const status = await readCollectionStatus(dataDir);
  const stale = now.getTime() - Date.parse(status.lastRunAt) > STALE_THRESHOLD_MS;

  return {
    lastRunAt: status.lastRunAt,
    stale,
    coverage: status.coverage,
    ...(status.rejected ? { rejected: status.rejected } : {}),
  };
}
