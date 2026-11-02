// How long a topic must stay remembered: the presets people pick from, an exam date, or a
// custom length. The horizon decides the end date; the scheduler lands the last check-in
// just before it.

import { addDays, addMonths, daysBetween, isDay, type Day } from './days.ts';

export type PresetKind = 'week' | 'month' | 'quarter' | 'half' | 'year' | 'forever';
export type HorizonKind = PresetKind | 'until' | 'custom';

export interface Horizon {
  kind: HorizonKind;
  /** For `custom`: the length in days (1 to 3650). */
  days?: number;
  /** For `until`: the last day it must be remembered on. */
  until?: Day;
}

export const PRESETS: readonly PresetKind[] = ['week', 'month', 'quarter', 'half', 'year', 'forever'];

/** The default for a first topic: a course or a semester. */
export const DEFAULT_HORIZON: Horizon = { kind: 'quarter' };

export const MAX_CUSTOM_DAYS = 3650;

/** The day the topic must still be remembered on, or null for forever. */
export function endOn(studiedOn: Day, horizon: Horizon): Day | null {
  switch (horizon.kind) {
    case 'week':
      return addDays(studiedOn, 7);
    case 'month':
      return addMonths(studiedOn, 1);
    case 'quarter':
      return addMonths(studiedOn, 3);
    case 'half':
      return addMonths(studiedOn, 6);
    case 'year':
      return addMonths(studiedOn, 12);
    case 'forever':
      return null;
    case 'until':
      return horizon.until ?? null;
    case 'custom':
      return addDays(studiedOn, Math.round(horizon.days ?? 0));
  }
}

/** Why a horizon can't be used, or null when it's fine. Messages are English keys for `t()`. */
export function horizonProblem(studiedOn: Day, horizon: Horizon, today: Day): string | null {
  if (horizon.kind === 'until') {
    if (!isDay(horizon.until)) return 'Pick a date.';
    if (horizon.until <= today) return 'Pick a date after today.';
    if (horizon.until <= studiedOn) return 'Pick a date after the day you studied it.';
  }
  if (horizon.kind === 'custom') {
    const n = horizon.days;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_CUSTOM_DAYS)
      return 'Choose 1 day to 10 years.';
    const end = endOn(studiedOn, horizon);
    if (end && end <= today) return 'That length has already passed.';
  }
  return null;
}

/** Days from studying to the end, or null for forever. */
export function horizonLength(studiedOn: Day, horizon: Horizon): number | null {
  const end = endOn(studiedOn, horizon);
  return end ? daysBetween(studiedOn, end) : null;
}
