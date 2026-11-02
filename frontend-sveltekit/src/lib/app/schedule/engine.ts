// When each topic comes back: FSRS-6 (ts-fsrs) for how memory fades, and a horizon layer on top
// that fits the check-ins to the person's end date. Pure functions of the check-in history, so a
// schedule can always be rebuilt from the record of what happened.
//
// The horizon layer:
// 1. The first check-in is the day after studying (forgetting is steepest in the first day).
// 2. Gaps come from FSRS at the person's desired recall (90% by default), so recall stays high
//    for the whole period.
// 3. When the next gap would pass the end date, a final check-in lands a little before it
//    (about 5% of the horizon, 1 to 14 days), and one more if recall on the end date would
//    still be below the target.
// 4. After the end date, nothing more comes back unless the horizon is extended.

import {
  createEmptyCard,
  fsrs,
  FSRS6_DEFAULT_DECAY,
  generatorParameters,
  Rating,
  type Card,
  type FSRS,
  type Grade,
} from 'ts-fsrs';
import { addDays, daysBetween, maxDay, toDate, type Day } from './days.ts';

export type RatingName = 'forgot' | 'hazy' | 'got';
export const RATINGS: readonly RatingName[] = ['forgot', 'hazy', 'got'];

/** Desired recall: Relaxed, Balanced (default), Intense. */
export const RETENTIONS = [0.8, 0.9, 0.95] as const;
export type Retention = (typeof RETENTIONS)[number];
export const DEFAULT_RETENTION: Retention = 0.9;

/** The longest gap between two check-ins, for forever topics. */
export const MAX_GAP_DAYS = 365;

export interface CheckIn {
  rating: RatingName;
  /** The person's day it happened on. */
  day: Day;
}

/** What a topic needs for scheduling. */
export interface Plan {
  studiedOn: Day;
  /** The last day it must be remembered on, or null for forever. */
  endOn: Day | null;
}

/** The memory state kept on the topic, so other devices and the server can read it. */
export interface CardCache {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  /** The day of the last check-in, or null before the first. */
  last: Day | null;
}

export interface Schedule {
  /** The next check-in's day, or null when none is left. */
  due: Day | null;
  card: CardCache;
  /** Whether the next check-in is the last before the end date. */
  final: boolean;
}

const GRADE: Record<RatingName, Grade> = {
  forgot: Rating.Again,
  hazy: Rating.Hard,
  got: Rating.Good,
};

const engines = new Map<number, FSRS>();
function engine(retention: number): FSRS {
  let f = engines.get(retention);
  if (!f) {
    f = fsrs(
      generatorParameters({
        request_retention: retention,
        maximum_interval: MAX_GAP_DAYS,
        enable_fuzz: false,
        enable_short_term: false,
      }),
    );
    engines.set(retention, f);
  }
  return f;
}

/** How far before the end date the final check-in lands: about 5% of the horizon, 1 to 14 days. */
export function finalBuffer(plan: Plan): number {
  if (!plan.endOn) return 0;
  const length = daysBetween(plan.studiedOn, plan.endOn);
  return Math.min(14, Math.max(1, Math.round(length * 0.05)));
}

/** FSRS-6 forgetting curve: the chance of recalling after `days` at this stability. */
export function recallAfter(stability: number, days: number, retention: number = DEFAULT_RETENTION): number {
  if (stability <= 0) return 0;
  const decay = engine(retention).parameters.w[20] ?? FSRS6_DEFAULT_DECAY;
  const factor = Math.pow(0.9, -1 / decay) - 1;
  return Math.pow(1 + (factor * Math.max(0, days)) / stability, -decay);
}

/** Replays the check-ins through FSRS; the card after the last one, or null before any. */
function replay(plan: Plan, checkins: readonly CheckIn[], retention: number): Card | null {
  if (!checkins.length) return null;
  const f = engine(retention);
  let card = createEmptyCard(toDate(plan.studiedOn));
  for (const c of [...checkins].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))) {
    card = f.next(card, toDate(maxDay(c.day, plan.studiedOn)), GRADE[c.rating]).card;
  }
  return card;
}

function cacheOf(card: Card | null, last: Day | null): CardCache {
  if (!card) return { stability: 0, difficulty: 0, reps: 0, lapses: 0, last: null };
  return {
    stability: Math.round(card.stability * 1000) / 1000,
    difficulty: Math.round(card.difficulty * 1000) / 1000,
    reps: card.reps,
    lapses: card.lapses,
    last,
  };
}

/**
 * The next check-in for a topic, from its check-ins. `retention` is the person's desired recall.
 */
export function schedule(
  plan: Plan,
  checkins: readonly CheckIn[],
  retention: number = DEFAULT_RETENTION,
): Schedule {
  const card = replay(plan, checkins, retention);
  const last = checkins.reduce<Day | null>((a, c) => (a === null || c.day > a ? c.day : a), null);
  const cache = cacheOf(card, last);
  const end = plan.endOn;

  // Rule 1: the day after studying.
  if (!card || !last) {
    const first = addDays(plan.studiedOn, 1);
    if (end && first > end) return { due: null, card: cache, final: false };
    return { due: first, card: cache, final: !!end && first >= addDays(end, -finalBuffer(plan)) };
  }

  // Rule 2: the gap FSRS gives at the desired recall.
  const gap = Math.max(1, Math.min(MAX_GAP_DAYS, Math.round(card.scheduled_days)));
  const next = addDays(last, gap);
  if (!end) return { due: next, card: cache, final: false };

  // Rule 4: past the end, nothing more.
  if (last >= end) return { due: null, card: cache, final: false };

  // Rule 3: land the finish.
  const finalDay = maxDay(addDays(end, -finalBuffer(plan)), addDays(last, 1));
  // A normal check-in that would land just before the final one is folded into it, when that
  // stretches the gap by no more than 30%: two check-ins days apart near the end help little.
  const foldable = daysBetween(last, finalDay) <= Math.round(gap * 1.3);
  if (next < finalDay && !foldable) return { due: next, card: cache, final: false };
  if (last < addDays(end, -finalBuffer(plan)))
    return { due: minDayOf(finalDay, end), card: cache, final: true };

  // The final check-in is done: one more only if recall on the end date would fall short.
  const left = daysBetween(last, end);
  if (left >= 2 && recallAfter(card.stability, left, retention) < retention) {
    return { due: addDays(last, Math.max(1, Math.floor(left / 2))), card: cache, final: true };
  }
  return { due: null, card: cache, final: false };
}

const minDayOf = (a: Day, b: Day): Day => (a <= b ? a : b);

/** The chance of recalling the topic on `day`, from its cached card (1 before any check-in). */
export function recallOn(card: CardCache, day: Day, retention: number = DEFAULT_RETENTION): number {
  if (!card.last || card.stability <= 0) return 1;
  return recallAfter(card.stability, daysBetween(card.last, day), retention);
}

/**
 * The check-ins to expect if every recall goes well: the days, at most `limit`. Used to show the
 * plan when a topic is saved ("about 6 check-ins until 1 Feb").
 */
export function preview(plan: Plan, retention: number = DEFAULT_RETENTION, limit = 12): Day[] {
  const days: Day[] = [];
  const checkins: CheckIn[] = [];
  for (let i = 0; i < limit; i++) {
    const s = schedule(plan, checkins, retention);
    if (!s.due) break;
    days.push(s.due);
    checkins.push({ rating: 'got', day: s.due });
  }
  return days;
}
