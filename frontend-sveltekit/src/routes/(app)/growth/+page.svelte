<!--
  Progress: one honest sentence with the plant beside it, this week as a row of sprouts on a wooden
  shelf (the more reviews, the bigger the plant), and the run of days once it means something.
  Numbers from #lib/app/growth.ts. (The address is still /growth.)
-->
<script lang="ts">
  import { appName } from '#lib/config.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import { memory } from '#lib/app/store.svelte.ts';
  import { calendar, currentRun, level, monthStart, rememberedCount, since } from '#lib/app/growth.ts';
  import { formatDay } from '#lib/app/dates.ts';
  import { startAdding } from '#lib/app/ui.svelte.ts';
  import DaySprout from '#lib/app/ui/DaySprout.svelte';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import GrowingPot from '#lib/app/ui/GrowingPot.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import Plank from '#lib/app/ui/Plank.svelte';

  const today = $derived(memory.today);
  const month = $derived(since(memory.checkins, monthStart(today)));
  const run = $derived(currentRun(memory.checkins, today));
  const days = $derived(calendar(memory.checkins, today, 1));
  const active = $derived(memory.topics.filter((x) => x.state === 'active').length);
  const finished = $derived(memory.topics.filter((x) => x.state === 'done').length);
  const weekday = (d: string) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'narrow', timeZone: 'UTC' }).format(
      new Date(`${d}T12:00:00Z`),
    );
</script>

<svelte:head><title>{t('Progress')} · {appName}</title></svelte:head>

<div class="gr">
  <h1>{t('Progress')}</h1>

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
      <h2 id="empty-title">{t('Your progress starts with one topic')}</h2>
      <p>{t('Add what you studied. Each day you review grows a plant here.')}</p>
      <Key tone="leaf" big onclick={() => startAdding()}><Glyph name="plus" size={18} />{t('Add topic')}</Key>
    </section>
  {:else}
    <section class="gr-hero" aria-label={t('This month')}>
      <div class="gr-words">
        <p class="gr-said">
          {month.length
            ? t('You remembered {got} of {total} this month.', {
                got: rememberedCount(month),
                total: month.length,
              })
            : t('No reviews yet this month.')}
        </p>
        <p class="gr-sub">
          {tn(active, '1 active topic', '{count} active topics')} · {t('{count} finished', {
            count: finished,
          })}
        </p>
      </div>
      <div class="gr-art" aria-hidden="true">
        <span class="gr-sun"></span>
        <GrowingPot color="green" leaves={Math.max(1, run)} size={84} letter={false} />
      </div>
    </section>

    <section class="gr-week" aria-labelledby="week-title">
      <h2 id="week-title">{t('This week')}</h2>
      <ol class="gr-days">
        {#each days as d (d.day)}
          <li
            title={d.count >= 0
              ? `${formatDay(d.day, today)}: ${tn(d.count, '1 review', '{count} reviews')}`
              : undefined}
          >
            <span class="gr-wd" aria-hidden="true">{weekday(d.day)}</span>
            <span class="gr-day"><DaySprout level={level(d.count)} future={d.count < 0} /></span>
          </li>
        {/each}
      </ol>
      <div class="gr-plank"><Plank /></div>
      {#if run >= 3}
        <p class="gr-run">{t('{count} days in a row. Keep going.', { count: run })}</p>
      {/if}
    </section>
  {/if}
</div>

<style>
  .gr {
    display: grid;
    gap: 1.25rem;
    max-width: 44rem;
    margin-inline: auto;
  }
  h1 {
    margin: 0.25rem 0 0;
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-heading);
  }
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
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-heading);
  }
  .gr-empty p {
    margin: 0 0 0.5rem;
    max-width: 34ch;
    color: var(--color-muted);
    line-height: 1.5;
  }
  .gr-bed {
    stroke: light-dark(#d6c9b1, #4a4234);
    stroke-width: 6;
    stroke-linecap: round;
  }
  .gr-bed-low {
    stroke-width: 4;
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
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .gr-leaf-b {
    fill: var(--color-leaf-bright);
  }
  .gr-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    border-radius: 24px;
    background: var(--color-leaf-tab);
  }
  .gr-words {
    min-width: 0;
  }
  .gr-said {
    margin: 0;
    font-size: 1.375rem;
    line-height: 1.25;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-heading);
    text-wrap: balance;
  }
  .gr-sub {
    margin: 0.375rem 0 0;
    color: var(--color-muted);
    font-size: 0.9375rem;
  }
  .gr-art {
    position: relative;
    flex: none;
    width: 7.5rem;
    height: 8rem;
    display: grid;
    place-items: end center;
  }
  .gr-sun {
    position: absolute;
    top: 0.25rem;
    left: 50%;
    width: 7rem;
    height: 7rem;
    border-radius: 50%;
    background: var(--color-base-100);
    transform: translateX(-50%);
  }
  .gr-art :global(.gp) {
    position: relative;
  }
  .gr-week {
    padding-bottom: 1.5rem;
  }
  h2 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-heading);
  }
  .gr-days {
    list-style: none;
    margin: 0;
    padding: 0 0.5rem;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.25rem;
  }
  .gr-days li {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
  }
  .gr-day {
    display: block;
    width: min(100%, 3.25rem);
  }
  .gr-wd {
    color: var(--color-muted);
    font-size: 0.75rem;
  }
  .gr-plank {
    margin-top: -0.25rem;
  }
  .gr-run {
    margin: 2.25rem 0 0;
    color: var(--color-muted);
    font-size: 0.9375rem;
  }
</style>
