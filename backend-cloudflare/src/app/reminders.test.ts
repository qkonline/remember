import { describe, expect, it } from 'vitest';
import { fakeCtx } from '../../test/fake-d1';
import type { Change } from '../sync/store';
import type { SyncWho } from '../sync/rules';
import { copyForReminders, localDay, nextRunAt, REMINDER_JOB, runReminder } from './reminders';

const who: SyncWho = { user: 'u1', session: 's1', role: null, space: 'user:u1' };
let n = 0;
const put = (table: string, record: string, fields: Record<string, unknown>) => ({
  change: { id: `c${n++}`, table, record, op: 'put', fields, at: new Date().toISOString() } as Change,
  who,
});
const del = (table: string, record: string) => ({
  change: { id: `c${n++}`, table, record, op: 'delete', at: new Date().toISOString() } as Change,
  who,
});

describe('reminder times', () => {
  it('finds the next 08:30 in the person’s zone', () => {
    // 2 Nov 2026 12:00 UTC is 07:00 in New York (EST): 08:30 is in 90 minutes.
    const now = Date.UTC(2026, 10, 2, 12, 0);
    expect(new Date(nextRunAt('08:30', 'America/New_York', now)!).toISOString()).toBe('2026-11-02T13:30:00.000Z');
    // Already past 08:30 in Karachi (17:00 there): tomorrow.
    expect(new Date(nextRunAt('08:30', 'Asia/Karachi', now)!).toISOString()).toBe('2026-11-03T03:30:00.000Z');
  });

  it('keeps the local time across a daylight-saving change', () => {
    // US clocks go back on 1 Nov 2026: 08:30 is 12:30 UTC before and 13:30 UTC after.
    const before = Date.UTC(2026, 9, 31, 13, 0);
    expect(new Date(nextRunAt('08:30', 'America/New_York', before)!).toISOString()).toBe('2026-11-01T13:30:00.000Z');
  });

  it('starts the day at 04:00 and refuses a time that isn’t HH:MM', () => {
    expect(localDay(Date.UTC(2026, 10, 3, 7, 30), 'America/New_York')).toBe('2026-11-02');
    expect(localDay(Date.UTC(2026, 10, 3, 10, 0), 'America/New_York')).toBe('2026-11-03');
    expect(nextRunAt('25:00', 'UTC', 0)).toBeNull();
  });
});

describe('copying from sync', () => {
  it('keeps each topic’s due day and active state, and forgets deleted topics', async () => {
    const { env, db } = fakeCtx();
    await copyForReminders(env, 'user:u1', [put('topics', 't1', { title: 'A', due: '2026-11-03', state: 'active' })]);
    await copyForReminders(env, 'user:u1', [put('topics', 't2', { title: 'B', due: '2026-11-04', state: 'active' })]);
    await copyForReminders(env, 'user:u1', [put('topics', 't1', { notes: 'only notes' })]);
    await copyForReminders(env, 'user:u1', [put('topics', 't2', { state: 'done' })]);
    expect(db.prepare('SELECT topic_id, due, active FROM remember_due ORDER BY topic_id').all()).toEqual([
      { topic_id: 't1', due: '2026-11-03', active: 1 },
      { topic_id: 't2', due: '2026-11-04', active: 0 },
    ]);
    await copyForReminders(env, 'user:u1', [del('topics', 't1')]);
    expect(db.prepare('SELECT topic_id FROM remember_due').all()).toEqual([{ topic_id: 't2' }]);
  });

  it('ignores team spaces', async () => {
    const { env, db } = fakeCtx();
    await copyForReminders(env, 'team:x', [put('topics', 't1', { due: '2026-11-03', state: 'active' })]);
    expect(db.prepare('SELECT count(*) AS n FROM remember_due').get()).toEqual({ n: 0 });
  });

  it('books one reminder job when a time is set, and none when it is turned off', async () => {
    const { env, db } = fakeCtx();
    const now = Date.UTC(2026, 10, 2, 12, 0);
    await copyForReminders(env, 'user:u1', [put('settings', 'settings-0000000000', { reminderAt: '08:30', tz: 'America/New_York' })], now);
    await copyForReminders(env, 'user:u1', [put('settings', 'settings-0000000000', { dailyCap: 20 })], now);
    const jobs = db.prepare('SELECT kind, run_at FROM core_jobs').all() as { kind: string; run_at: number }[];
    expect(jobs).toEqual([{ kind: REMINDER_JOB, run_at: Date.UTC(2026, 10, 2, 13, 30) }]);
    await copyForReminders(env, 'user:u2', [put('settings', 'settings-0000000000', { reminderAt: null, tz: 'UTC' })], now);
    expect(db.prepare('SELECT count(*) AS n FROM core_jobs').get()).toEqual({ n: 1 });
  });
});

describe('the reminder job', () => {
  const notes = (db: ReturnType<typeof fakeCtx>['db']) =>
    db.prepare('SELECT title, body, url FROM core_notifications').all() as { title: string; body: string; url: string }[];

  it('tells the person how many topics are due today, then books tomorrow', async () => {
    const { env, db } = fakeCtx();
    const now = Date.UTC(2026, 10, 2, 13, 30); // 08:30 in New York
    await copyForReminders(env, 'user:u1', [put('settings', 'settings-0000000000', { reminderAt: '08:30', tz: 'America/New_York' })], now - 86_400_000);
    await copyForReminders(env, 'user:u1', [
      put('topics', 'a', { due: '2026-11-01', state: 'active' }),
      put('topics', 'b', { due: '2026-11-02', state: 'active' }),
      put('topics', 'c', { due: '2026-11-03', state: 'active' }),
      put('topics', 'd', { due: '2026-11-02', state: 'done' }),
    ]);
    await runReminder(env, { userId: 'u1', at: '08:30', tz: 'America/New_York' }, now);
    expect(notes(db)).toEqual([{ title: 'Time to review', body: '2 topics to review today.', url: '/app' }]);
    const next = db.prepare('SELECT run_at FROM core_jobs ORDER BY run_at DESC LIMIT 1').get() as { run_at: number };
    expect(next.run_at).toBe(Date.UTC(2026, 10, 3, 13, 30));
  });

  it('stays quiet when nothing is due, and stops when the time was changed or turned off', async () => {
    const { env, db } = fakeCtx();
    const now = Date.UTC(2026, 10, 2, 13, 30);
    await copyForReminders(env, 'user:u1', [put('settings', 'settings-0000000000', { reminderAt: '08:30', tz: 'America/New_York' })], now - 86_400_000);
    await copyForReminders(env, 'user:u1', [put('topics', 'a', { due: '2026-11-05', state: 'active' })]);
    await runReminder(env, { userId: 'u1', at: '08:30', tz: 'America/New_York' }, now);
    expect(notes(db)).toEqual([]);
    // Moved to 09:00: the 08:30 job does nothing and books nothing.
    await copyForReminders(env, 'user:u1', [put('settings', 'settings-0000000000', { reminderAt: '09:00' })], now);
    const before = (db.prepare('SELECT count(*) AS n FROM core_jobs').get() as { n: number }).n;
    await runReminder(env, { userId: 'u1', at: '08:30', tz: 'America/New_York' }, now);
    expect((db.prepare('SELECT count(*) AS n FROM core_jobs').get() as { n: number }).n).toBe(before);
  });
});
