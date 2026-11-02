import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  backFromBreak,
  daysBetween,
  endOn,
  finalBuffer,
  horizonProblem,
  isDay,
  minutesFor,
  preview,
  recallAfter,
  schedule,
  today,
  todayList,
  type CheckIn,
  type DueTopic,
  type Plan,
} from './index.ts';

describe('days', () => {
  it('starts a new day at 04:00 local time', () => {
    // 02:30 in New York on 3 Nov is still 2 Nov; 05:00 is 3 Nov.
    expect(today(new Date('2026-11-03T07:30:00Z'), 'America/New_York')).toBe('2026-11-02');
    expect(today(new Date('2026-11-03T10:00:00Z'), 'America/New_York')).toBe('2026-11-03');
    expect(today(new Date('2026-11-03T03:00:00Z'), 'Asia/Karachi')).toBe('2026-11-03');
  });

  it('adds days across daylight saving changes and month ends', () => {
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-02', 12)).toBe('2027-11-02');
  });

  it('knows a real day', () => {
    expect(isDay('2026-02-28')).toBe(true);
    expect(isDay('2026-02-30')).toBe(false);
    expect(isDay('2026-2-3')).toBe(false);
    expect(isDay(20261102)).toBe(false);
  });
});

describe('horizon', () => {
  const s = '2026-11-02';
  it('turns presets into end dates', () => {
    expect(endOn(s, { kind: 'week' })).toBe('2026-11-09');
    expect(endOn(s, { kind: 'month' })).toBe('2026-12-02');
    expect(endOn(s, { kind: 'quarter' })).toBe('2027-02-02');
    expect(endOn(s, { kind: 'half' })).toBe('2027-05-02');
    expect(endOn(s, { kind: 'year' })).toBe('2027-11-02');
    expect(endOn(s, { kind: 'forever' })).toBeNull();
    expect(endOn(s, { kind: 'until', until: '2026-12-12' })).toBe('2026-12-12');
    expect(endOn(s, { kind: 'custom', days: 45 })).toBe('2026-12-17');
  });

  it('refuses dates and lengths that make no sense', () => {
    expect(horizonProblem(s, { kind: 'until', until: '2026-11-02' }, s)).toBe('Pick a date after today.');
    expect(horizonProblem(s, { kind: 'until' }, s)).toBe('Pick a date.');
    expect(horizonProblem(s, { kind: 'custom', days: 0 }, s)).toBe('Choose 1 day to 10 years.');
    expect(horizonProblem('2026-10-01', { kind: 'custom', days: 10 }, s)).toBe(
      'That length has already passed.',
    );
    expect(horizonProblem(s, { kind: 'until', until: '2026-12-12' }, s)).toBeNull();
    expect(horizonProblem(s, { kind: 'quarter' }, s)).toBeNull();
  });
});

const plan = (studiedOn: string, end: string | null): Plan => ({ studiedOn, endOn: end });

describe('schedule', () => {
  it('brings a new topic back the next day', () => {
    expect(schedule(plan('2026-11-02', '2027-02-02'), []).due).toBe('2026-11-03');
    expect(schedule(plan('2026-11-02', null), []).due).toBe('2026-11-03');
  });

  it('grows the gaps while recall is good', () => {
    const p = plan('2026-11-02', null);
    const days = preview(p, 0.9, 6);
    const gaps = days.slice(1).map((d, i) => daysBetween(days[i]!, d));
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]!);
    expect(days[0]).toBe('2026-11-03');
  });

  it('caps forever gaps at a year', () => {
    const days = preview(plan('2026-11-02', null), 0.9, 12);
    const gaps = days.slice(1).map((d, i) => daysBetween(days[i]!, d));
    expect(Math.max(...gaps)).toBeLessThanOrEqual(365);
    expect(gaps.at(-1)).toBe(365);
  });

  it('lands the last check-in just before the end and then stops', () => {
    for (const [kind, maxCheckins] of [
      ['week', 4],
      ['month', 5],
      ['quarter', 7],
      ['half', 8],
      ['year', 9],
    ] as const) {
      const p = plan('2026-11-02', endOn('2026-11-02', { kind }));
      const days = preview(p);
      expect(days.length, kind).toBeGreaterThanOrEqual(2);
      expect(days.length, kind).toBeLessThanOrEqual(maxCheckins);
      const last = days.at(-1)!;
      expect(last <= p.endOn!, kind).toBe(true);
      expect(daysBetween(last, p.endOn!), kind).toBeLessThanOrEqual(finalBuffer(p) + 1);
      expect(new Set(days).size, kind).toBe(days.length);
    }
  });

  it('keeps recall at the end date at or above the target after the plan', () => {
    const p = plan('2026-11-02', '2027-02-02');
    const days = preview(p);
    const checkins: CheckIn[] = days.map((day) => ({ rating: 'got', day }));
    const s = schedule(p, checkins);
    expect(s.due).toBeNull();
    expect(recallAfter(s.card.stability, daysBetween(s.card.last!, p.endOn!))).toBeGreaterThanOrEqual(0.88);
  });

  it('brings a forgotten topic back sooner', () => {
    const p = plan('2026-11-02', null);
    const base: CheckIn[] = [
      { rating: 'got', day: '2026-11-03' },
      { rating: 'got', day: '2026-11-06' },
    ];
    const good = schedule(p, [...base, { rating: 'got', day: '2026-11-20' }]);
    const forgot = schedule(p, [...base, { rating: 'forgot', day: '2026-11-20' }]);
    expect(daysBetween('2026-11-20', forgot.due!)).toBeLessThan(daysBetween('2026-11-20', good.due!));
    expect(forgot.card.lapses).toBe(1);
  });

  it('does not care about the order check-ins arrive in', () => {
    const p = plan('2026-11-02', '2027-02-02');
    const a: CheckIn[] = [
      { rating: 'got', day: '2026-11-03' },
      { rating: 'hazy', day: '2026-11-07' },
      { rating: 'got', day: '2026-11-20' },
    ];
    expect(schedule(p, [...a].reverse())).toEqual(schedule(p, a));
  });

  it('stops after the end date and never schedules past it', () => {
    const p = plan('2026-11-02', '2026-11-09');
    expect(schedule(p, [{ rating: 'got', day: '2026-11-10' }]).due).toBeNull();
    for (const day of preview(p)) expect(day <= '2026-11-09').toBe(true);
  });

  it('handles an exam the next day', () => {
    const p = plan('2026-11-02', '2026-11-03');
    expect(preview(p)).toEqual(['2026-11-03']);
  });

  it('keeps a late check-in late: overdue is no penalty', () => {
    const p = plan('2026-11-02', null);
    const s = schedule(p, [{ rating: 'got', day: '2026-11-30' }]);
    expect(s.due! > '2026-11-30').toBe(true);
  });

  it('asks less often for a relaxed target than an intense one', () => {
    const p = plan('2026-11-02', null);
    expect(preview(p, 0.8, 5).at(-1)! > preview(p, 0.95, 5).at(-1)!).toBe(true);
  });
});

describe('recall', () => {
  it('is 90% after exactly the stability, in FSRS-6', () => {
    expect(recallAfter(10, 10)).toBeCloseTo(0.9, 3);
    expect(recallAfter(10, 0)).toBe(1);
    expect(recallAfter(10, 30)).toBeLessThan(0.9);
  });
});

describe('today', () => {
  const card = (stability: number, last: string | null) => ({
    stability,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    last,
  });
  const topic = (
    id: string,
    due: string | null,
    endOn: string | null,
    stability: number,
    last: string | null,
  ): DueTopic => ({
    id,
    due,
    endOn,
    card: card(stability, last),
  });

  it('shows only what is due, the most likely to be forgotten first', () => {
    const list = todayList(
      [
        topic('strong', '2026-11-10', null, 50, '2026-10-20'),
        topic('weak', '2026-11-08', null, 2, '2026-11-01'),
        topic('future', '2026-11-12', null, 5, '2026-11-05'),
        topic('none', null, '2026-11-01', 5, '2026-10-30'),
      ],
      '2026-11-10',
    );
    expect(list.now.map((t) => t.id)).toEqual(['weak', 'strong']);
  });

  it('puts an exam close at hand ahead of a forever topic', () => {
    const list = todayList(
      [
        topic('forever', '2026-11-10', null, 3, '2026-11-07'),
        topic('exam', '2026-11-10', '2026-11-12', 6, '2026-11-07'),
      ],
      '2026-11-10',
    );
    expect(list.now[0]?.id).toBe('exam');
  });

  it('keeps the rest for later over the cap, never fewer than 5 a day', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      topic(`t${i}`, '2026-11-10', null, 1 + i, '2026-11-05'),
    );
    expect(todayList(many, '2026-11-10', 8)).toMatchObject({ now: { length: 8 }, later: { length: 4 } });
    expect(todayList(many, '2026-11-10', 1).now).toHaveLength(5);
  });

  it('estimates minutes and spots a break', () => {
    expect(minutesFor(0)).toBe(1);
    expect(minutesFor(4)).toBe(3);
    expect(backFromBreak('2026-11-01', '2026-11-10')).toBe(true);
    expect(backFromBreak('2026-11-08', '2026-11-10')).toBe(false);
    expect(backFromBreak(null, '2026-11-10')).toBe(false);
  });
});
