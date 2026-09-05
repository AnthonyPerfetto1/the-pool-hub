// Mirrors server/src/utils/date-ranges.ts's getWeekRange exactly — same IANA
// zone, same guess-and-correct offset algorithm — so the mobile Schedule's
// week/day boundaries never disagree with the backend's own Monday-Sunday
// reporting weeks. There is no shared runtime module between the server and
// Expo app (packages/types is types-only), so this is a deliberate, minimal
// port; keep the two implementations in sync if either changes.
const BUSINESS_TIME_ZONE = "America/Detroit";

export interface DateRange {
  start: Date;
  end: Date;
}

interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

function partsToLookup(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

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

function businessMidnightToUtc({ year, month, day }: CalendarDate): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetMinutes = getBusinessOffsetMinutes(guess);
  return new Date(guess.getTime() - offsetMinutes * 60 * 1000);
}

function shiftCalendarDate({ year, month, day }: CalendarDate, deltaDays: number): CalendarDate {
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

// Monday-Sunday week containing `now`, in the business timezone, shifted by
// `weekOffset` whole weeks (0 = current week, -1 = previous, 1 = next).
// [start, end).
export function getBusinessWeekRange(now: Date, weekOffset = 0): DateRange {
  const today = toBusinessCalendarDate(now);
  const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay(); // Sun=0..Sat=6
  const daysSinceMonday = (weekday + 6) % 7;
  const weekStart = shiftCalendarDate(today, -daysSinceMonday + weekOffset * 7);
  const weekEnd = shiftCalendarDate(weekStart, 7);
  return { start: businessMidnightToUtc(weekStart), end: businessMidnightToUtc(weekEnd) };
}

// The 8 Detroit-local day boundaries for the week starting at `weekStart`
// (as returned by getBusinessWeekRange): index 0 is Monday 00:00, index 6 is
// Sunday 00:00, index 7 is the following Monday 00:00 (== that week's end).
// Day i's jobs are those with scheduledDate in [boundaries[i], boundaries[i+1]).
export function getBusinessDayBoundaries(weekStart: Date): Date[] {
  const startCalendarDate = toBusinessCalendarDate(weekStart);
  return Array.from({ length: 8 }, (_, i) => businessMidnightToUtc(shiftCalendarDate(startCalendarDate, i)));
}

// The business-timezone calendar date `instant` falls on, as a comparable
// key — used to identify "today" without any device-timezone dependency.
export function getBusinessCalendarDateString(instant: Date): string {
  const { year, month, day } = toBusinessCalendarDate(instant);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatWeekdayLong(instant: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TIME_ZONE, weekday: "long" })
    .format(instant)
    .toUpperCase();
}

export function formatMonthDay(instant: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TIME_ZONE, month: "short", day: "numeric" }).format(
    instant,
  );
}
