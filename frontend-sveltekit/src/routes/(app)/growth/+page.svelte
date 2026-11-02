<!--
  Growth: what the check-ins add up to, as a garden. The run of days in a row is a potted plant
  that grows a leaf a day; the last five weeks are a garden bed where each day grows a plant as
  big as that day's check-ins; each shelf's pot fills with how much of it was remembered (Hazy
  counts); and what was learned lately blooms at the end. This month or all along. Numbers from
  #lib/app/growth.ts.
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
  import DaySprout from '#lib/app/ui/DaySprout.svelte';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import GrowingPot from '#lib/app/ui/GrowingPot.svelte';
  import Key from '#lib/app/ui/Key.svelte';

  let range = $state<'month' | 'all'>('month');

  const today = $derived(memory.today);
  const inRange = $derived(since(memory.checkins, range === 'month' ? monthStart(today) : null));
  const run = $derived(currentRun(memory.checkins, today));
  const best = $derived(longestRun(memory.checkins));
  const days = $derived(calendar(memory.checkins, today, 5));
  const weeks = $derived(Array.from({ length: 5 }, (_v, w) => days.slice(w * 7, w * 7 + 7)));
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
  const daysWithCheckIns = $derived(days.filter((d) => d.count > 0).length);
</script>

<svelte:head><title>{t('Growth')} · {appName}</title></svelte:head>

<div class="gr">
  <header class="gr-head">
    <h1>{t('Growth')}</h1>
    {#if memory.topics.length}
      <div class="gr-seg" role="radiogroup" aria-label={t('Show')}>
        <button type="button" role="radio" aria-checked={range === 'month'} onclick={() => (range = 'month')}
          >{t('This month')}</button
        >
        <button type="button" role="radio" aria-checked={range === 'all'} onclick={() => (range = 'all')}
          >{t('All time')}</button
        >
      </div>
    {/if}
  </header>

  {#if memory.loaded && memory.topics.length === 0}
    <section class="gr-empty" aria-labelledby="empty-title">
      <svg class="gr-empty-art" width="220" height="120" viewBox="0 0 220 120" aria-hidden="true">
        <path d="M14 96h192" class="gr-bed" />
        <path d="M30 104h160" class="gr-bed gr-bed-low" />
        {#each [40, 75, 110, 145, 180] as x, i (x)}
          <ellipse cx={x} cy="92" rx="4.5" ry="3" class="gr-seed" />
          {#if i === 2}
            <path d="M{x} 92V68" class="gr-stem" />
            <path d="M{x} 74c0-8 6-13 15-13 0 8-6 13-15 13z" class="gr-leaf" />
            <path d="M{x} 80c0-6-4.5-10-11-10 0 6 4.5 10 11 10z" class="gr-leaf gr-leaf-b" />
          {/if}
        {/each}
      </svg>
      <h2 id="empty-title">{t('Your garden starts with one topic')}</h2>
      <p>
        {t(
          'Add what you studied and check yourself on the days it comes back. Each day you do grows a plant here.',
        )}
      </p>
      <Key tone="leaf" big onclick={() => startAdding()}
        ><Glyph name="plus" size={18} />{t('Add what you studied')}</Key
      >
    </section>
  {:else}
    <section class="gr-run" aria-labelledby="run-title">
      <div class="gr-run-text">
        <p class="gr-run-num" id="run-title">
          <span class="gr-big">{run}</span>
          <span class="gr-big-label">{tn(run, 'day in a row', 'days in a row')}</span>
        </p>
        <p class="gr-run-sub">
          {run === 0
            ? t('Check in today to start a new run.')
            : best > run
              ? t('Your longest run is {count} days. Keep going.', { count: best })
              : t('Your longest run yet.')}
        </p>
        <dl class="gr-figs">
          <div>
            <dt>{t('Check-ins')}</dt>
            <dd>{inRange.length}</dd>
          </div>
          <div>
            <dt>{t('Remembered')}</dt>
            <dd>{pct(share)}</dd>
          </div>
          <div>
            <dt>{t('Growing')}</dt>
            <dd>{growing}</dd>
          </div>
          <div>
            <dt>{t('Learned')}</dt>
            <dd>{learned}</dd>
          </div>
        </dl>
      </div>
      <div class="gr-run-art" aria-hidden="true">
        <span class="gr-sun"></span>
        <GrowingPot color="green" leaves={run} size={112} letter={false} />
      </div>
    </section>

    <div class="gr-grid">
      <section class="gr-box" aria-labelledby="bed-title">
        <h2 id="bed-title">{t('Your last five weeks')}</h2>
        <p class="gr-hint">
          {t('Each day you checked in grows a plant. The more check-ins, the bigger it gets.')}
        </p>
        <div class="gr-bed-grid">
          {#each weekdays as w, i (i)}<span class="gr-wd" aria-hidden="true">{w}</span>{/each}
          {#each weeks as week, wi (wi)}
            {#each week as d (d.day)}
              <span
                class="gr-day"
                class:gr-today={d.day === today}
                title={d.count >= 0
                  ? `${formatDay(d.day, today)}: ${tn(d.count, '1 check-in', '{count} check-ins')}`
                  : undefined}
              >
                <DaySprout level={level(d.count)} future={d.count < 0} />
              </span>
            {/each}
          {/each}
        </div>
        <p class="gr-legend" aria-hidden="true">
          <span>{t('Fewer')}</span>
          {#each [0, 1, 2, 3, 4] as l (l)}<span class="gr-legend-day"><DaySprout level={l} /></span>{/each}
          <span>{t('More')}</span>
        </p>
        <p class="sr-only">
          {tn(
            daysWithCheckIns,
            'Check-ins on 1 day of the last five weeks.',
            'Check-ins on {count} days of the last five weeks.',
          )}
        </p>
      </section>

      <section class="gr-box" aria-labelledby="shelf-title">
        <h2 id="shelf-title">{t('By shelf')}</h2>
        {#if shelves.length}
          <ul class="gr-pots">
            {#each shelves as s (s.key)}
              <li>
                <a href="{resolve('/(app)/topics')}?shelf={s.key}">
                  <span
                    class="gr-pot shelf-{s.shelf?.color ?? 'none'}"
                    style:--fill="{Math.round((s.remembered ?? 0) * 100)}%"
                  >
                    <span class="gr-pot-fill"></span>
                    <span class="gr-pot-pct">{pct(s.remembered)}</span>
                  </span>
                  <span class="gr-pot-name">{s.name}</span>
                  <span class="gr-pot-n">{tn(s.topics, '1 topic', '{count} topics')}</span>
                </a>
              </li>
            {/each}
          </ul>
          <p class="gr-hint gr-hint-under">
            {t('Each pot fills with how much of that shelf you remembered. Hazy counts.')}
          </p>
        {:else}
          <p class="gr-hint">{t('Put topics on shelves to see each subject here.')}</p>
        {/if}

        {#if recent.length}
          <h2 class="gr-h2-gap">{t('Recently learned')}</h2>
          <ul class="gr-learned">
            {#each recent as x (x.id)}
              <li>
                <a href="{resolve('/(app)/topic')}?id={x.id}"
                  ><span class="gr-flower" aria-hidden="true"><DaySprout level={4} /></span>{x.title}</a
                >
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
  .gr-pots a:focus-visible,
  .gr-learned a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Nothing yet: a bed of seeds with one coming up, then the words, then the key. */
  .gr-empty {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    padding: 2rem 1.25rem 2.25rem;
    border: 1px solid var(--color-base-300);
    border-radius: 24px;
    text-align: center;
  }
  .gr-empty-art {
    max-width: 100%;
    height: auto;
  }
  .gr-empty h2 {
    margin: 0.5rem 0 0;
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--color-heading);
  }
  .gr-empty p {
    margin: 0 0 1rem;
    max-width: 36ch;
    color: var(--color-muted);
    line-height: 1.5;
  }
  .gr-bed {
    stroke: light-dark(#d6c9b1, #4a4234);
    stroke-width: 6;
    stroke-linecap: round;
  }
  .gr-bed-low {
    stroke-width: 3;
    opacity: 0.6;
  }
  .gr-seed {
    fill: light-dark(#b8a27c, #6b5d43);
  }
  .gr-stem {
    stroke: var(--color-leaf-line);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .gr-leaf {
    fill: var(--color-leaf-soft);
    stroke: var(--color-leaf-line);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .gr-leaf-b {
    fill: var(--color-leaf-bright);
  }

  /* The run: a pot that grows a leaf a day, under a soft sun. */
  .gr-run {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: end;
    padding: 1.25rem 1.25rem 0;
    border: 1px solid var(--color-base-300);
    border-radius: 24px;
    overflow: hidden;
  }
  .gr-run-text {
    padding-bottom: 1.25rem;
  }
  .gr-run-num {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    margin: 0;
  }
  .gr-big {
    font-size: 4rem;
    line-height: 0.9;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--color-leaf-deep);
  }
  .gr-big-label {
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--color-heading);
  }
  .gr-run-sub {
    margin: 0.5rem 0 0;
    color: var(--color-muted);
  }
  .gr-figs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
    margin: 1.25rem 0 0;
  }
  .gr-figs div {
    display: grid;
    gap: 0.125rem;
  }
  .gr-figs dt {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .gr-figs dd {
    margin: 0;
    font-size: 1.375rem;
    font-weight: 500;
    color: var(--color-heading);
  }
  .gr-run-art {
    position: relative;
    display: grid;
    justify-items: center;
    align-self: end;
    margin-bottom: -0.25rem;
  }
  .gr-sun {
    position: absolute;
    top: 0.25rem;
    width: 7.5rem;
    height: 7.5rem;
    border-radius: 50%;
    background: var(--color-leaf-tab);
  }
  .gr-run-art :global(.gp) {
    position: relative;
  }

  .gr-grid {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
  }
  .gr-box {
    border: 1px solid var(--color-base-300);
    border-radius: 22px;
    padding: 1.25rem;
  }
  .gr-box h2 {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--color-heading);
  }
  .gr-box .gr-h2-gap {
    margin-top: 1.75rem;
  }
  .gr-hint {
    margin: 0.25rem 0 1rem;
    font-size: 0.875rem;
    color: var(--color-muted);
    line-height: 1.45;
  }
  .gr-hint-under {
    margin: 0.75rem 0 0;
  }

  /* The garden bed: five weeks, a row of soil each, a plant for each day. */
  .gr-bed-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.25rem 0.375rem;
    max-width: 30rem;
  }
  .gr-wd {
    text-align: center;
    font-size: 0.6875rem;
    color: var(--color-muted);
  }
  .gr-day {
    display: block;
    border-radius: 10px;
    padding: 0.125rem;
  }
  .gr-today {
    background: var(--color-leaf-tab);
    box-shadow: inset 0 0 0 1.5px var(--color-leaf-line);
  }
  .gr-legend {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 1rem 0 0;
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .gr-legend-day {
    width: 1.5rem;
  }

  /* By shelf: each pot fills with how much was remembered. */
  .gr-pots {
    list-style: none;
    margin: 1rem 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    gap: 0.75rem;
  }
  .gr-pots a {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.25rem;
    border-radius: 16px;
    color: var(--color-heading);
    text-decoration: none;
  }
  .gr-pots a:hover {
    background: var(--color-base-200);
  }
  .gr-pot {
    position: relative;
    display: grid;
    place-items: center;
    width: 4rem;
    height: 3.5rem;
    clip-path: polygon(0 0, 100% 0, 86% 100%, 14% 100%);
    background: var(--sh-card);
    overflow: hidden;
  }
  .gr-pot-fill {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--fill);
    background: var(--sh-pot);
  }
  .gr-pot-pct {
    position: relative;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--sh-ink);
  }
  .gr-pot-name {
    max-width: 100%;
    font-size: 0.875rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gr-pot-n {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .gr-learned {
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .gr-learned a {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.5rem;
    padding: 0 0.875rem 0 0.5rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    color: var(--color-base-content);
    font-size: 0.875rem;
    text-decoration: none;
  }
  .gr-flower {
    width: 1.5rem;
  }

  /* Phones: the pot stays in the corner, smaller, and the four figures share one row. */
  @media (max-width: 39.99rem) {
    .gr-run {
      grid-template-columns: minmax(0, 1fr);
      padding-bottom: 0.25rem;
    }
    .gr-run-art {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      transform: scale(0.62);
      transform-origin: top right;
      margin: 0;
    }
    .gr-run-num,
    .gr-run-sub {
      padding-right: 5.5rem;
    }
    .gr-figs {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.5rem;
    }
    .gr-figs dd {
      font-size: 1.25rem;
    }
  }

  @media (min-width: 64rem) {
    .gr-head h1 {
      font-size: 2rem;
    }
    .gr-run {
      padding: 1.75rem 2rem 0;
    }
    .gr-run-text {
      padding-bottom: 1.75rem;
    }
    .gr-big {
      font-size: 5.5rem;
    }
    .gr-grid {
      grid-template-columns: 1.2fr 1fr;
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .gr-box {
      padding: 1.5rem;
    }
    .gr-empty {
      padding: 3rem 2rem;
    }
  }
</style>
