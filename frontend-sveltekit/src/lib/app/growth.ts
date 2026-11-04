// Progress: what the person's check-ins add up to. Pure functions over check-ins, so the Progress
// page, the review's last screen and the tests read the same numbers.

import { addDays, type Day, type RatingName } from '#lib/app/schedule/index.ts';

export interface GrowthCheckIn {
  topic: string;
  rating: RatingName;
  day: Day;
}

/** Days in a row with at least one check-in, ending today, or yesterday when today has none yet. */
export function currentRun(checkins: readonly GrowthCheckIn[], today: Day): number {
  const days = new Set(checkins.map((c) => c.day));
  let day = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** Check-ins per day for the `weeks` weeks ending with today's week (Monday first), oldest first. */
export function calendar(
  checkins: readonly GrowthCheckIn[],
  today: Day,
  weeks = 5,
): { day: Day; count: number }[] {
  const counts = new Map<Day, number>();
  for (const c of checkins) counts.set(c.day, (counts.get(c.day) ?? 0) + 1);
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday 0
  const start = addDays(today, -weekday - 7 * (weeks - 1));
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const day = addDays(start, i);
    return { day, count: day > today ? -1 : (counts.get(day) ?? 0) };
  });
}

/** 0 to 4, for colouring a calendar day by how many check-ins it had. */
export const level = (count: number): number =>
  count <= 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;

/** How many check-ins were fully remembered (Hazy is not), for "You remembered 2 of 3". */
export const rememberedCount = (checkins: readonly GrowthCheckIn[]): number =>
  checkins.filter((c) => c.rating === 'got').length;

/** Check-ins from `from` (inclusive) on; all of them when `from` is null. */
export const since = <T extends GrowthCheckIn>(checkins: readonly T[], from: Day | null): T[] =>
  from === null ? [...checkins] : checkins.filter((c) => c.day >= from);

/** The first day of today's month. */
export const monthStart = (today: Day): Day => `${today.slice(0, 8)}01`;
