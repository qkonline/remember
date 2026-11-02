<!--
  The check-ins a topic will get if all goes well, drawn as sprouts that grow taller towards the
  last one, each over its date.
-->
<script lang="ts">
  import type { Day } from '#lib/app/schedule/index.ts';
  import { toDate } from '#lib/app/schedule/index.ts';
  import { i18n } from '#lib/i18n/index.svelte.ts';
  import Glyph from './Glyph.svelte';

  let { plan, label }: { plan: Day[]; label: string } = $props();

  const shown = $derived(plan.slice(0, 5));
  const month = (d: Day) =>
    new Intl.DateTimeFormat(i18n.locale, { month: 'short', timeZone: 'UTC' }).format(toDate(d));
  const height = (i: number) => 18 + Math.round((i / Math.max(1, shown.length - 1)) * 30);
</script>

<div class="ps">
  <p class="ps-head">
    <Glyph name="sprout" size={18} />
    <span>{label}</span>
  </p>
  <ol class="ps-row">
    {#each shown as d, i (d)}
      <li class:ps-last={i === shown.length - 1}>
        <svg width="26" height={height(i)} viewBox="0 0 26 {height(i)}" aria-hidden="true">
          <path d="M13 {height(i)}V6" class="ps-stem" />
          <path d="M13 10c0-5 4-8 9-8 0 5-4 8-9 8z" class="ps-leaf" />
        </svg>
        <span class="ps-date"
          ><span class="ps-month">{month(d)}</span><span class="ps-day">{Number(d.slice(8))}</span></span
        >
      </li>
    {/each}
  </ol>
</div>

<style>
  .ps {
    border: 1px solid var(--color-base-300);
    border-radius: 18px;
    padding: 0.875rem 1rem;
  }
  .ps-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.625rem;
    font-weight: 500;
    font-size: 0.875rem;
  }
  .ps-row {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
  }
  .ps-row li {
    flex: 1;
    display: grid;
    justify-items: center;
    gap: 0.375rem;
  }
  .ps-stem {
    stroke: var(--color-leaf-line);
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .ps-leaf {
    fill: var(--color-leaf-soft);
    stroke: var(--color-leaf-line);
    stroke-width: 1.3;
  }
  .ps-last .ps-leaf {
    fill: var(--color-leaf-bright);
  }
  .ps-date {
    width: 100%;
    display: grid;
    justify-items: center;
    padding: 0.375rem 0;
    border-radius: 10px;
    background: var(--color-base-200);
  }
  .ps-last .ps-date {
    background: var(--color-leaf);
    color: var(--color-leaf-ink);
  }
  .ps-month {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .ps-day {
    font-size: 1.125rem;
    font-weight: 500;
    line-height: 1.2;
  }
</style>
