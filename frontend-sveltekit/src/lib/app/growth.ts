// Growth: what the person's check-ins add up to. Pure functions over check-ins and topics, so the
// Growth page, the review's last screen and the tests read the same numbers.

import { addDays, daysBetween, type Day, type RatingName } from '#lib/app/schedule/index.ts';

export interface GrowthCheckIn {
  topic: string;
  rating: RatingName;
  day: Day;
}

export interface GrowthTopic {
  id: string;
  shelf: string | null;
  state: 'active' | 'done';
  doneOn: Day | null;
  title: string;
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

/** The longest run of days in a row with a check-in. */
export function longestRun(checkins: readonly GrowthCheckIn[]): number {
  const days = [...new Set(checkins.map((c) => c.day))].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && daysBetween(days[i - 1]!, days[i]!) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
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

/** The share of check-ins recalled (Got it or Hazy: both count), 0 to 1, or null with none. */
export function remembered(checkins: readonly GrowthCheckIn[]): number | null {
  if (!checkins.length) return null;
  return checkins.filter((c) => c.rating !== 'forgot').length / checkins.length;
}

/** Check-ins from `from` (inclusive) on; all of them when `from` is null. */
export const since = <T extends GrowthCheckIn>(checkins: readonly T[], from: Day | null): T[] =>
  from === null ? [...checkins] : checkins.filter((c) => c.day >= from);

/** The first day of today's month. */
export const monthStart = (today: Day): Day => `${today.slice(0, 8)}01`;

/** Per shelf (null: no shelf): its topics and the share of its check-ins recalled. */
export function byShelf(
  topics: readonly GrowthTopic[],
  checkins: readonly GrowthCheckIn[],
): Map<string | null, { topics: number; remembered: number | null }> {
  const shelfOf = new Map(topics.map((t) => [t.id, t.shelf]));
  const out = new Map<string | null, { topics: number; remembered: number | null }>();
  for (const t of topics) {
    const row = out.get(t.shelf) ?? { topics: 0, remembered: null };
    row.topics++;
    out.set(t.shelf, row);
  }
  const groups = new Map<string | null, GrowthCheckIn[]>();
  for (const c of checkins) {
    if (!shelfOf.has(c.topic)) continue;
    const s = shelfOf.get(c.topic) ?? null;
    groups.set(s, [...(groups.get(s) ?? []), c]);
  }
  for (const [s, list] of groups) {
    const row = out.get(s);
    if (row) row.remembered = remembered(list);
  }
  return out;
}

/** Topics finished most recently first. */
export const recentlyLearned = <T extends GrowthTopic>(topics: readonly T[], limit = 5): T[] =>
  topics
    .filter((t) => t.state === 'done')
    .sort((a, b) => ((a.doneOn ?? '') < (b.doneOn ?? '') ? 1 : -1))
    .slice(0, limit);
