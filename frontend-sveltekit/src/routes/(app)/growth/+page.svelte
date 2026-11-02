<!--
  Growth: what the check-ins add up to, this month or all along. The run of days in a row, a
  calendar of the last five weeks, how much was remembered (Hazy counts), each shelf, and what
  was learned lately. Numbers from #lib/app/growth.ts.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import { memory } from '#lib/app/store.svelte.ts';
  import {
    byShelf,
    calendar,
    currentRun,
    level,
    longestRun,
    monthStart,
    recentlyLearned,
    remembered,
    since,
  } from '#lib/app/growth.ts';
  import { formatDay } from '#lib/app/dates.ts';
  import { startAdding } from '#lib/app/ui.svelte.ts';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import ShelfMark from '#lib/app/ui/ShelfMark.svelte';

  let range = $state<'month' | 'all'>('month');

  const today = $derived(memory.today);
  const inRange = $derived(since(memory.checkins, range === 'month' ? monthStart(today) : null));
  const run = $derived(currentRun(memory.checkins, today));
  const best = $derived(longestRun(memory.checkins));
  const days = $derived(calendar(memory.checkins, today, 5));
  const share = $derived(remembered(inRange));
  const growing = $derived(memory.topics.filter((x) => x.state === 'active').length);
  const learned = $derived(memory.topics.filter((x) => x.state === 'done').length);
  const shelves = $derived.by(() => {
    const rows = byShelf(memory.topics, inRange);
    return [
      ...memory.shelves.map((s) => ({
        key: s.id,
        shelf: s,
        name: s.name,
        ...(rows.get(s.id) ?? { topics: 0, remembered: null }),
      })),
      ...(rows.has(null) ? [{ key: 'none', shelf: null, name: t('No shelf'), ...rows.get(null)! }] : []),
    ].filter((r) => r.topics > 0);
  });
  const recent = $derived(recentlyLearned(memory.topics));
  const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);
  const weekdays = $derived(
    days
      .slice(0, 7)
      .map((d) =>
        new Intl.DateTimeFormat(undefined, { weekday: 'narrow', timeZone: 'UTC' }).format(
          new Date(`${d.day}T12:00:00Z`),
        ),
      ),
  );
</script>

<svelte:head><title>{t('Growth')} · {appName}</title></svelte:head>

<div class="gr">
  <header class="gr-head">
    <h1>{t('Growth')}</h1>
    <div class="gr-seg" role="radiogroup" aria-label={t('Show')}>
      <button type="button" role="radio" aria-checked={range === 'month'} onclick={() => (range = 'month')}
        >{t('This month')}</button
      >
      <button type="button" role="radio" aria-checked={range === 'all'} onclick={() => (range = 'all')}
        >{t('All time')}</button
      >
    </div>
  </header>

  {#if memory.loaded && memory.topics.length === 0}
    <p class="gr-empty">{t('Your growth shows here once you start checking in.')}</p>
    <Key tone="leaf" big onclick={() => startAdding()}
      ><Glyph name="plus" size={18} />{t('Add what you studied')}</Key
    >
  {:else}
    <div class="gr-stats">
      <div class="gr-stat">
        <span class="gr-num">{run}</span>
        <span class="gr-label"
          >{tn(run, 'day in a row', 'days in a row')}{best > run
            ? `, ${t('longest {count}', { count: best })}`
            : ''}</span
        >
      </div>
      <div class="gr-stat">
        <span class="gr-num">{inRange.length}</span>
        <span class="gr-label">{range === 'month' ? t('check-ins this month') : t('check-ins in all')}</span>
      </div>
      <div class="gr-stat">
        <span class="gr-num">{pct(share)}</span>
        <span class="gr-label">{t('remembered (got it or hazy)')}</span>
      </div>
      <div class="gr-stat">
        <span class="gr-num">{growing}</span>
        <span class="gr-label">{tn(learned, 'growing, 1 learned', 'growing, {count} learned')}</span>
      </div>
    </div>

    <div class="gr-grid">
      <section class="gr-box" aria-labelledby="cal-title">
        <h2 id="cal-title">{t('Every day you checked in')}</h2>
        <div class="gr-cal">
          {#each weekdays as w, i (i)}<span class="gr-wd" aria-hidden="true">{w}</span>{/each}
          {#each days as d (d.day)}
            <span
              class="gr-day gr-l{level(d.count)}"
              class:gr-today={d.day === today}
              class:gr-future={d.count < 0}
              title={d.count >= 0
                ? `${formatDay(d.day, today)}: ${tn(d.count, '1 check-in', '{count} check-ins')}`
                : undefined}
            ></span>
          {/each}
        </div>
        <p class="gr-legend" aria-hidden="true">
          {t('Fewer')}{#each [0, 1, 2, 3, 4] as l (l)}<span class="gr-day gr-l{l}"></span>{/each}{t('More')}
        </p>
        <p class="sr-only">
          {tn(
            days.filter((d) => d.count > 0).length,
            'Check-ins on 1 day of the last five weeks.',
            'Check-ins on {count} days of the last five weeks.',
          )}
        </p>
      </section>

      <section class="gr-box" aria-labelledby="shelf-title">
        <h2 id="shelf-title">{t('By shelf')}</h2>
        {#if shelves.length}
          <ul class="gr-shelves">
            {#each shelves as s (s.key)}
              <li class="shelf-{s.shelf?.color ?? 'none'}">
                <ShelfMark shelf={s.shelf} size={30} />
                <span class="gr-shelf-text">
                  <span class="gr-shelf-row">
                    <a href="{resolve('/(app)/topics')}?shelf={s.key}">{s.name}</a>
                    <span
                      >{s.remembered === null
                        ? tn(s.topics, '1 topic', '{count} topics')
                        : t('{pct} remembered', { pct: pct(s.remembered) })}</span
                    >
                  </span>
                  <span class="gr-bar"
                    ><span style:width="{Math.round((s.remembered ?? 0) * 100)}%"></span></span
                  >
                </span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="gr-empty">{t('Put topics on shelves to see each subject here.')}</p>
        {/if}

        {#if recent.length}
          <h2 class="gr-h2-gap">{t('Recently learned')}</h2>
          <ul class="gr-learned">
            {#each recent as x (x.id)}
              <li>
                <a href="{resolve('/(app)/topic')}?id={x.id}"><Glyph name="sprout" size={16} />{x.title}</a>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .gr-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 0.25rem 0 1rem;
  }
  .gr-head h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-heading);
  }
  .gr-seg {
    display: flex;
    gap: 2px;
    padding: 4px;
    border-radius: 12px;
    background: var(--color-base-200);
    border: 1px solid var(--color-base-300);
  }
  .gr-seg button {
    min-height: 2.25rem;
    padding: 0 0.75rem;
    border: 0;
    border-radius: 9px;
    background: none;
    color: var(--color-muted);
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .gr-seg button[aria-checked='true'] {
    background: var(--color-base-100);
    box-shadow: 0 1px 0 var(--color-base-300);
    color: var(--color-leaf-deep);
    font-weight: 500;
  }
  .gr-seg button:focus-visible,
  .gr-shelves a:focus-visible,
  .gr-learned a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .gr-empty {
    color: var(--color-muted);
    max-width: 40ch;
  }
  .gr-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.625rem;
  }
  .gr-stat {
    display: grid;
    gap: 0.125rem;
    padding: 0.875rem 1rem;
    border: 1px solid var(--color-base-300);
    border-radius: 18px;
  }
  .gr-num {
    font-size: 1.875rem;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--color-leaf-deep);
    line-height: 1.1;
  }
  .gr-label {
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
  .gr-grid {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
  }
  .gr-box {
    border: 1px solid var(--color-base-300);
    border-radius: 22px;
    padding: 1.125rem;
  }
  .gr-box h2 {
    margin: 0 0 0.875rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-heading);
  }
  .gr-box .gr-h2-gap {
    margin-top: 1.5rem;
  }
  .gr-cal {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.375rem;
    max-width: 30rem;
  }
  .gr-wd {
    text-align: center;
    font-size: 0.6875rem;
    color: var(--color-muted);
  }
  .gr-day {
    display: inline-block;
    aspect-ratio: 1;
    border-radius: 8px;
  }
  .gr-l0 {
    background: var(--color-base-200);
  }
  .gr-l1 {
    background: var(--color-leaf-tint);
  }
  .gr-l2 {
    background: var(--color-leaf-soft);
  }
  .gr-l3 {
    background: var(--color-leaf);
  }
  .gr-l4 {
    background: var(--color-leaf-edge);
  }
  .gr-future {
    background: transparent;
    box-shadow: inset 0 0 0 1px var(--color-base-300);
  }
  .gr-today {
    box-shadow: inset 0 0 0 2px var(--color-leaf-line);
  }
  .gr-legend {
    display: flex;
    align-items: center;
    gap: 0.3125rem;
    margin: 0.875rem 0 0;
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .gr-legend .gr-day {
    width: 0.875rem;
    border-radius: 4px;
  }
  .gr-shelves,
  .gr-learned {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .gr-shelves li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0;
    border-bottom: 1px solid var(--color-base-300);
  }
  .gr-shelf-text {
    flex: 1;
    display: grid;
    gap: 0.375rem;
    min-width: 0;
  }
  .gr-shelf-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
  .gr-shelf-row a {
    color: var(--color-heading);
    font-size: 0.9375rem;
    font-weight: 500;
    text-decoration: none;
  }
  .gr-bar {
    height: 8px;
    border-radius: 4px;
    background: var(--color-base-200);
    overflow: hidden;
  }
  .gr-bar span {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--sh-pot);
  }
  .gr-learned {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .gr-learned a {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.5rem;
    padding: 0 0.875rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    color: var(--color-base-content);
    font-size: 0.875rem;
    text-decoration: none;
  }

  @media (min-width: 40rem) {
    .gr-stats {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  @media (min-width: 64rem) {
    .gr-head h1 {
      font-size: 1.875rem;
    }
    .gr-grid {
      grid-template-columns: 1.2fr 1fr;
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .gr-box {
      padding: 1.5rem;
    }
    .gr-cal {
      gap: 0.625rem;
    }
  }
</style>
