import type { NewsLabel } from "../../shared/schemas/index.js";

/**
 * Collection event types recognized across adapters. Deliberately not
 * "every event any future adapter could ever report" — adapters built in
 * later issues (#9, #10, #26-#30) extend this table as they're implemented,
 * each addition backed by its own unit test, rather than guessing ahead at
 * event shapes those issues haven't designed yet.
 */
export type CollectionEventType =
  | "feed-entry"
  | "github-stable-release"
  | "github-security-advisory"
  | "rfc-proposal-opened"
  | "tc39-proposal-created"
  | "tc39-stage-transition"
  | "tc39-withdrawal"
  | "announcement"
  | "api-item"
  | "website-article";

/**
 * Labels are derived from adapter/event type only — never an LLM (PRD §4.3,
 * §8). Table-driven so each mapping is a single, independently testable
 * fact rather than branching logic.
 */
const LABEL_BY_EVENT_TYPE: Record<CollectionEventType, NewsLabel> = {
  "feed-entry": "Engineering Article",
  "github-stable-release": "Release",
  "github-security-advisory": "Security Advisory",
  "rfc-proposal-opened": "RFC/Proposal",
  "tc39-proposal-created": "RFC/Proposal",
  "tc39-stage-transition": "Improvement",
  "tc39-withdrawal": "Retired",
  announcement: "Announcement",
  "api-item": "Announcement",
  "website-article": "Engineering Article",
};

export function deriveLabel(eventType: CollectionEventType): NewsLabel {
  return LABEL_BY_EVENT_TYPE[eventType];
}
