import { readNews, writeNews } from "../storage/news.js";
import { readNewsStates, writeNewsStates } from "../storage/news-states.js";
import type { NewsState, NewsStateValue } from "../../shared/schemas/index.js";

export type SetNewsStateOutcome = { found: true } | { found: false };

/**
 * Writes a reading-state transition through to news-states.json (PRD
 * §6.3). Never rewrites news.json item metadata — the one exception is
 * `ignored`, which removes the item from active news.json immediately
 * (PRD §10: "Marking an item ignored removes it from active news.json
 * after confirmation"). news.json is written first so an interruption
 * between the two writes leaves, at worst, a state entry with no matching
 * active item and ignoredAt set — which reads as a live tombstone (#13),
 * the same shape a fully successful ignore produces, rather than an
 * inconsistent active item stuck in the "ignored" state.
 *
 * `readAt`/`ignoredAt` are set to `now` only when transitioning into that
 * state, so they track the most recent transition (used by §10's 2-month
 * read-expiry and 48h ignore-tombstone windows) — a prior state's
 * timestamp is left as-is rather than cleared, since it's simply unused
 * once the item is no longer in that state.
 */
export async function setNewsState(
  dataDir: string,
  itemId: string,
  state: NewsStateValue,
  now: Date = new Date(),
): Promise<SetNewsStateOutcome> {
  const items = await readNews(dataDir);
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) {
    return { found: false };
  }

  const nowIso = now.toISOString();
  const statesFile = await readNewsStates(dataDir);
  const existing = statesFile.items[itemId];

  const nextState: NewsState = {
    state,
    updatedAt: nowIso,
    ...(existing?.readAt ? { readAt: existing.readAt } : {}),
    ...(existing?.ignoredAt ? { ignoredAt: existing.ignoredAt } : {}),
    ...(state === "read" ? { readAt: nowIso } : {}),
    ...(state === "ignored" ? { ignoredAt: nowIso } : {}),
  };

  if (state === "ignored") {
    await writeNews(
      dataDir,
      items.filter((candidate) => candidate.id !== itemId),
    );
  }

  await writeNewsStates(dataDir, {
    schemaVersion: statesFile.schemaVersion,
    items: { ...statesFile.items, [itemId]: nextState },
  });

  return { found: true };
}
