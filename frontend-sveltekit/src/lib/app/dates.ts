// Days for people: "Tue 3 Nov", "3 Nov 2027", "tomorrow", "in 9 days", "3 weeks".

import { daysBetween, toDate, type Day, type Horizon } from '#lib/app/schedule/index.ts';
import { i18n, t, tn } from '#lib/i18n/index.svelte.ts';

/** The browser's own locale when it's in the app's language (keeps en-GB "3 Nov"), else the app's. */
function locale(): string {
  const browser = typeof navigator === 'undefined' ? undefined : navigator.language;
  const base = (tag: string) => tag.toLowerCase().split('-')[0];
  return browser && base(browser) === base(i18n.locale) ? browser : i18n.locale;
}

const fmt = (day: Day, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', ...options }).format(toDate(day));

/** "3 Nov", with the year when it isn't this one. */
export function formatDay(day: Day, today: Day): string {
  return fmt(day, {
    day: 'numeric',
    month: 'short',
    ...(day.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' }),
  });
}

/** "today", "tomorrow", "in 9 days", "in 3 weeks", "on 3 Feb". */
export function whenNext(day: Day, today: Day): string {
  const n = daysBetween(today, day);
  if (n <= 0) return t('today');
  if (n === 1) return t('tomorrow');
  if (n < 14) return tn(n, 'in 1 day', 'in {count} days');
  if (n < 60) return tn(Math.round(n / 7), 'in 1 week', 'in {count} weeks');
  return t('on {date}', { date: formatDay(day, today) });
}

/** A length: "1 week", "3 months", "1 year", "45 days". */
export function lengthOf(days: number): string {
  if (days % 365 === 0) return tn(days / 365, '1 year', '{count} years');
  if (days >= 28 && days % 30 <= 1 && days < 365)
    return tn(Math.round(days / 30), '1 month', '{count} months');
  if (days % 7 === 0) return tn(days / 7, '1 week', '{count} weeks');
  return tn(days, '1 day', '{count} days');
}

/** How long a topic is kept, as picked: "3 months", "Forever", "45 days", or null for a date. */
export function horizonLabel(h: Horizon): string | null {
  switch (h.kind) {
    case 'week':
      return t('1 week');
    case 'month':
      return t('1 month');
    case 'quarter':
      return t('3 months');
    case 'half':
      return t('6 months');
    case 'year':
      return t('1 year');
    case 'forever':
      return t('Forever');
    case 'custom':
      return h.days ? lengthOf(h.days) : null;
    default:
      return null;
  }
}
