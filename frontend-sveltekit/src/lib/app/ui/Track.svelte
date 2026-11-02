<!--
  The horizon track: one line from the day a topic was studied to its finish line, a dot for each
  check-in made, a ring for the next one and a mark for today. A forever topic's line has no end:
  it fades out. A finished topic's line fills with the family's stripe.

    <Track start="2026-11-02" end="2027-02-02" done={['2026-11-03']} next="2026-11-06" today="2026-11-04" />
-->
<script lang="ts">
  import { addDays, daysBetween, maxDay, type Day } from '#lib/app/schedule/index.ts';
  import { formatDay } from '#lib/app/dates.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';

  let {
    start,
    end,
    done = [],
    next = null,
    today,
    finished = false,
    size = 'small',
  }: {
    start: Day;
    end: Day | null;
    done?: readonly Day[];
    next?: Day | null;
    today: Day;
    finished?: boolean;
    size?: 'small' | 'large';
  } = $props();

  // Forever: show up to the next check-in (or today) and a little beyond, fading out.
  const last = $derived(end ?? addDays(maxDay(next ?? today, today), 21));
  const span = $derived(Math.max(1, daysBetween(start, last)));
  const at = (d: Day) => Math.min(100, Math.max(0, (daysBetween(start, d) / span) * 100));

  const label = $derived.by(() => {
    const parts = [tn(done.length, '1 check-in done', '{count} check-ins done')];
    if (finished) parts.push(t('finished'));
    else if (next) parts.push(t('next on {date}', { date: formatDay(next, today) }));
    parts.push(end ? t('remember until {date}', { date: formatDay(end, today) }) : t('remember for good'));
    return parts.join(', ');
  });
</script>

<div
  class="track"
  class:track-large={size === 'large'}
  class:track-forever={!end}
  class:track-finished={finished}
  role="img"
  aria-label={label}
>
  <span class="track-line"></span>
  <span class="track-past" style:width="{finished ? 100 : at(today)}%"></span>
  {#if end}<span class="track-end"></span>{/if}
  {#each done as d (d)}
    <span class="track-dot" style:inset-inline-start="{at(d)}%"></span>
  {/each}
  {#if next && !finished}
    <span class="track-next" style:inset-inline-start="{at(next)}%"></span>
  {/if}
</div>

<style>
  .track {
    --h: 0.375rem;
    --dot: 0.4375rem;
    position: relative;
    height: var(--h);
    margin-inline: calc(var(--dot) / 2);
  }
  .track-large {
    --h: 0.75rem;
    --dot: 0.75rem;
  }
  .track > span {
    position: absolute;
    top: 50%;
  }
  .track-end,
  .track-dot,
  .track-next {
    transform: translate(-50%, -50%);
  }
  .track-line,
  .track-past {
    transform: translateY(-50%);
    inset-inline-start: 0;
    height: 2px;
    border-radius: 1px;
  }
  .track-line {
    width: 100%;
    background: var(--color-base-300);
  }
  .track-forever .track-line {
    background: linear-gradient(to right, var(--color-base-300) 70%, transparent);
  }
  .track-past {
    background: color-mix(in oklab, var(--color-primary) 45%, var(--color-base-300));
  }
  .track-end {
    inset-inline-start: 100%;
    width: 2px;
    height: calc(var(--h) * 2);
    border-radius: 1px;
    background: var(--color-base-content);
  }
  .track-dot {
    width: var(--dot);
    height: var(--dot);
    border-radius: 50%;
    background: var(--color-primary);
  }
  .track-next {
    width: calc(var(--dot) + 2px);
    height: calc(var(--dot) + 2px);
    border-radius: 50%;
    background: var(--color-base-100);
    border: 2px solid var(--color-primary);
  }
  .track-finished .track-past {
    height: 4px;
    background: var(--color-stripe);
  }
  .track-finished .track-end {
    background: var(--color-stripe-end);
  }
</style>
