// Calendar days as 'YYYY-MM-DD' strings. Scheduling works in whole days, so every date is a day
// in the person's own time zone, and arithmetic is done at noon UTC, where no daylight-saving
// change can move a day.

export type Day = string;

const DAY_MS = 86_400_000;

/** A new day starts at 04:00 local time, so a late-night session still counts as "today". */
export const DAY_STARTS_AT_HOUR = 4;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDay(value: unknown): value is Day {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export const toDate = (day: Day): Date => new Date(`${day}T12:00:00Z`);
export const fromDate = (date: Date): Day => date.toISOString().slice(0, 10);

export const addDays = (day: Day, n: number): Day => fromDate(new Date(toDate(day).getTime() + n * DAY_MS));

/** Whole days from `a` to `b` (positive when `b` is later). */
export const daysBetween = (a: Day, b: Day): number =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);

export const minDay = (a: Day, b: Day): Day => (a <= b ? a : b);
export const maxDay = (a: Day, b: Day): Day => (a >= b ? a : b);

/** Adds calendar months, keeping the day of the month where it exists (31 Jan + 1 month = 28 Feb). */
export function addMonths(day: Day, n: number): Day {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const d = Number(day.slice(8, 10));
  const first = new Date(Date.UTC(y, m - 1 + n, 1, 12));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return fromDate(first);
}

/** The person's current day: local date in `timeZone`, rolled back before 04:00. */
export function today(now: Date = new Date(), timeZone?: string): Day {
  const shifted = new Date(now.getTime() - DAY_STARTS_AT_HOUR * 3_600_000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(shifted);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
