// Remember's records on the device (IndexedDB, synced by the core's #lib/db): topics, their
// shelves, their check-ins and the person's settings, kept in one reactive place for the pages. Every write
// recomputes the topic's schedule from its check-ins, so `due` and `card` are always what the
// record of check-ins says.

import { data, ME } from '#lib/db/index.svelte.ts';
import {
  DEFAULT_DAILY_CAP,
  DEFAULT_RETENTION,
  endOn as endOfHorizon,
  nowIso,
  preview,
  schedule,
  today as todayIn,
  type CardCache,
  type CheckIn,
  type Day,
  type Horizon,
  type RatingName,
  type Retention,
} from '#lib/app/schedule/index.ts';

export const SETTINGS_ID = 'settings-0000000000';

/** The horizon picked last on this device (a device setting: `appDeviceKeys`). */
export const LAST_HORIZON_KEY = 'remember:last-horizon';
/** The shelf picked last on this device (a device setting: `appDeviceKeys`). */
export const LAST_SHELF_KEY = 'remember:last-shelf';

/** Shelf colours (the backend checks the same list). No blue in Remember's palette. */
export const SHELF_COLORS = ['green', 'rose', 'yellow', 'fuchsia', 'lime', 'sand'] as const;
export type ShelfColor = (typeof SHELF_COLORS)[number];

export interface Shelf {
  id: string;
  name: string;
  color: ShelfColor;
}

export interface Topic {
  id: string;
  title: string;
  /** The shelf it sits on, or null. */
  shelf: string | null;
  notes: string;
  link: string;
  studiedOn: Day;
  horizon: Horizon;
  endOn: Day | null;
  state: 'active' | 'done';
  due: Day | null;
  card: CardCache;
  doneOn: Day | null;
}

export interface CheckInRecord extends CheckIn {
  id: string;
  topic: string;
  at: string;
}

export interface Settings {
  reminderAt: string | null;
  tz: string;
  dailyCap: number;
  retention: Retention;
}

const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const defaults = (): Settings => ({
  reminderAt: null,
  tz: deviceZone(),
  dailyCap: DEFAULT_DAILY_CAP,
  retention: DEFAULT_RETENTION,
});

export const memory = $state({
  loaded: false,
  topics: [] as Topic[],
  shelves: [] as Shelf[],
  checkins: [] as CheckInRecord[],
  settings: defaults(),
  /** The person's day, refreshed when the app comes back to the front. */
  today: todayIn() as Day,
});

/** Writes plain copies: IndexedDB can't store Svelte's reactive proxies (a horizon picked in a form). */
const put = (table: string, id: string, fields: Record<string, unknown>) =>
  data.put(ME, table, id, $state.snapshot(fields) as Record<string, unknown>);

const EMPTY_CARD: CardCache = { stability: 0, difficulty: 0, reps: 0, lapses: 0, last: null };

function toTopic(id: string, f: Record<string, unknown>): Topic {
  return {
    id,
    title: String(f.title ?? ''),
    shelf: typeof f.shelf === 'string' && f.shelf ? f.shelf : null,
    notes: String(f.notes ?? ''),
    link: String(f.link ?? ''),
    studiedOn: String(f.studiedOn ?? memory.today),
    horizon: (f.horizon as Horizon) ?? { kind: 'quarter' },
    endOn: (f.endOn as Day | null) ?? null,
    state: f.state === 'done' ? 'done' : 'active',
    due: (f.due as Day | null) ?? null,
    card: (f.card as CardCache) ?? EMPTY_CARD,
    doneOn: (f.doneOn as Day | null) ?? null,
  };
}

let loading: Promise<void> | null = null;

/** Reads everything from the device. Safe to call often; concurrent calls share one read. */
export function load(): Promise<void> {
  loading ??= (async () => {
    try {
      const [topics, shelves, checkins, settings] = await Promise.all([
        data.list(ME, 'topics'),
        data.list(ME, 'shelves'),
        data.list(ME, 'checkins'),
        data.get(ME, 'settings', SETTINGS_ID),
      ]);
      memory.topics = topics.map((r) => toTopic(r.id, r.fields));
      memory.shelves = shelves
        .map((r) => ({
          id: r.id,
          name: String(r.fields.name ?? ''),
          color: (SHELF_COLORS as readonly string[]).includes(String(r.fields.color))
            ? (r.fields.color as ShelfColor)
            : 'sand',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      memory.checkins = checkins.map((r) => ({
        id: r.id,
        topic: String(r.fields.topic),
        rating: r.fields.rating as RatingName,
        at: String(r.fields.at),
        day: String(r.fields.day),
      }));
      const s = settings && !settings.deleted ? settings.fields : {};
      memory.settings = { ...defaults(), ...(s as Partial<Settings>) };
      memory.today = todayIn(undefined, memory.settings.tz);
      memory.loaded = true;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

let watching = false;
/** Keeps `memory` in step with the device, other tabs and the backend. Call once from a page. */
export function watch(): () => void {
  if (watching) return () => {};
  watching = true;
  void load();
  const stop = data.onChange((space) => {
    if (space === ME) void load();
  });
  const refreshDay = () => {
    if (document.visibilityState === 'visible') memory.today = todayIn(undefined, memory.settings.tz);
  };
  document.addEventListener('visibilitychange', refreshDay);
  return () => {
    watching = false;
    stop();
    document.removeEventListener('visibilitychange', refreshDay);
  };
}

export const checkinsOf = (topicId: string): CheckInRecord[] =>
  memory.checkins.filter((c) => c.topic === topicId).sort((a, b) => (a.at < b.at ? -1 : 1));

const planOf = (t: Pick<Topic, 'studiedOn' | 'endOn'>) => ({ studiedOn: t.studiedOn, endOn: t.endOn });

/** The schedule fields for a topic from its check-ins. */
function scheduled(t: Pick<Topic, 'studiedOn' | 'endOn'>, checkins: readonly CheckIn[]) {
  const s = schedule(planOf(t), checkins, memory.settings.retention);
  return { due: s.due, card: s.card };
}

export interface NewTopic {
  title: string;
  shelf: string | null;
  notes: string;
  link: string;
  studiedOn: Day;
  horizon: Horizon;
}

/** Adds a topic; its id and the check-ins to expect if all goes well. */
export async function addTopic(input: NewTopic): Promise<{ id: string; plan: Day[]; endOn: Day | null }> {
  if (!input.title.trim()) throw new Error('A topic needs a title.');
  const id = data.newId();
  const end = endOfHorizon(input.studiedOn, input.horizon);
  const fields = {
    title: input.title.trim(),
    shelf: input.shelf,
    notes: input.notes,
    link: input.link.trim(),
    studiedOn: input.studiedOn,
    horizon: input.horizon,
    endOn: end,
    state: 'active' as const,
    doneOn: null,
    ...scheduled({ studiedOn: input.studiedOn, endOn: end }, []),
  };
  await put('topics', id, fields);
  await load();
  return {
    id,
    plan: preview({ studiedOn: input.studiedOn, endOn: end }, memory.settings.retention),
    endOn: end,
  };
}

export interface CheckedIn {
  checkinId: string;
  topicId: string;
  next: Day | null;
  previous: { due: Day | null; card: CardCache };
}

/** Records a recall for today and moves the topic's next check-in. */
export async function checkIn(topicId: string, rating: RatingName): Promise<CheckedIn | null> {
  const t = memory.topics.find((x) => x.id === topicId);
  if (!t) return null;
  const checkinId = data.newId();
  const record = { topic: topicId, rating, at: nowIso(), day: memory.today };
  await put('checkins', checkinId, record);
  const s = scheduled(t, [...checkinsOf(topicId), record]);
  await put('topics', topicId, s);
  await load();
  return { checkinId, topicId, next: s.due, previous: { due: t.due, card: t.card } };
}

/** Takes a check-in back (Undo). */
export async function undoCheckIn(done: CheckedIn): Promise<void> {
  await data.remove(ME, 'checkins', done.checkinId);
  await put('topics', done.topicId, done.previous);
  await load();
}

/** Changes what a topic is about. */
export async function editTopic(
  topicId: string,
  fields: Partial<Pick<Topic, 'title' | 'notes' | 'link' | 'shelf'>>,
): Promise<void> {
  await put('topics', topicId, fields);
  await load();
}

/** Sets a new horizon (the exam moved, or "Keep it longer"), and the schedule follows. */
export async function changeHorizon(topicId: string, horizon: Horizon): Promise<void> {
  const t = memory.topics.find((x) => x.id === topicId);
  if (!t) return;
  const end = endOfHorizon(t.studiedOn, horizon);
  const s = scheduled({ studiedOn: t.studiedOn, endOn: end }, checkinsOf(topicId));
  await put('topics', topicId, { horizon, endOn: end, state: 'active', doneOn: null, ...s });
  await load();
}

/** Marks a topic kept to its finish line. */
export async function finish(topicId: string): Promise<void> {
  await put('topics', topicId, { state: 'done', doneOn: memory.today, due: null });
  await load();
}

/** Deletes a topic and its check-ins. */
export async function deleteTopic(topicId: string): Promise<void> {
  for (const c of checkinsOf(topicId)) await data.remove(ME, 'checkins', c.id);
  await data.remove(ME, 'topics', topicId);
  await load();
}

export const shelfOf = (topic: Pick<Topic, 'shelf'>): Shelf | null =>
  memory.shelves.find((s) => s.id === topic.shelf) ?? null;

/** The colour a new shelf gets: the first one no shelf has yet. */
export const nextShelfColor = (): ShelfColor =>
  SHELF_COLORS.find((c) => !memory.shelves.some((s) => s.color === c)) ??
  SHELF_COLORS[memory.shelves.length % SHELF_COLORS.length]!;

/** Makes a shelf; its id. */
export async function addShelf(name: string, color: ShelfColor = nextShelfColor()): Promise<string> {
  const id = data.newId();
  await put('shelves', id, { name: name.trim(), color });
  await load();
  return id;
}

/** Renames or recolours a shelf. */
export async function editShelf(
  shelfId: string,
  fields: Partial<Pick<Shelf, 'name' | 'color'>>,
): Promise<void> {
  await put('shelves', shelfId, fields.name === undefined ? fields : { ...fields, name: fields.name.trim() });
  await load();
}

/** Removes a shelf; its topics stay, on no shelf. */
export async function deleteShelf(shelfId: string): Promise<void> {
  for (const t of memory.topics.filter((x) => x.shelf === shelfId))
    await put('topics', t.id, { shelf: null });
  await data.remove(ME, 'shelves', shelfId);
  await load();
}

/** Changes settings; the time zone always follows this device's. */
export async function saveSettings(change: Partial<Settings>): Promise<void> {
  const next = { ...memory.settings, ...change, tz: deviceZone() };
  await put('settings', SETTINGS_ID, next);
  if (change.retention !== undefined && change.retention !== memory.settings.retention) {
    memory.settings = next;
    // A new target moves every active topic's next check-in.
    for (const t of memory.topics.filter((x) => x.state === 'active')) {
      await put('topics', t.id, scheduled(t, checkinsOf(t.id)));
    }
  }
  await load();
}

/** Active topics whose end date has passed: time to finish or extend them. */
export const finishedLines = (): Topic[] =>
  memory.topics.filter((t) => t.state === 'active' && t.endOn !== null && t.endOn < memory.today);

/** How far a topic has grown: check-ins done, and about how many it gets in all. */
export function growthOf(t: Topic): { done: number; total: number } {
  const done = checkinsOf(t.id).length;
  if (t.state === 'done') return { done, total: done };
  const planned = t.endOn === null ? 0 : preview(planOf(t), memory.settings.retention).length;
  return { done, total: Math.max(planned, done + (t.due ? 1 : 0)) };
}

/** The day of the last check-in of all, or null. */
export const lastCheckInDay = (): Day | null =>
  memory.checkins.reduce<Day | null>((a, c) => (a === null || c.day > a ? c.day : a), null);
