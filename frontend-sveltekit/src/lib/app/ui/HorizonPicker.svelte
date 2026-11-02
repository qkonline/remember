<!--
  How long to remember a topic: one tap on a preset, or an exam date, or a custom length.
  A radio group (arrow keys move between choices), drawn as chips.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Select from '#lib/components/ui/Select.svelte';
  import { msg, t } from '#lib/i18n/index.svelte.ts';
  import { addDays, type Day, type Horizon, type HorizonKind } from '#lib/app/schedule/index.ts';

  let {
    horizon = $bindable(),
    today,
    problem = null,
  }: { horizon: Horizon; today: Day; problem?: string | null } = $props();

  const uid = $props.id();

  const choices: { kind: HorizonKind; label: string }[] = [
    { kind: 'week', label: msg('1 week') },
    { kind: 'month', label: msg('1 month') },
    { kind: 'quarter', label: msg('3 months') },
    { kind: 'half', label: msg('6 months') },
    { kind: 'year', label: msg('1 year') },
    { kind: 'forever', label: msg('Forever') },
    { kind: 'until', label: msg('Until a date') },
    { kind: 'custom', label: msg('Custom') },
  ];

  // The custom length as the person types it: a number and a unit.
  let amount = $state(horizon.kind === 'custom' && horizon.days ? String(horizon.days) : '45');
  let unit = $state<'days' | 'weeks' | 'months'>('days');
  // The date field starts at the topic's own date, or a month from today (read once, on purpose).
  let until = $state<string>(
    untrack(() => (horizon.kind === 'until' && horizon.until ? horizon.until : addDays(today, 30))),
  );

  const daysFor = (n: number, u: typeof unit) =>
    Math.round(u === 'weeks' ? n * 7 : u === 'months' ? n * 30 : n);

  function pick(kind: HorizonKind) {
    if (kind === 'until') horizon = { kind, until };
    else if (kind === 'custom') horizon = { kind, days: daysFor(Number(amount), unit) };
    else horizon = { kind };
  }

  $effect(() => {
    if (horizon.kind === 'until' && horizon.until !== until) horizon = { kind: 'until', until };
  });
  $effect(() => {
    if (horizon.kind !== 'custom') return;
    const days = daysFor(Number(amount), unit);
    if (horizon.days !== days) horizon = { kind: 'custom', days };
  });
</script>

<fieldset class="hz">
  <legend class="hz-legend">{t('How long do you need it?')}</legend>
  <div class="hz-chips">
    {#each choices as c (c.kind)}
      <label class="hz-chip" class:hz-on={horizon.kind === c.kind}>
        <input
          type="radio"
          name="{uid}-horizon"
          value={c.kind}
          checked={horizon.kind === c.kind}
          onchange={() => pick(c.kind)}
        />
        <span>{t(c.label)}</span>
      </label>
    {/each}
  </div>

  {#if horizon.kind === 'until'}
    <div class="hz-more">
      <Field label={t('Remember it until')} invalid={!!problem} hint={problem ? t(problem) : undefined}>
        <Input type="date" bind:value={until} min={addDays(today, 1)} />
      </Field>
    </div>
  {:else if horizon.kind === 'custom'}
    <div class="hz-more hz-custom">
      <Field label={t('For')} invalid={!!problem} hint={problem ? t(problem) : undefined}>
        <Input type="number" inputmode="numeric" min="1" max="3650" bind:value={amount} />
      </Field>
      <Field label={t('Unit')} hideLabel>
        <Select bind:value={unit}>
          <option value="days">{t('days')}</option>
          <option value="weeks">{t('weeks')}</option>
          <option value="months">{t('months')}</option>
        </Select>
      </Field>
    </div>
  {/if}
</fieldset>

<style>
  .hz {
    border: 0;
    padding: 0;
    margin: 0;
  }
  .hz-legend {
    font-weight: 600;
    font-size: 0.9375rem;
    margin-bottom: 0.625rem;
    color: var(--color-heading);
  }
  .hz-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .hz-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    background: var(--color-base-100);
    font-weight: 500;
    font-size: 0.9375rem;
    cursor: pointer;
    user-select: none;
    transition:
      background-color 120ms ease,
      border-color 120ms ease;
  }
  .hz-chip input {
    position: absolute;
    opacity: 0;
    inset: 0;
    margin: 0;
    cursor: pointer;
  }
  .hz-chip:has(input:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .hz-on {
    border-color: var(--color-primary);
    background: color-mix(in oklab, var(--color-primary) 10%, var(--color-base-100));
    color: var(--color-primary);
    font-weight: 600;
  }
  .hz-more {
    margin-top: 1rem;
  }
  .hz-custom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    align-items: end;
  }
  @media (prefers-reduced-motion: reduce) {
    .hz-chip {
      transition: none;
    }
  }
</style>
