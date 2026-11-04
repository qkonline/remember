// Remember's daily reminder: one push a day, at the time each person picked, only when something
// is due. Devices sync topics and settings into the person's own space; `copyForReminders` (run
// by the sync's afterApply) keeps the two D1 tables in migrations/1000_reminders.sql up to date,
// and the `daily-reminder` job reads them, so no job ever opens anyone's sync space.

import { config, type Ctx, type Env } from '../env';
import { d1 } from '../db';
import { enqueue } from '../jobs';
import { notify } from '../notify';
import { tr } from '../i18n';
import type { Change } from '../sync/store';
import type { SyncWho } from '../sync/rules';

export const REMINDER_JOB = 'daily-reminder';

/** A new day starts at 04:00 local time, as on the device (frontend schedule/days.ts). */
const DAY_STARTS_AT_HOUR = 4;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface Parts {
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
}

/** The wall-clock date and time at `instant` in `timeZone` (UTC if the zone isn't known). */
export function partsIn(instant: number, timeZone: string): Parts {
  let f: Intl.DateTimeFormat;
  try {
    f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  } catch {
    f = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  }
  const p = Object.fromEntries(f.formatToParts(new Date(instant)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour) % 24, mi: Number(p.minute) };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The person's day ('YYYY-MM-DD') at `instant`: the local date, rolled back before 04:00. */
export function localDay(instant: number, timeZone: string): string {
  const p = partsIn(instant - DAY_STARTS_AT_HOUR * 3_600_000, timeZone);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** The instant that is `h:mi` on local date y-m-d in `timeZone` (across daylight-saving changes). */
function instantOf(y: number, m: number, d: number, h: number, mi: number, timeZone: string): number {
  const wanted = Date.UTC(y, m - 1, d, h, mi);
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const p = partsIn(guess, timeZone);
    guess += wanted - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
  }
  return guess;
}

/** The next time the clock reads `at` (HH:MM) in `timeZone`, at least a minute after `now`. */
export function nextRunAt(at: string, timeZone: string, now: number): number | null {
  const t = TIME_RE.exec(at);
  if (!t) return null;
  const h = Number(t[1]);
  const mi = Number(t[2]);
  for (let k = 0; k < 3; k++) {
    const day = partsIn(now + k * 86_400_000, timeZone);
    const when = instantOf(day.y, day.m, day.d, h, mi, timeZone);
    if (when > now + 60_000) return when;
  }
  return null;
}

async function scheduleNext(env: Env, userId: string, at: string, tz: string, now: number): Promise<void> {
  const when = nextRunAt(at, tz, now);
  if (when === null) return;
  // One job per person, day and time: changing the time makes a new one, and the old one, when it
  // runs, sees the setting moved and stops.
  await enqueue(env, REMINDER_JOB, { userId, at, tz }, { at: when, key: `remind:${userId}:${localDay(when, tz)}:${at}` });
}

/** After a batch is applied to a person's space: copy what the reminder needs into D1. */
export async function copyForReminders(env: Env, space: string, applied: { change: Change; who: SyncWho }[], now = Date.now()): Promise<void> {
  if (!space.startsWith('user:')) return;
  const userId = space.slice('user:'.length);
  const statements: D1PreparedStatement[] = [];
  let settings: { at?: string | null; tz?: string } | null = null;

  for (const { change } of applied) {
    if (change.table === 'topics') {
      if (change.op === 'delete') {
        statements.push(env.DB.prepare('DELETE FROM remember_due WHERE user_id = ? AND topic_id = ?').bind(userId, change.record));
        continue;
      }
      const f = change.fields ?? {};
      const hasDue = 'due' in f;
      const hasState = 'state' in f;
      if (!hasDue && !hasState) continue;
      const due = typeof f.due === 'string' ? f.due : null;
      const active = f.state === 'done' ? 0 : 1;
      statements.push(
        env.DB.prepare(
          `INSERT INTO remember_due (user_id, topic_id, due, active) VALUES (?, ?, ?, ?)
           ON CONFLICT (user_id, topic_id) DO UPDATE SET
             due = CASE WHEN ? THEN excluded.due ELSE remember_due.due END,
             active = CASE WHEN ? THEN excluded.active ELSE remember_due.active END`,
        ).bind(userId, change.record, due, active, hasDue ? 1 : 0, hasState ? 1 : 0),
      );
    } else if (change.table === 'settings' && change.op === 'put') {
      const f = change.fields ?? {};
      settings ??= {};
      if ('reminderAt' in f) settings.at = typeof f.reminderAt === 'string' && TIME_RE.test(f.reminderAt) ? f.reminderAt : null;
      if (typeof f.tz === 'string') settings.tz = f.tz;
    }
  }

  if (settings) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO remember_reminders (user_id, at, tz, updated) VALUES (?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET
           at = CASE WHEN ? THEN excluded.at ELSE remember_reminders.at END,
           tz = CASE WHEN ? THEN excluded.tz ELSE remember_reminders.tz END,
           updated = excluded.updated`,
      ).bind(userId, settings.at ?? null, settings.tz ?? 'UTC', now, 'at' in settings ? 1 : 0, 'tz' in settings ? 1 : 0),
    );
  }
  if (statements.length) await env.DB.batch(statements);

  if (settings) {
    const row = await env.DB.prepare('SELECT at, tz FROM remember_reminders WHERE user_id = ?').bind(userId).first<{ at: string | null; tz: string }>();
    if (row?.at) await scheduleNext(env, userId, row.at, row.tz, now);
  }
}

/** A context for `notify()` outside a request: the app's own address, English. */
function jobCtx(env: Env): Ctx {
  const origin = (env.APP_URL?.trim() || env.ALLOWED_ORIGINS.split(',')[0]?.trim() || 'http://localhost:5180').replace(/\/+$/, '');
  const api = `${origin}/api`;
  return { env, cfg: config(env, api), db: d1(env.DB), ip: 'local', network: 'local', api, lang: 'en' };
}

/** The job: if this is still the person's reminder and something is due, tell them; then book tomorrow's. */
export async function runReminder(env: Env, payload: unknown, now = Date.now()): Promise<void> {
  const { userId, at, tz } = (payload ?? {}) as { userId?: string; at?: string; tz?: string };
  if (!userId || !at || !tz) return;
  const row = await env.DB.prepare('SELECT at, tz FROM remember_reminders WHERE user_id = ?').bind(userId).first<{ at: string | null; tz: string }>();
  // Turned off, or moved to another time or zone since this job was booked: that one has its own job.
  if (!row?.at || row.at !== at || row.tz !== tz) return;

  const day = localDay(now, tz);
  const due = await env.DB.prepare('SELECT count(*) AS n FROM remember_due WHERE user_id = ? AND active = 1 AND due IS NOT NULL AND due <= ?')
    .bind(userId, day)
    .first<{ n: number }>();
  const n = due?.n ?? 0;
  if (n > 0) {
    const ctx = jobCtx(env);
    await notify(
      ctx,
      [userId],
      {
        title: tr(ctx.lang, 'Time to review'),
        body: n === 1 ? tr(ctx.lang, '1 topic to review today.') : tr(ctx.lang, '{count} topics to review today.', { count: n }),
        url: '/app',
      },
      { wait: true },
    );
  }
  await scheduleNext(env, userId, at, tz, now);
}
