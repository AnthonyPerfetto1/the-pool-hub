export interface DateRange {
  start: Date;
  end: Date;
}

// The business currently operates in a single timezone (Michigan). There is
// no per-profile timezone concept yet — this will need to become per-user
// data once the app supports multiple businesses in different timezones.
const BUSINESS_TIME_ZONE = "America/Detroit";

interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

function partsToLookup(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

// The calendar date (Y/M/D) that `instant` falls on in the business timezone.
function toBusinessCalendarDate(instant: Date): CalendarDate {
  const lookup = partsToLookup(
    new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant),
  );
  return { year: Number(lookup.year), month: Number(lookup.month), day: Number(lookup.day) };
}

// The business timezone's UTC offset (in minutes, local = UTC + offset) at
// the given instant — e.g. -240 during EDT, -300 during EST. Derived purely
// from Intl/ICU, which ships with Node and already knows the IANA rules
// (including historical and future DST transition dates), so no timezone
// library is needed.
function getBusinessOffsetMinutes(instant: Date): number {
  const lookup = partsToLookup(
    new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(instant),
  );
  const asIfUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
  return (asIfUtc - instant.getTime()) / (60 * 1000);
}

// The UTC instant corresponding to local midnight (00:00:00) on the given
// calendar date in the business timezone. A single guess-and-correct pass is
// exact here: US DST transitions always occur at 2:00 AM local time, so
// midnight is never inside the ambiguous/skipped hour, and the offset a few
// hours either side of midnight never differs from the offset at midnight
// itself (the two candidate offsets only differ across an actual DST
// transition, which cannot fall between the previous evening and midnight
// of a transition day, or between midnight and the following evening).
function businessMidnightToUtc({ year, month, day }: CalendarDate): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetMinutes = getBusinessOffsetMinutes(guess);
  return new Date(guess.getTime() - offsetMinutes * 60 * 1000);
}

function shiftCalendarDate({ year, month, day }: CalendarDate, deltaDays: number): CalendarDate {
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

// Monday through Sunday, inclusive, according to the business timezone.
// [start, end) — end is UTC midnight of the following Monday, local time.
export function getWeekRange(now: Date): DateRange {
  const today = toBusinessCalendarDate(now);
  const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay(); // Sun=0..Sat=6
  const daysSinceMonday = (weekday + 6) % 7;
  const weekStart = shiftCalendarDate(today, -daysSinceMonday);
  const weekEnd = shiftCalendarDate(weekStart, 7);
  return {
    start: businessMidnightToUtc(weekStart),
    end: businessMidnightToUtc(weekEnd),
  };
}

// First through last day of the current calendar month, according to the
// business timezone. [start, end).
export function getMonthRange(now: Date): DateRange {
  const today = toBusinessCalendarDate(now);
  const monthEnd = { year: today.year, month: today.month + 1, day: 1 };
  return {
    start: businessMidnightToUtc({ year: today.year, month: today.month, day: 1 }),
    end: businessMidnightToUtc(monthEnd),
  };
}
