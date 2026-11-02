import { describe, expect, test } from 'vitest';
import { byShelf, calendar, currentRun, level, longestRun, recentlyLearned, remembered } from './growth.ts';
import type { GrowthCheckIn, GrowthTopic } from './growth.ts';

const c = (day: string, rating: GrowthCheckIn['rating'] = 'got', topic = 'a'): GrowthCheckIn => ({
  topic,
  rating,
  day,
});

describe('growth', () => {
  test('the run counts days in a row up to today, or up to yesterday before today’s first check-in', () => {
    const days = [c('2026-10-30'), c('2026-10-31'), c('2026-11-01'), c('2026-11-01')];
    expect(currentRun(days, '2026-11-01')).toBe(3);
    expect(currentRun(days, '2026-11-02')).toBe(3);
    expect(currentRun(days, '2026-11-03')).toBe(0);
    expect(currentRun([], '2026-11-02')).toBe(0);
  });

  test('the longest run finds the best stretch', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'].map((d) => c(d));
    expect(longestRun(days)).toBe(3);
    expect(longestRun([])).toBe(0);
  });

  test('the calendar is whole weeks from Monday, ending with this week; days after today are -1', () => {
    // 2026-11-02 is a Monday.
    const cal = calendar([c('2026-11-02'), c('2026-11-02'), c('2026-10-26')], '2026-11-02', 2);
    expect(cal).toHaveLength(14);
    expect(cal[0]).toEqual({ day: '2026-10-26', count: 1 });
    expect(cal[7]).toEqual({ day: '2026-11-02', count: 2 });
    expect(cal[8]?.count).toBe(-1);
    expect([0, 1, 2, 5, 9].map(level)).toEqual([0, 1, 2, 3, 4]);
  });

  test('hazy counts as remembered; forgot does not', () => {
    expect(
      remembered([
        c('2026-11-01', 'got'),
        c('2026-11-01', 'hazy'),
        c('2026-11-01', 'forgot'),
        c('2026-11-01'),
      ]),
    ).toBe(0.75);
    expect(remembered([])).toBeNull();
  });

  test('per shelf: topics counted, recall shared out by the shelf of each check-in’s topic', () => {
    const topics: GrowthTopic[] = [
      { id: 'a', shelf: 'bio', state: 'active', doneOn: null, title: 'A' },
      { id: 'b', shelf: 'bio', state: 'done', doneOn: '2026-10-20', title: 'B' },
      { id: 'c', shelf: null, state: 'done', doneOn: '2026-10-30', title: 'C' },
    ];
    const rows = byShelf(topics, [
      c('2026-11-01', 'got', 'a'),
      c('2026-11-01', 'forgot', 'b'),
      c('2026-11-01', 'got', 'gone'),
    ]);
    expect(rows.get('bio')).toEqual({ topics: 2, remembered: 0.5 });
    expect(rows.get(null)).toEqual({ topics: 1, remembered: null });
    expect(recentlyLearned(topics).map((t) => t.id)).toEqual(['c', 'b']);
  });
});
