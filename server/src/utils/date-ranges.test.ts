import { describe, expect, it } from "vitest";
import { getMonthRange, getWeekRange } from "./date-ranges";

describe("getWeekRange", () => {
  it("starts on Monday and ends the following Monday when now is mid-week", () => {
    // Wednesday 2026-02-18
    const range = getWeekRange(new Date("2026-02-18T15:30:00Z"));
    expect(range.start.toISOString()).toBe("2026-02-16T00:00:00.000Z"); // Monday
    expect(range.end.toISOString()).toBe("2026-02-23T00:00:00.000Z"); // next Monday
  });

  it("treats Sunday as the last day of its week, not the first", () => {
    // Sunday 2026-02-22
    const range = getWeekRange(new Date("2026-02-22T23:59:00Z"));
    expect(range.start.toISOString()).toBe("2026-02-16T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-02-23T00:00:00.000Z");
  });

  it("treats Monday itself as the start of its own week", () => {
    const range = getWeekRange(new Date("2026-02-16T00:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-02-16T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-02-23T00:00:00.000Z");
  });

  it("handles a week that spans a month boundary", () => {
    // Sunday 2026-03-01 falls in a week starting Monday 2026-02-23
    const range = getWeekRange(new Date("2026-03-01T12:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-02-23T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-03-02T00:00:00.000Z");
  });
});

describe("getMonthRange", () => {
  it("spans the first through the last day of the current month", () => {
    const range = getMonthRange(new Date("2026-02-18T15:30:00Z"));
    expect(range.start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("rolls over correctly in December", () => {
    const range = getMonthRange(new Date("2026-12-15T00:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
