<!--
  The plan for a new topic, drawn as a row in a garden: a seed on the day it was studied, a
  sprout at each check-in (taller each time), and a stake on the last day. The sprouts stand at
  their dates on a square-root scale of time, so the early, close check-ins stay apart while the
  gaps still visibly widen. They move when the choices change. "For good" fades out at the end.

    <PlanLine {plan} start={studiedOn} end={endOn} {today} />
-->
<script lang="ts">
  import { daysBetween, type Day } from '#lib/app/schedule/index.ts';
  import { formatDay } from '#lib/app/dates.ts';
  import { t } from '#lib/i18n/index.svelte.ts';

  let {
    plan,
    start,
    end,
    today,
    startLabel,
    name,
  }: {
    plan: Day[];
    start: Day;
    end: Day | null;
    today: Day;
    /** Words for the seed's label, in place of its date. */
    startLabel?: string;
    /** Words for a mark in place of its date; '' leaves it unlabelled. */
    name?: (d: Day) => string;
  } = $props();

  const MAX = 8;
  const shown = $derived(plan.slice(0, MAX));
  /** The span the row covers: to the last day, or a little past the last check-in shown. */
  const span = $derived(
    Math.max(1, end ? daysBetween(start, end) : Math.ceil(daysBetween(start, shown.at(-1) ?? start) * 1.18)),
  );
  const at = (d: Day) => Math.min(1, Math.sqrt(Math.max(0, daysBetween(start, d)) / span));

  let width = $state(0);
  const SIDE = 28; // room at each end for the seed and the stake
  const x = (f: number) => SIDE + f * Math.max(0, width - 2 * SIDE);

  const marks = $derived.by(() => {
    const items = shown.map((d, i) => ({
      d,
      left: x(at(d)),
      height: 18 + Math.round((i / Math.max(1, shown.length - 1)) * 26),
      label: true,
    }));
    // Dates that would run into each other drop their label; the last always keeps its own.
    let lastLabel = SIDE; // the seed's own label
    for (const m of items) {
      if (m.left - lastLabel < 46) m.label = false;
      else lastLabel = m.left;
    }
    const last = items.at(-1);
    if (last && !last.label) {
      last.label = true;
      for (let i = items.length - 2; i >= 0; i--) {
        const m = items[i];
        if (!m || last.left - m.left >= 46) break;
        m.label = false;
      }
    }
    return items;
  });
  const short = (d: Day) => name?.(d) ?? formatDay(d, today).replace(/,? \d{4}$/, '');
</script>

<div class="pl" class:pl-forever={!end} bind:clientWidth={width} aria-hidden="true">
  <div class="pl-ground"></div>
  <span class="pl-seed" style:left="{SIDE}px"></span>
  <span class="pl-date pl-start" style:left="{SIDE}px"
    >{startLabel ?? (start === today ? t('Today') : formatDay(start, today).replace(/,? \d{4}$/, ''))}</span
  >
  {#each marks as m, i (i)}
    <span class="pl-mark" style:left="{m.left}px">
      <svg class="pl-sprout" width="22" height={m.height} viewBox="0 0 22 {m.height}">
        <path d="M11 {m.height}V5" class="pl-stem" />
        <path d="M11 {Math.min(m.height - 4, 12)}c0-5 3.6-8 8.6-8 0 5-3.6 8-8.6 8z" class="pl-leaf" />
        {#if m.height > 26}<path
            d="M11 {Math.min(m.height - 4, 20)}c0-4.4-3.2-7-7.6-7 0 4.4 3.2 7 7.6 7z"
            class="pl-leaf pl-leaf-b"
          />{/if}
      </svg>
      {#if m.label}<span class="pl-date">{short(m.d)}</span>{/if}
    </span>
  {/each}
  {#if end}
    <span class="pl-stake" style:left="{width - SIDE}px">
      <svg width="16" height="34" viewBox="0 0 16 34"
        ><path d="M3 34V3" class="pl-stake-post" /><path d="M3 4h10l-2.5 4 2.5 4H3z" class="pl-flag" /></svg
      >
    </span>
  {:else}
    <span class="pl-on">{t('for good')}</span>
  {/if}
</div>

<style>
  .pl {
    position: relative;
    height: 5.25rem;
  }
  .pl-ground {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 1.5rem;
    height: 7px;
    border-radius: 999px;
    background: light-dark(#dcc9a4, #4d3f2c);
    box-shadow: inset 0 2px 0 light-dark(#ead9b8, #5c4c36);
  }
  .pl-forever .pl-ground {
    mask-image: linear-gradient(to right, #000 70%, transparent);
  }
  .pl-seed {
    position: absolute;
    bottom: calc(1.5rem + 3px);
    width: 9px;
    height: 7px;
    border-radius: 50%;
    background: light-dark(#a16207, #ca8a04);
    transform: translateX(-50%);
  }
  .pl-mark {
    position: absolute;
    bottom: 0;
    display: grid;
    justify-items: center;
    transform: translateX(-50%);
    transition: left 420ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pl-sprout {
    display: block;
    margin-bottom: calc(1.5rem + 3px);
    overflow: visible;
  }
  .pl-stem {
    fill: none;
    stroke: var(--color-leaf-line);
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .pl-leaf {
    fill: var(--color-leaf-soft);
    stroke: var(--color-leaf-line);
    stroke-width: 1.2;
    stroke-linejoin: round;
  }
  .pl-leaf-b {
    fill: var(--color-leaf-bright);
  }
  .pl-date {
    position: absolute;
    bottom: 0;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-leaf-deep);
    white-space: nowrap;
  }
  .pl-start {
    transform: translateX(-50%);
    color: var(--color-muted);
  }
  .pl-stake {
    position: absolute;
    bottom: calc(1.5rem + 2px);
    transform: translateX(-3px);
    transition: left 420ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pl-stake svg {
    display: block;
  }
  .pl-stake-post {
    stroke: light-dark(#8a6a3d, #c4a576);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .pl-flag {
    fill: light-dark(#fecdd3, #4a1f27);
    stroke: light-dark(#be123c, #fda4af);
    stroke-width: 1.1;
    stroke-linejoin: round;
  }
  .pl-on {
    position: absolute;
    right: 0;
    bottom: 0;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-leaf-deep);
  }
  @media (prefers-reduced-motion: reduce) {
    .pl-mark,
    .pl-stake {
      transition: none;
    }
  }
</style>
