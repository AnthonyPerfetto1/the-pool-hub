export interface DateRange {
  start: Date;
  end: Date;
}

// Calendar boundaries are computed in UTC. The project has no established
// business-timezone concept — all stored timestamps are timestamptz instants
// compared as-is elsewhere in the codebase — so UTC calendar days are used
// here rather than introducing a timezone library.

// Monday through Sunday, inclusive. [start, end) — end is the following Monday.
export function getWeekRange(now: Date): DateRange {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isoDay = dayStart.getUTCDay(); // Sunday = 0 .. Saturday = 6
  const daysSinceMonday = (isoDay + 6) % 7;
  const start = new Date(dayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

// First day of the current calendar month through the first day of the next
// calendar month. [start, end).
export function getMonthRange(now: Date): DateRange {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}
