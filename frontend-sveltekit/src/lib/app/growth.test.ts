import { describe, expect, test } from 'vitest';
import { calendar, currentRun, level, rememberedCount } from './growth.ts';
import type { GrowthCheckIn } from './growth.ts';

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

  test('the calendar is whole weeks from Monday, ending with this week; days after today are -1', () => {
    // 2026-11-02 is a Monday.
    const cal = calendar([c('2026-11-02'), c('2026-11-02'), c('2026-10-26')], '2026-11-02', 2);
    expect(cal).toHaveLength(14);
    expect(cal[0]).toEqual({ day: '2026-10-26', count: 1 });
    expect(cal[7]).toEqual({ day: '2026-11-02', count: 2 });
    expect(cal[8]?.count).toBe(-1);
    expect([0, 1, 2, 5, 9].map(level)).toEqual([0, 1, 2, 3, 4]);
  });
});

test('rememberedCount leaves out Hazy and Forgot', () => {
  const day = '2026-11-03';
  const all: GrowthCheckIn[] = [
    { topic: 'a', rating: 'got', day },
    { topic: 'b', rating: 'hazy', day },
    { topic: 'c', rating: 'forgot', day },
  ];
  expect(rememberedCount(all)).toBe(1);
});
