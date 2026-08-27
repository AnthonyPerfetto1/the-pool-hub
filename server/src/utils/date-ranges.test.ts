import { describe, expect, it } from "vitest";
import { getMonthRange, getWeekRange } from "./date-ranges";

// All reference instants and expected boundaries below are explicit UTC
// timestamps computed against America/Detroit's real IANA rules, so these
// tests are exact regardless of the machine's local timezone.
//
// Relevant 2026 DST transitions used throughout:
//   - Spring forward: 2026-03-08, 2:00 AM EST -> 3:00 AM EDT
//   - Fall back:       2026-11-01, 2:00 AM EDT -> 1:00 AM EST

describe("getWeekRange", () => {
  it("computes Monday-Sunday boundaries for a normal EDT date (mid-week)", () => {
    // Wednesday 2026-07-15, well inside EDT (UTC-4)
    const range = getWeekRange(new Date("2026-07-15T15:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-07-13T04:00:00.000Z"); // Monday 00:00 EDT
    expect(range.end.toISOString()).toBe("2026-07-20T04:00:00.000Z"); // next Monday 00:00 EDT
  });

  it("computes Monday-Sunday boundaries for a normal EST date (mid-week)", () => {
    // Thursday 2026-01-15, well inside EST (UTC-5)
    const range = getWeekRange(new Date("2026-01-15T18:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-01-12T05:00:00.000Z"); // Monday 00:00 EST
    expect(range.end.toISOString()).toBe("2026-01-19T05:00:00.000Z"); // next Monday 00:00 EST
  });

  it("treats Sunday as the last day of its own week, not the first", () => {
    // Sunday 2026-07-19, 3:00 PM EDT
    const range = getWeekRange(new Date("2026-07-19T19:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-07-13T04:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-20T04:00:00.000Z");
  });

  it("treats Monday itself as the start of its own week", () => {
    // Monday 2026-07-13, noon EDT
    const range = getWeekRange(new Date("2026-07-13T16:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-07-13T04:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-20T04:00:00.000Z");
  });

  it("handles a week that spans a month boundary", () => {
    // Sunday 2026-02-01 falls in the week starting Monday 2026-01-26
    const range = getWeekRange(new Date("2026-02-01T20:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-01-26T05:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-02-02T05:00:00.000Z");
  });

  it("a payment made Sunday evening in Eastern Time falls in that week, not the next", () => {
    // This is the original bug: 2026-07-19 (Sunday) 9:00 PM EDT is
    // 2026-07-20T01:00:00Z in UTC — already "Monday" by UTC-calendar
    // reckoning, but still Sunday evening for the business.
    const sundayEveningEastern = new Date("2026-07-20T01:00:00Z");
    const week = getWeekRange(new Date("2026-07-15T15:00:00Z")); // any day in the same Eastern week
    expect(sundayEveningEastern.getTime()).toBeGreaterThanOrEqual(week.start.getTime());
    expect(sundayEveningEastern.getTime()).toBeLessThan(week.end.getTime());
  });

  it("handles the spring-forward week correctly (EST start, EDT end)", () => {
    // Week of Monday 2026-03-02 - Sunday 2026-03-08. The transition happens
    // at 2:00 AM local on the 8th itself, so the week starts in EST and the
    // following Monday (2026-03-09) begins in EDT.
    const range = getWeekRange(new Date("2026-03-04T15:00:00Z")); // Wednesday that week
    expect(range.start.toISOString()).toBe("2026-03-02T05:00:00.000Z"); // Monday 00:00 EST
    expect(range.end.toISOString()).toBe("2026-03-09T04:00:00.000Z"); // next Monday 00:00 EDT
  });
});

describe("getMonthRange", () => {
  it("spans the first through the last day of an EDT month", () => {
    const range = getMonthRange(new Date("2026-07-15T15:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-01T04:00:00.000Z");
  });

  it("spans the first through the last day of an EST month", () => {
    const range = getMonthRange(new Date("2026-01-15T18:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-01-01T05:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-02-01T05:00:00.000Z");
  });

  it("rolls over correctly in December", () => {
    const range = getMonthRange(new Date("2026-12-15T18:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-12-01T05:00:00.000Z");
    expect(range.end.toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });

  it("a payment made on the evening of the last day of the month falls in that month, not the next", () => {
    // 2026-07-31 9:00 PM EDT is 2026-08-01T01:00:00Z in UTC.
    const endOfMonthEvening = new Date("2026-08-01T01:00:00Z");
    const july = getMonthRange(new Date("2026-07-15T15:00:00Z"));
    expect(endOfMonthEvening.getTime()).toBeGreaterThanOrEqual(july.start.getTime());
    expect(endOfMonthEvening.getTime()).toBeLessThan(july.end.getTime());
  });

  it("a payment made just after midnight on the 1st belongs to the new month", () => {
    // 2026-08-01 12:30 AM EDT is 2026-08-01T04:30:00Z in UTC.
    const startOfMonthAfterMidnight = new Date("2026-08-01T04:30:00Z");
    const july = getMonthRange(new Date("2026-07-15T15:00:00Z"));
    const august = getMonthRange(new Date("2026-08-15T15:00:00Z"));
    expect(startOfMonthAfterMidnight.getTime()).toBeGreaterThanOrEqual(august.start.getTime());
    expect(startOfMonthAfterMidnight.getTime()).toBeLessThan(august.end.getTime());
    expect(startOfMonthAfterMidnight.getTime()).toBeGreaterThanOrEqual(july.end.getTime());
  });

  it("handles a month that contains the spring-forward transition (EST start, EDT end)", () => {
    // March 2026: the 8th's transition means March 1 is still EST but
    // April 1 is already EDT — each boundary must use its own correct
    // offset rather than one offset for the whole month.
    const range = getMonthRange(new Date("2026-03-15T15:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-03-01T05:00:00.000Z"); // March 1 00:00 EST
    expect(range.end.toISOString()).toBe("2026-04-01T04:00:00.000Z"); // April 1 00:00 EDT
  });

  it("handles a month that contains the fall-back transition (EDT start, EST end)", () => {
    // November 2026: the 1st's transition means November 1 is still EDT
    // but December 1 is already EST.
    const range = getMonthRange(new Date("2026-11-15T15:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-11-01T04:00:00.000Z"); // Nov 1 00:00 EDT
    expect(range.end.toISOString()).toBe("2026-12-01T05:00:00.000Z"); // Dec 1 00:00 EST
  });
});
