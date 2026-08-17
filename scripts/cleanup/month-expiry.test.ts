import { describe, expect, it } from "vitest";
import type { NewsState } from "../../shared/schemas/index.js";
import { addCalendarMonths, isReadExpired } from "./month-expiry.js";

describe("addCalendarMonths", () => {
  it("adds two full months when both months have the same day count", () => {
    expect(addCalendarMonths("2026-01-31T00:00:00.000Z", 2).toISOString()).toBe(
      "2026-03-31T00:00:00.000Z",
    );
  });

  it("clamps into a shorter target month instead of rolling over", () => {
    // Dec 31 + 2 months = Feb, which only has 28 days in a non-leap year.
    expect(addCalendarMonths("2025-12-31T00:00:00.000Z", 2).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
  });

  it("clamps to Feb 29 in a leap year", () => {
    expect(addCalendarMonths("2027-12-31T00:00:00.000Z", 2).toISOString()).toBe(
      "2028-02-29T00:00:00.000Z",
    );
  });

  it("carries across a year boundary", () => {
    expect(addCalendarMonths("2026-11-15T12:00:00.000Z", 2).toISOString()).toBe(
      "2027-01-15T12:00:00.000Z",
    );
  });

  it("preserves the time of day", () => {
    expect(addCalendarMonths("2026-03-15T08:30:45.123Z", 2).toISOString()).toBe(
      "2026-05-15T08:30:45.123Z",
    );
  });
});

describe("isReadExpired", () => {
  function readState(readAt: string): NewsState {
    return { state: "read", updatedAt: readAt, readAt };
  }

  it("is not expired before two calendar months have passed", () => {
    const state = readState("2026-01-15T00:00:00.000Z");
    expect(isReadExpired(state, new Date("2026-03-14T23:59:59.999Z"))).toBe(false);
  });

  it("is expired exactly at the two-calendar-month boundary", () => {
    const state = readState("2026-01-15T00:00:00.000Z");
    expect(isReadExpired(state, new Date("2026-03-15T00:00:00.000Z"))).toBe(true);
  });

  it("is expired well past the boundary", () => {
    const state = readState("2026-01-15T00:00:00.000Z");
    expect(isReadExpired(state, new Date("2026-06-01T00:00:00.000Z"))).toBe(true);
  });

  it("is never expired for a state that isn't read", () => {
    const state: NewsState = { state: "unread", updatedAt: "2020-01-01T00:00:00.000Z" };
    expect(isReadExpired(state, new Date("2030-01-01T00:00:00.000Z"))).toBe(false);
  });

  it("handles the Jan 31 -> Mar 31 month-boundary case from the issue", () => {
    const state = readState("2026-01-31T00:00:00.000Z");
    expect(isReadExpired(state, new Date("2026-03-30T23:59:59.999Z"))).toBe(false);
    expect(isReadExpired(state, new Date("2026-03-31T00:00:00.000Z"))).toBe(true);
  });
});
