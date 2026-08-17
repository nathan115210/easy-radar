import type { NewsState } from "../../shared/schemas/index.js";

/** A `read` item is retained for two calendar months (PRD §10) before expiring. */
export const READ_EXPIRY_MONTHS = 2;

function daysInMonth(year: number, monthIndex0: number): number {
  // Day 0 of the *next* month is the last day of this one.
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/**
 * Adds `months` calendar months to `iso`, clamping the day-of-month to
 * the last day of the target month when it doesn't exist there (e.g. Dec
 * 31 + 2 months lands on Feb 28/29, not a rollover into March) — the
 * usual "calendar month" semantics, and the only one that can't silently
 * skip or double-count a day depending on which months are involved.
 */
export function addCalendarMonths(iso: string, months: number): Date {
  const source = new Date(iso);
  const totalMonths = source.getUTCFullYear() * 12 + source.getUTCMonth() + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(source.getUTCDate(), daysInMonth(targetYear, targetMonth));

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      source.getUTCHours(),
      source.getUTCMinutes(),
      source.getUTCSeconds(),
      source.getUTCMilliseconds(),
    ),
  );
}

/** True once `state` is a `read` item at least `READ_EXPIRY_MONTHS` past its `readAt`. */
export function isReadExpired(state: NewsState, now: Date): boolean {
  if (state.state !== "read" || !state.readAt) {
    return false;
  }
  const expiresAt = addCalendarMonths(state.readAt, READ_EXPIRY_MONTHS);
  return now.getTime() >= expiresAt.getTime();
}
