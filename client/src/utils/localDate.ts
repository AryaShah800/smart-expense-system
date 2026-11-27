// Date inputs work in "YYYY-MM-DD" on the user's own calendar. `toISOString()` and `new Date("YYYY-MM-DD")`
// both use UTC instead, which is a different day for part of the day outside UTC (00:00-05:29 in India).

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date on the user's calendar, as "YYYY-MM-DD" (for date inputs and file names). */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Local midnight at the start of a "YYYY-MM-DD" day. */
export function startOfLocalDay(day: string): Date {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Local midnight at the start of the day after `day`: the exclusive end of a "to" date filter. */
export function startOfNextLocalDay(day: string): Date {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  return new Date(y, m - 1, d + 1);
}
