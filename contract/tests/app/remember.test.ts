// Remember's synced tables (backend-cloudflare/src/app/sync.ts): topics, their shelves, check-ins
// and the one settings record, through the core's /sync paths. Follows the checklist in docs/offline-data.md:
// two devices offline each create a record, sent in either order and twice, and both are kept
// with the ids they were made with.

import { randomUUID } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { call, confirm, expectReply, features, methods, signIn, signUp as signUpOnly } from '../lib';

type Change = { id: string; table: string; record: string; op: 'put' | 'delete'; fields?: Record<string, unknown>; at: string };
type SyncRecord = { table: string; id: string; fields: Record<string, unknown>; deleted: boolean };
type Result = { id: string; status: string; code?: string; message?: string };

const SETTINGS_ID = 'settings-0000000000';
const id = () => randomUUID();
const at = () => new Date().toISOString();
const put = (table: string, record: string, fields: Record<string, unknown>): Change => ({ id: id(), table, record, op: 'put', fields, at: at() });
const del = (table: string, record: string): Change => ({ id: id(), table, record, op: 'delete', at: at() });

const topic = (title: string) => ({
  title,
  notes: '',
  link: '',
  studiedOn: '2026-11-02',
  horizon: { kind: 'quarter' },
  endOn: '2027-02-02',
  state: 'active',
  due: '2026-11-03',
  card: { stability: 0, difficulty: 0, reps: 0, lapses: 0, last: null },
});

async function push(token: string, changes: Change[]): Promise<Result[]> {
  const r = await call('post', '/sync/push', { token, json: { changes } });
  expectReply(r, 'post', '/sync/push', 200);
  return r.body.results as Result[];
}

async function pullAll(token: string): Promise<SyncRecord[]> {
  const records: SyncRecord[] = [];
  let since: string | undefined;
  for (;;) {
    const r = await call('get', `/sync/pull${since ? `?since=${since}` : ''}`, { token });
    expectReply(r, 'get', '/sync/pull', 200);
    records.push(...r.body.records);
    since = r.body.next;
    if (!r.body.more) return records;
  }
}

async function signUp() {
  const p = await signUpOnly();
  if (methods.requireVerifiedEmail) p.user = await confirm(p);
  return p;
}

describe.skipIf(!features.sync)('remember', () => {
  test('two devices offline each add a topic: both kept, in either order, sent twice', async () => {
    const a = await signUp();
    const b = await signIn(a.email);
    const krebs = put('topics', id(), topic('Krebs cycle'));
    const contract = put('topics', id(), topic('Contract law, chapter 4'));

    expect((await push(b.token, [contract])).map((r) => r.status)).toEqual(['applied']);
    expect((await push(a.token, [krebs])).map((r) => r.status)).toEqual(['applied']);
    // The replies were lost: both devices send the same batches again.
    expect((await push(a.token, [krebs])).map((r) => r.status)).toEqual(['applied']);
    expect((await push(b.token, [contract])).map((r) => r.status)).toEqual(['applied']);

    const topics = (await pullAll(a.token)).filter((r) => r.table === 'topics');
    expect(topics.map((r) => r.id).sort()).toEqual([krebs.record, contract.record].sort());
    expect(topics.find((r) => r.id === krebs.record)?.fields.title).toBe('Krebs cycle');
  });

  test('a topic needs a title, a study day, a horizon and a state; unknown fields are refused', async () => {
    const p = await signUp();
    const [noTitle, badHorizon, extra, ok] = await push(p.token, [
      put('topics', id(), { ...topic(''), title: '  ' }),
      put('topics', id(), { ...topic('X'), horizon: { kind: 'decade' } }),
      put('topics', id(), { ...topic('X'), colour: 'red' }),
      put('topics', id(), { title: 'Only a title' }),
    ]);
    expect(noTitle).toMatchObject({ status: 'refused', code: 'invalid_input' });
    expect(badHorizon).toMatchObject({ status: 'refused', code: 'invalid_input' });
    expect(extra).toMatchObject({ status: 'refused', code: 'invalid_input' });
    expect(ok).toMatchObject({ status: 'refused', code: 'invalid_input' });
  });

  test('a topic merges edits from two devices field by field', async () => {
    const p = await signUp();
    const other = await signIn(p.email);
    const t = put('topics', id(), topic('Photosynthesis'));
    await push(p.token, [t]);
    await push(p.token, [put('topics', t.record, { notes: 'Light and dark reactions' })]);
    await push(other.token, [put('topics', t.record, { horizon: { kind: 'until', until: '2026-12-12' }, endOn: '2026-12-12' })]);
    const r = (await pullAll(p.token)).find((x) => x.id === t.record)!;
    expect(r.fields).toMatchObject({ notes: 'Light and dark reactions', endOn: '2026-12-12', title: 'Photosynthesis' });
  });

  test('two devices offline each make a shelf; a topic sits on one; a shelf needs a name and a colour', async () => {
    const a = await signUp();
    const b = await signIn(a.email);
    const biology = put('shelves', id(), { name: 'Biology', color: 'green' });
    const law = put('shelves', id(), { name: 'Law', color: 'rose' });
    expect((await push(b.token, [law])).map((r) => r.status)).toEqual(['applied']);
    expect((await push(a.token, [biology, biology])).map((r) => r.status)).toEqual(['applied', 'applied']);
    const t = put('topics', id(), { ...topic('Krebs cycle'), shelf: biology.record });
    const loose = put('topics', id(), { ...topic('Loose topic'), shelf: null });
    expect((await push(a.token, [t, loose])).map((r) => r.status)).toEqual(['applied', 'applied']);

    const [noName, blue, badShelf, extra] = await push(a.token, [
      put('shelves', id(), { name: ' ', color: 'green' }),
      put('shelves', id(), { name: 'Physics', color: 'blue' }),
      put('topics', t.record, { shelf: 'not an id' }),
      put('shelves', id(), { name: 'Maths', color: 'lime', icon: 'x' }),
    ]);
    for (const r of [noName, blue, badShelf, extra]) expect(r).toMatchObject({ status: 'refused', code: 'invalid_input' });

    const records = await pullAll(b.token);
    expect(records.filter((r) => r.table === 'shelves').map((r) => r.id).sort()).toEqual([biology.record, law.record].sort());
    expect(records.find((r) => r.id === t.record)?.fields.shelf).toBe(biology.record);
  });

  test('a check-in is kept as made: a second put to it is refused, deleting it is allowed', async () => {
    const p = await signUp();
    const t = put('topics', id(), topic('Mitosis'));
    const c = put('checkins', id(), { topic: t.record, rating: 'got', at: at(), day: '2026-11-03' });
    expect((await push(p.token, [t, c])).map((r) => r.status)).toEqual(['applied', 'applied']);
    // The same change sent again is the same change, applied once: fine.
    expect((await push(p.token, [c])).map((r) => r.status)).toEqual(['applied']);
    // A new change to the same check-in is not.
    const [edit] = await push(p.token, [put('checkins', c.record, { rating: 'forgot' })]);
    expect(edit).toMatchObject({ status: 'refused', code: 'invalid_input' });
    const [bad] = await push(p.token, [put('checkins', id(), { topic: t.record, rating: 'meh', at: at(), day: '2026-11-03' })]);
    expect(bad).toMatchObject({ status: 'refused', code: 'invalid_input' });
    expect((await push(p.token, [del('checkins', c.record)])).map((r) => r.status)).toEqual(['applied']);
    const kept = (await pullAll(p.token)).find((x) => x.id === c.record)!;
    expect(kept).toMatchObject({ deleted: true });
  });

  test('settings are one record that every device writes', async () => {
    const p = await signUp();
    const other = await signIn(p.email);
    await push(p.token, [put('settings', SETTINGS_ID, { reminderAt: '08:30', tz: 'Asia/Karachi', dailyCap: 15, retention: 0.9 })]);
    await push(other.token, [put('settings', SETTINGS_ID, { dailyCap: 20 })]);
    const [elsewhere, wrongTime, gone] = await push(p.token, [
      put('settings', id(), { dailyCap: 10 }),
      put('settings', SETTINGS_ID, { reminderAt: '25:00' }),
      del('settings', SETTINGS_ID),
    ]);
    expect(elsewhere).toMatchObject({ status: 'refused', code: 'invalid_input' });
    expect(wrongTime).toMatchObject({ status: 'refused', code: 'invalid_input' });
    expect(gone).toMatchObject({ status: 'refused', code: 'invalid_input' });
    const settings = (await pullAll(p.token)).filter((r) => r.table === 'settings');
    expect(settings).toHaveLength(1);
    expect(settings[0]?.fields).toMatchObject({ reminderAt: '08:30', dailyCap: 20, retention: 0.9 });
  });
});
