<!--
  Log a topic in under ten seconds: what you studied, how long you need it, Save. Notes, a link
  and the study date wait behind "More". The horizon starts at the one used last on this device.
-->
<script lang="ts">
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Textarea from '#lib/components/ui/Textarea.svelte';
  import { t } from '#lib/i18n/index.svelte.ts';
  import { addTopic, LAST_HORIZON_KEY, memory } from '#lib/app/store.svelte.ts';
  import {
    addDays,
    DEFAULT_HORIZON,
    horizonProblem,
    isDay,
    type Day,
    type Horizon,
  } from '#lib/app/schedule/index.ts';
  import Sheet from './Sheet.svelte';
  import Key from './Key.svelte';
  import HorizonPicker from './HorizonPicker.svelte';

  let {
    open = $bindable(false),
    onadded,
  }: { open?: boolean; onadded?: (r: { title: string; plan: Day[]; endOn: Day | null }) => void } = $props();

  function lastHorizon(): Horizon {
    try {
      const h = JSON.parse(localStorage.getItem(LAST_HORIZON_KEY) ?? 'null') as Horizon | null;
      if (h && (h.kind === 'until' || h.kind === 'custom')) return DEFAULT_HORIZON; // dates and lengths are per topic
      return h?.kind ? h : DEFAULT_HORIZON;
    } catch {
      return DEFAULT_HORIZON;
    }
  }

  let title = $state('');
  let notes = $state('');
  let link = $state('');
  let studied = $state<'today' | 'yesterday' | 'other'>('today');
  let studiedOther = $state('');
  let horizon = $state<Horizon>(DEFAULT_HORIZON);
  let more = $state(false);
  let saving = $state(false);
  let tried = $state(false);
  let titleInput = $state<HTMLInputElement>();

  const today = $derived(memory.today);
  const studiedOn = $derived<Day>(
    studied === 'today' ? today : studied === 'yesterday' ? addDays(today, -1) : studiedOther,
  );
  const titleProblem = $derived(title.trim() ? null : 'Name what you studied.');
  const dateProblem = $derived(
    studied === 'other' && (!isDay(studiedOther) || studiedOther > today) ? 'Pick a day up to today.' : null,
  );
  const hzProblem = $derived(isDay(studiedOn) ? horizonProblem(studiedOn, horizon, today) : null);
  const linkProblem = $derived(
    link.trim() && !/^https?:\/\/\S+$/i.test(link.trim()) ? 'Start the link with https://.' : null,
  );
  const dirty = $derived(!!(title || notes || link));

  // A fresh form each time the sheet opens.
  $effect(() => {
    if (!open) return;
    title = '';
    notes = '';
    link = '';
    studied = 'today';
    studiedOther = addDays(memory.today, -2);
    horizon = lastHorizon();
    more = false;
    tried = false;
    queueMicrotask(() => titleInput?.focus());
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    tried = true;
    if (titleProblem || dateProblem || hzProblem || linkProblem || saving) return;
    saving = true;
    try {
      const r = await addTopic({ title, notes, link, studiedOn, horizon });
      try {
        localStorage.setItem(LAST_HORIZON_KEY, JSON.stringify(horizon));
      } catch {
        // Private mode: the default stays.
      }
      open = false;
      onadded?.({ title: title.trim(), plan: r.plan, endOn: r.endOn });
    } finally {
      saving = false;
    }
  }
</script>

<Sheet title={t('Add what you studied')} bind:open dismissible={!dirty}>
  <form id="add-topic" class="add" onsubmit={save} novalidate>
    <Field
      label={t('What did you study?')}
      invalid={tried && !!titleProblem}
      hint={tried && titleProblem ? t(titleProblem) : undefined}
    >
      <Input
        bind:ref={titleInput}
        bind:value={title}
        maxlength={200}
        autocomplete="off"
        enterkeyhint="done"
        placeholder={t('Krebs cycle, chapter 4, React effects…')}
      />
    </Field>

    <HorizonPicker bind:horizon {today} problem={tried ? hzProblem : null} />

    {#if !more}
      <button type="button" class="add-more" onclick={() => (more = true)}
        >{t('Add notes, a link or the study date')}</button
      >
    {:else}
      <div class="add-extra">
        <Field label={t('Notes')} hint={t('Shown when you check yourself, to compare.')}>
          <Textarea bind:value={notes} rows={3} maxlength={20000} />
        </Field>
        <Field
          label={t('Link')}
          invalid={tried && !!linkProblem}
          hint={tried && linkProblem ? t(linkProblem) : undefined}
        >
          <Input type="url" inputmode="url" bind:value={link} placeholder="https://" maxlength={2000} />
        </Field>
        <fieldset class="add-when">
          <legend>{t('Studied')}</legend>
          <div class="add-when-row">
            {#each [['today', 'Today'], ['yesterday', 'Yesterday'], ['other', 'Earlier']] as const as [value, label] (value)}
              <label class="add-when-opt" class:add-on={studied === value}>
                <input type="radio" name="studied" {value} bind:group={studied} />
                <span>{t(label)}</span>
              </label>
            {/each}
          </div>
          {#if studied === 'other'}
            <Field
              label={t('Day studied')}
              invalid={tried && !!dateProblem}
              hint={tried && dateProblem ? t(dateProblem) : undefined}
            >
              <Input type="date" bind:value={studiedOther} max={today} />
            </Field>
          {/if}
        </fieldset>
      </div>
    {/if}
  </form>

  {#snippet foot()}
    <Key tone="primary" wide type="submit" form="add-topic" disabled={saving}>{t('Save')}</Key>
  {/snippet}
</Sheet>

<style>
  .add {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .add-more {
    align-self: flex-start;
    background: none;
    border: 0;
    padding: 0.5rem 0;
    color: var(--color-link);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .add-more:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .add-extra {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .add-when {
    border: 0;
    padding: 0;
    margin: 0;
  }
  .add-when legend {
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  .add-when-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .add-when-opt {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    font-weight: 500;
    cursor: pointer;
  }
  .add-when-opt input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }
  .add-when-opt:has(input:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .add-on {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: color-mix(in oklab, var(--color-primary) 10%, var(--color-base-100));
  }
</style>
