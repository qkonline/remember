<!--
  Plant something new: a large dialog (the whole screen on a phone) to log a topic in under ten
  seconds: what you studied, its category, how long you need it, Plant it (Enter in the title
  plants it too). Its head is the plan, drawn as a garden row that moves as the choices change.
  Notes (with a little formatting; links go in them) and the day studied sit beside the choices
  on a computer, below them on a phone. The category and "keep it for" start at the ones used
  last on this device (or the category it was opened from).
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
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
  import Key from './Key.svelte';
  import Glyph from './Glyph.svelte';
  import HorizonPicker from './HorizonPicker.svelte';
  import ShelfPicker from './ShelfPicker.svelte';
  import NotesEditor from './NotesEditor.svelte';
  import PlanLine from './PlanLine.svelte';

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
  let shelf = $state<string | null>(null);
  let newShelf = $state('');
  let studied = $state<'today' | 'yesterday' | 'other'>('today');
  let studiedOther = $state('');
  let horizon = $state<Horizon>(DEFAULT_HORIZON);
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
  const dirty = $derived(!!(title || notes || newShelf));

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
  const firstLabel = $derived(plan[0] ? t('First check-in {when}', { when: whenNext(plan[0], today) }) : '');

  // The dialog: opened and closed from `open`; Escape and the backdrop only while nothing is typed.
  const uid = $props.id();
  let dialog: HTMLDialogElement;
  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  // A fresh form each time the sheet opens, and only then: untracked, so a shelf made while
  // saving (which reloads the shelves) doesn't clear the form under the save.
  $effect(() => {
    if (open) untrack(reset);
  });
  function reset() {
    title = '';
    notes = '';
    newShelf = '';
    shelf = ui.addOnShelf ?? lastShelf();
    studied = 'today';
    studiedOther = addDays(memory.today, -2);
    horizon = lastHorizon();
    tried = false;
    queueMicrotask(() => titleInput?.focus());
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    tried = true;
    if (titleProblem || shelfProblem || dateProblem || hzProblem || saving) {
      if (titleProblem) titleInput?.focus();
      return;
    }
    saving = true;
    try {
      const shelfId = shelf === 'new' ? await addShelf(newShelf) : shelf;
      const r = await addTopic({ title, shelf: shelfId, notes, link: '', studiedOn, horizon });
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

<dialog
  bind:this={dialog}
  class="modal ad"
  aria-labelledby="{uid}-title"
  onclose={() => (open = false)}
  oncancel={(e) => {
    if (dirty) e.preventDefault();
  }}
>
  <form class="modal-box ad-box" onsubmit={save} novalidate>
    <header class="ad-hero">
      <div class="ad-top">
        <h2 id="{uid}-title">{t('Plant something new')}</h2>
        <button type="button" class="ad-close" aria-label={t('Close')} onclick={() => (open = false)}
          ><Glyph name="close" size={18} /></button
        >
      </div>
      <p class="ad-plan" aria-live="polite">
        {#if hzProblem || !isDay(studiedOn)}{t('Choose how long to keep it')}{:else}{planLabel}{/if}
      </p>
      {#if firstLabel && !hzProblem}<p class="ad-first">{firstLabel}</p>{/if}
      {#if plan.length && isDay(studiedOn)}
        <PlanLine {plan} start={studiedOn} {end} {today} />
      {/if}
    </header>

    <div class="ad-body">
      <div class="ad-title" class:ad-bad={tried && !!titleProblem}>
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

      <div class="ad-cols">
        <div class="ad-choices">
          <ShelfPicker bind:shelf bind:newName={newShelf} problem={tried ? shelfProblem : null} />
          <HorizonPicker bind:horizon {today} problem={tried ? hzProblem : null} />
        </div>
        <div class="ad-side">
          <NotesEditor bind:value={notes} rows={6} />
          <fieldset class="ad-when">
            <legend>{t('Studied')}</legend>
            <div class="ad-tray">
              {#each [['today', 'Today'], ['yesterday', 'Yesterday'], ['other', 'Earlier']] as const as [value, label] (value)}
                <label class="ad-tab" class:ad-on={studied === value}>
                  <input type="radio" name="{uid}-studied" {value} bind:group={studied} />
                  <span>{t(label)}</span>
                </label>
              {/each}
            </div>
            {#if studied === 'other'}
              <div class="ad-day">
                <Field
                  label={t('Day studied')}
                  invalid={tried && !!dateProblem}
                  hint={tried && dateProblem ? t(dateProblem) : undefined}
                >
                  <Input type="date" bind:value={studiedOther} max={today} />
                </Field>
              </div>
            {/if}
          </fieldset>
        </div>
      </div>
    </div>

    <footer class="ad-foot">
      <button type="button" class="ad-cancel" onclick={() => (open = false)}>{t('Cancel')}</button>
      <Key tone="leaf" big type="submit" disabled={saving}><Glyph name="plus" size={18} />{t('Plant it')}</Key
      >
    </footer>
  </form>
  {#if !dirty}
    <form method="dialog" class="modal-backdrop"><button aria-label={t('Close')}>{t('Close')}</button></form>
  {/if}
</dialog>

<style>
  /* A phone gets the whole screen; a computer a large card in the middle. */
  .ad-box {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: none;
    height: 100dvh;
    max-height: 100dvh;
    padding: 0;
    border-radius: 0;
    overflow: hidden;
  }
  .ad-hero {
    flex: none;
    padding: calc(0.75rem + env(safe-area-inset-top)) 1.25rem 0.75rem;
    background: var(--color-leaf-tab);
    border-bottom: 1px solid color-mix(in oklab, var(--color-leaf-line) 25%, transparent);
  }
  .ad-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .ad-top h2 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-leaf-deep);
  }
  .ad-close {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-inline-end: -0.5rem;
    border: 0;
    border-radius: 12px;
    background: none;
    color: var(--color-leaf-deep);
    cursor: pointer;
  }
  .ad-close:hover {
    background: color-mix(in oklab, var(--color-base-100) 55%, transparent);
  }
  .ad-close:focus-visible,
  .ad-cancel:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .ad-plan {
    margin: 0.25rem 0 0;
    max-width: 30ch;
    font-size: 1.375rem;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.01em;
    color: var(--color-heading);
    text-wrap: balance;
  }
  .ad-first {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: var(--color-leaf-deep);
  }
  .ad-body {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1.25rem 1.25rem 1.5rem;
  }
  /* Every label in the dialog in one voice: the fields' and the choices' alike. */
  .ad-body :global(.fieldset-legend) {
    padding: 0 0 0.5rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-heading);
  }
  .ad-title :global(input) {
    min-height: 3.5rem;
    font-size: 1.375rem;
    font-weight: 500;
    border-radius: 16px;
  }
  /* One clear focus mark on fields: a green border and a soft ring. */
  .ad-body :global(:is(.input, .select):focus-within) {
    outline: none;
    border-color: var(--color-leaf-line);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-leaf-line) 22%, transparent);
  }
  .ad-cols {
    display: grid;
    gap: 1.25rem;
    margin-top: 1.25rem;
  }
  .ad-choices,
  .ad-side {
    display: grid;
    gap: 1.25rem;
    min-width: 0;
  }
  .ad-when {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  .ad-when legend {
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.9375rem;
    color: var(--color-heading);
  }
  .ad-tray {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--color-base-300);
    border-radius: 16px;
    background: var(--color-base-200);
  }
  .ad-tab {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 2.75rem;
    border: 1px solid transparent;
    border-radius: 12px;
    font-size: 0.9375rem;
    cursor: pointer;
  }
  .ad-tab:hover {
    background: color-mix(in oklab, var(--color-base-100) 60%, transparent);
  }
  .ad-tab input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }
  .ad-tab:has(input:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }
  .ad-on,
  .ad-on:hover {
    border-color: var(--color-leaf-line);
    background: var(--color-base-100);
    box-shadow: 0 1px 2px light-dark(rgb(23 61 15 / 0.12), rgb(0 0 0 / 0.4));
    color: var(--color-leaf-deep);
    font-weight: 500;
  }
  .ad-day {
    margin-top: 0.75rem;
  }
  .ad-foot {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom));
    border-top: 1px solid var(--color-base-300);
    background: var(--color-base-100);
  }
  .ad-foot :global(.rk) {
    flex: 1;
  }
  .ad-cancel {
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 0;
    border-radius: 12px;
    background: none;
    color: var(--color-base-content);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .ad-cancel:hover {
    background: var(--color-base-200);
  }

  @media (min-width: 48rem) {
    .ad-box {
      width: min(62rem, calc(100vw - 3rem));
      height: auto;
      max-height: min(52rem, calc(100dvh - 3rem));
      border-radius: 28px;
    }
    .ad-hero {
      padding: 1rem 1.75rem 0.875rem;
    }
    .ad-plan {
      font-size: 1.75rem;
    }
    .ad-body {
      padding: 1.5rem 1.75rem 1.75rem;
    }
    .ad-cols {
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
      gap: 2rem;
      align-items: start;
    }
    .ad-foot {
      padding: 0.875rem 1.75rem;
    }
    .ad-foot :global(.rk) {
      flex: none;
      min-width: 12rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ad-box,
    dialog {
      transition: none;
      animation: none;
    }
  }
</style>
