// Which topics to show today, in what order, and how many. Missed days are no penalty: overdue
// topics simply join today, the ones most likely to be forgotten first, with topics close to
// their end date (an exam) ahead of ones kept forever. Over the daily cap, the rest wait for the
// next days instead of piling up.

import { daysBetween, type Day } from './days.ts';
import { DEFAULT_RETENTION, recallOn, type CardCache } from './engine.ts';

export const DEFAULT_DAILY_CAP = 15;
export const MIN_DAILY_CAP = 5;
export const MAX_DAILY_CAP = 50;

/** About how long one check-in takes, for "about 3 min". */
export const SECONDS_PER_CHECKIN = 40;

/** Away this many days or more, Today opens with a welcome back instead of a backlog. */
export const BREAK_DAYS = 7;

export interface DueTopic {
  id: string;
  due: Day | null;
  endOn: Day | null;
  card: CardCache;
}

/** Lower comes first: the chance of recall today, less a boost as the end date nears (two weeks). */
export function priority(topic: DueTopic, today: Day, retention: number = DEFAULT_RETENTION): number {
  const recall = recallOn(topic.card, today, retention);
  if (!topic.endOn) return recall;
  const left = daysBetween(today, topic.endOn);
  const boost = left <= 14 ? (14 - Math.max(0, left)) / 28 : 0;
  return recall - boost;
}

export interface TodayList<T extends DueTopic> {
  /** What to refresh today, in order, at most the cap. */
  now: T[];
  /** Due but over the cap: they come up on the next days. */
  later: T[];
}

/** Topics due today or before, in order, split at the daily cap. */
export function todayList<T extends DueTopic>(
  topics: readonly T[],
  today: Day,
  cap: number = DEFAULT_DAILY_CAP,
  retention: number = DEFAULT_RETENTION,
): TodayList<T> {
  const due = topics
    .filter((t) => t.due !== null && t.due <= today)
    .map((t) => ({ t, p: priority(t, today, retention) }))
    .sort(
      (a, b) =>
        a.p - b.p || (a.t.due! < b.t.due! ? -1 : a.t.due! > b.t.due! ? 1 : 0) || (a.t.id < b.t.id ? -1 : 1),
    )
    .map((x) => x.t);
  const n = Math.max(MIN_DAILY_CAP, Math.min(MAX_DAILY_CAP, Math.round(cap)));
  return { now: due.slice(0, n), later: due.slice(n) };
}

/** Whole minutes the list takes, at least 1. */
export const minutesFor = (count: number): number =>
  Math.max(1, Math.round((count * SECONDS_PER_CHECKIN) / 60));

/** Whether the person is back after a break: their last check-in was BREAK_DAYS or more ago. */
export function backFromBreak(lastCheckIn: Day | null, today: Day): boolean {
  return lastCheckIn !== null && daysBetween(lastCheckIn, today) >= BREAK_DAYS;
}
