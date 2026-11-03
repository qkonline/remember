<!--
  Log a topic in under ten seconds: what you studied, its shelf, how long you need it, Plant it.
  The check-ins it will get show as sprouts while choosing. Notes, a link and the study date wait
  behind "More". The horizon and shelf start at the ones used last on this device (or the shelf
  the sheet was opened from).
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Textarea from '#lib/components/ui/Textarea.svelte';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import { addShelf, addTopic, LAST_HORIZON_KEY, LAST_SHELF_KEY, memory } from '#lib/app/store.svelte.ts';
  import {
    addDays,
    DEFAULT_HORIZON,
    endOn,
    horizonProblem,
    isDay,
    preview,
    type Day,
    type Horizon,
  } from '#lib/app/schedule/index.ts';
  import { formatDay, whenNext } from '#lib/app/dates.ts';
  import { say, ui } from '#lib/app/ui.svelte.ts';
  import Sheet from './Sheet.svelte';
  import Key from './Key.svelte';
  import Glyph from './Glyph.svelte';
  import HorizonPicker from './HorizonPicker.svelte';
  import ShelfPicker from './ShelfPicker.svelte';
  import PlanSprouts from './PlanSprouts.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  function lastHorizon(): Horizon {
    try {
      const h = JSON.parse(localStorage.getItem(LAST_HORIZON_KEY) ?? 'null') as Horizon | null;
      if (h && (h.kind === 'until' || h.kind === 'custom')) return DEFAULT_HORIZON; // dates and lengths are per topic
      return h?.kind ? h : DEFAULT_HORIZON;
    } catch {
      return DEFAULT_HORIZON;
    }
  }
  function lastShelf(): string | null {
    try {
      const id = localStorage.getItem(LAST_SHELF_KEY);
      return id && memory.shelves.some((s) => s.id === id) ? id : null;
    } catch {
      return null;
    }
  }
  function remember(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Private mode: the defaults stay.
    }
  }

  let title = $state('');
  let notes = $state('');
  let link = $state('');
  let shelf = $state<string | null>(null);
  let newShelf = $state('');
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
  const shelfProblem = $derived(shelf === 'new' && !newShelf.trim() ? 'Name the new category.' : null);
  const dateProblem = $derived(
    studied === 'other' && (!isDay(studiedOther) || studiedOther > today) ? 'Pick a day up to today.' : null,
  );
  const hzProblem = $derived(isDay(studiedOn) ? horizonProblem(studiedOn, horizon, today) : null);
  const linkProblem = $derived(
    link.trim() && !/^https?:\/\/\S+$/i.test(link.trim()) ? 'Start the link with https://.' : null,
  );
  const dirty = $derived(!!(title || notes || link || newShelf));

  const end = $derived(isDay(studiedOn) && !hzProblem ? endOn(studiedOn, horizon) : null);
  const plan = $derived(
    isDay(studiedOn) && !hzProblem ? preview({ studiedOn, endOn: end }, memory.settings.retention) : [],
  );
  const planLabel = $derived(
    end
      ? tn(plan.length, 'It comes back once, before {end}', 'It comes back {count} times, until {end}', {
          end: formatDay(end, today),
        })
      : t('It comes back less and less often, for good'),
  );

  // A fresh form each time the sheet opens, and only then: untracked, so a shelf made while
  // saving (which reloads the shelves) doesn't clear the form under the save.
  $effect(() => {
    if (open) untrack(reset);
  });
  function reset() {
    title = '';
    notes = '';
    link = '';
    newShelf = '';
    shelf = ui.addOnShelf ?? lastShelf();
    studied = 'today';
    studiedOther = addDays(memory.today, -2);
    horizon = lastHorizon();
    more = false;
    tried = false;
    queueMicrotask(() => titleInput?.focus());
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    tried = true;
    if (titleProblem || shelfProblem || dateProblem || hzProblem || linkProblem || saving) return;
    saving = true;
    try {
      const shelfId = shelf === 'new' ? await addShelf(newShelf) : shelf;
      const r = await addTopic({ title, shelf: shelfId, notes, link, studiedOn, horizon });
      remember(LAST_HORIZON_KEY, JSON.stringify(horizon));
      remember(LAST_SHELF_KEY, shelfId);
      open = false;
      const first = r.plan[0];
      const name = title.trim();
      say(
        !first
          ? t('Planted {title}.', { title: name })
          : r.endOn
            ? tn(
                r.plan.length,
                'Planted. First check-in {when}, the only one before {end}.',
                'Planted. First check-in {when}, about {count} until {end}.',
                { when: whenNext(first, today), end: formatDay(r.endOn, today) },
              )
            : t('Planted. First check-in {when}, then less and less often.', {
                when: whenNext(first, today),
              }),
      );
    } finally {
      saving = false;
    }
  }
</script>

<Sheet title={t('Plant something new')} bind:open dismissible={!dirty}>
  <form id="add-topic" class="add" onsubmit={save} novalidate>
    <div class="add-title" class:add-bad={tried && !!titleProblem}>
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
    </div>

    <ShelfPicker bind:shelf bind:newName={newShelf} problem={tried ? shelfProblem : null} />

    <HorizonPicker bind:horizon {today} problem={tried ? hzProblem : null} />

    {#if plan.length}<PlanSprouts {plan} label={planLabel} />{/if}

    {#if !more}
      <button type="button" class="add-more" onclick={() => (more = true)}
        ><Glyph name="plus" size={16} />{t('Notes, a link or the day you studied')}</button
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
    <Key tone="leaf" big wide type="submit" form="add-topic" disabled={saving}
      ><Glyph name="plus" size={18} />{t('Plant it')}</Key
    >
  {/snippet}
</Sheet>

<style>
  .add {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .add-title :global(input) {
    min-height: 3.5rem;
    font-size: 1.375rem;
    font-weight: 500;
    border-radius: 16px;
  }
  .add-more {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    background: none;
    border: 0;
    padding: 0;
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
    font-size: 0.9375rem;
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
    border: 1.5px solid var(--color-leaf-line);
    background: var(--color-leaf-tint);
    color: var(--color-leaf-deep);
  }
</style>
