// THE APP'S OWN FILE: the rules for its synced tables (PRD section 11, docs/offline-data.md).
// The core reads this and never changes it.
//
// Remember keeps four tables in each person's space:
//
// - `topics`: what the person studied and how long they need it. Fields merge later-wins (one
//   person, their own devices). `card` and `due` are caches the device computes from the
//   check-ins, so any device or the server can read them.
// - `shelves`: the person's subjects (Biology, Law…), a name and a colour each; a topic names its
//   shelf by id, or none. Later-wins like topics.
// - `checkins`: one per recall, never edited once made (the schedule is rebuilt from them), so a
//   second put to the same check-in is refused. They can be deleted with their topic.
// - `settings`: one record per person, with a fixed id, so every device writes the same one.
//
// Each check refuses a change the person's device should never send (an old or broken copy of
// the app), with a message they can read; the app itself validates before writing.

import { refusal, type SyncRefusal, type SyncRules } from '../sync/rules';
import { copyForReminders } from './reminders';

export const SETTINGS_ID = 'settings-0000000000';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
const HORIZONS = new Set(['week', 'month', 'quarter', 'half', 'year', 'forever', 'until', 'custom']);
const RATINGS = new Set(['forgot', 'hazy', 'got']);
const RETENTIONS = new Set([0.8, 0.9, 0.95]);
/** Shelf colours: Remember's palette has no blue. */
const SHELF_COLORS = new Set(['green', 'rose', 'yellow', 'fuchsia', 'lime', 'sand']);

function isDay(v: unknown): boolean {
  if (typeof v !== 'string' || !DAY_RE.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
const isDayOrNull = (v: unknown) => v === null || isDay(v);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const bad = (message: string): SyncRefusal => refusal('invalid_input', message);

/** Checks the fields a change sets; `required` must be there on a new record. */
function fieldsProblem(
  fields: Record<string, unknown>,
  checks: Record<string, (v: unknown) => string | null>,
  required: readonly string[],
  isNew: boolean,
): SyncRefusal | null {
  for (const name of Object.keys(fields)) {
    const check = checks[name];
    if (!check) return bad(`Unknown field: ${name}.`);
    const problem = check(fields[name]);
    if (problem) return bad(problem);
  }
  if (isNew) for (const name of required) if (!(name in fields)) return bad(`Missing field: ${name}.`);
  return null;
}

const topicChecks: Record<string, (v: unknown) => string | null> = {
  title: (v) => (typeof v === 'string' && v.trim().length >= 1 && v.length <= 200 ? null : 'A topic needs a title of 1 to 200 characters.'),
  notes: (v) => (typeof v === 'string' && v.length <= 20_000 ? null : 'Notes can be up to 20,000 characters.'),
  link: (v) =>
    typeof v === 'string' && v.length <= 2000 && (v === '' || /^https?:\/\/\S+$/i.test(v)) ? null : 'A link starts with http:// or https://.',
  studiedOn: (v) => (isDay(v) ? null : 'The study date must be a day.'),
  horizon: (v) => {
    if (!isObject(v) || typeof v.kind !== 'string' || !HORIZONS.has(v.kind)) return 'Pick how long to remember it.';
    if (v.kind === 'until' && !isDay(v.until)) return 'Pick the date to remember it until.';
    if (v.kind === 'custom' && !(Number.isInteger(v.days) && (v.days as number) >= 1 && (v.days as number) <= 3650))
      return 'Choose 1 day to 10 years.';
    return null;
  },
  endOn: (v) => (isDayOrNull(v) ? null : 'The end date must be a day.'),
  state: (v) => (v === 'active' || v === 'done' ? null : 'A topic is active or done.'),
  due: (v) => (isDayOrNull(v) ? null : 'The next check-in must be a day.'),
  doneOn: (v) => (isDayOrNull(v) ? null : 'The finishing date must be a day.'),
  shelf: (v) => (v === null || (typeof v === 'string' && ID_RE.test(v)) ? null : 'A topic sits on one of your shelves, or none.'),
  card: (v) =>
    isObject(v) &&
    ['stability', 'difficulty', 'reps', 'lapses'].every((k) => typeof v[k] === 'number' && Number.isFinite(v[k] as number)) &&
    isDayOrNull(v.last)
      ? null
      : 'The memory state is not readable.',
};

const shelfChecks: Record<string, (v: unknown) => string | null> = {
  name: (v) => (typeof v === 'string' && v.trim().length >= 1 && v.length <= 40 ? null : 'A shelf needs a name of 1 to 40 characters.'),
  color: (v) => (typeof v === 'string' && SHELF_COLORS.has(v) ? null : 'Pick one of the shelf colours.'),
};

const checkinChecks: Record<string, (v: unknown) => string | null> = {
  topic: (v) => (typeof v === 'string' && ID_RE.test(v) ? null : 'A check-in belongs to a topic.'),
  rating: (v) => (typeof v === 'string' && RATINGS.has(v) ? null : 'A check-in is Forgot, Hazy or Got it.'),
  at: (v) => (typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? null : 'A check-in needs its time.'),
  day: (v) => (isDay(v) ? null : 'A check-in needs its day.'),
};

const settingsChecks: Record<string, (v: unknown) => string | null> = {
  reminderAt: (v) => (v === null || (typeof v === 'string' && TIME_RE.test(v)) ? null : 'A reminder time is HH:MM.'),
  tz: (v) => (typeof v === 'string' && v.length >= 1 && v.length <= 64 ? null : 'The time zone is not readable.'),
  dailyCap: (v) => (Number.isInteger(v) && (v as number) >= 5 && (v as number) <= 50 ? null : 'Choose 5 to 50 topics a day.'),
  retention: (v) => (typeof v === 'number' && RETENTIONS.has(v) ? null : 'Choose Relaxed, Balanced or Intense.'),
};

// `onlyListed` stays false: the core's contract suite syncs example tables (`appointments`) and
// must pass against this backend. Other tables stay in the person's own space and Remember never
// reads them.
export const syncRules: SyncRules = {
  onlyListed: false,
  // Due days and the reminder time, copied to D1 for the daily reminder (reminders.ts).
  afterApply: (env, space, applied) => copyForReminders(env, space, applied),
  tables: {
    topics: {
      check: (c, current) =>
        c.op === 'put'
          ? fieldsProblem(c.fields ?? {}, topicChecks, ['title', 'studiedOn', 'horizon', 'state'], !current)
          : null,
    },
    shelves: {
      check: (c, current) => (c.op === 'put' ? fieldsProblem(c.fields ?? {}, shelfChecks, ['name', 'color'], !current) : null),
    },
    checkins: {
      check: (c, current) => {
        if (c.op === 'delete') return null;
        if (current && !current.deleted) return bad('A check-in can’t be changed once made.');
        return fieldsProblem(c.fields ?? {}, checkinChecks, ['topic', 'rating', 'at', 'day'], true);
      },
    },
    settings: {
      check: (c, current) => {
        if (c.record !== SETTINGS_ID) return bad('Settings are kept in one record.');
        if (c.op === 'delete') return bad('Settings can’t be deleted.');
        return fieldsProblem(c.fields ?? {}, settingsChecks, [], !current);
      },
    },
  },
};
