<!--
  One topic: a pot growing with it, its title and where it stands, the garden row of its reviews
  up to its end date, its notes, and the one thing it needs now. Editing, changing how long and
  deleting wait in the ⋯ menu. (An older topic's separate link shows below the notes until the
  topic is next edited, when it moves into them.)
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Modal from '#lib/components/ui/Modal.svelte';
  import NotesEditor from './NotesEditor.svelte';
  import NotesText from './NotesText.svelte';
  import Button from '#lib/components/ui/Button.svelte';
  import Dropdown from '#lib/components/ui/Dropdown.svelte';
  import Menu from '#lib/components/ui/Menu.svelte';
  import {
    addShelf,
    changeHorizon,
    checkinsOf,
    deleteTopic,
    editTopic,
    finish,
    memory,
    shelfOf,
    type Topic,
  } from '#lib/app/store.svelte.ts';
  import { hasEnded, horizonProblem, type Horizon } from '#lib/app/schedule/index.ts';
  import { formatDay, horizonLabel, whenNext } from '#lib/app/dates.ts';
  import { say } from '#lib/app/ui.svelte.ts';
  import Glyph from './Glyph.svelte';
  import HorizonPicker from './HorizonPicker.svelte';
  import Key from './Key.svelte';
  import GrowingPot from './GrowingPot.svelte';
  import PlanLine from './PlanLine.svelte';
  import ShelfPicker from './ShelfPicker.svelte';
  import Sheet from './Sheet.svelte';

  let { topic, ondeleted }: { topic: Topic; ondeleted?: () => void } = $props();

  const today = $derived(memory.today);
  const shelf = $derived(shelfOf(topic));
  const history = $derived(checkinsOf(topic.id));
  const length = $derived(horizonLabel(topic.horizon));

  const ended = $derived(topic.state === 'active' && hasEnded(topic, today));
  const status = $derived.by(() => {
    if (topic.state === 'done')
      return topic.doneOn ? t('Finished on {date}', { date: formatDay(topic.doneOn, today) }) : t('Finished');
    if (ended && topic.endOn) return t('End date passed on {date}', { date: formatDay(topic.endOn, today) });
    if (!topic.due) return t('No more reviews');
    return topic.due <= today
      ? t('Review today')
      : t('Next review {when}', { when: whenNext(topic.due, today) });
  });
  /** The row: the days reviewed, and the next one. */
  const planned = $derived([
    ...new Set([...history.map((c) => c.day), ...(topic.due && topic.state === 'active' ? [topic.due] : [])]),
  ]);
  const summary = $derived(
    [
      history.length ? tn(history.length, 'Reviewed once', 'Reviewed {count} times') : t('Not reviewed yet'),
      length,
    ]
      .filter(Boolean)
      .join(' · '),
  );

  // Edit
  let editing = $state(false);
  let title = $state('');
  let notes = $state('');
  let shelfPick = $state<string | null>(null);
  let newShelf = $state('');
  let tried = $state(false);
  const titleProblem = $derived(title.trim() ? null : 'Name what you studied.');
  const shelfProblem = $derived(shelfPick === 'new' && !newShelf.trim() ? 'Name the new category.' : null);

  function startEdit() {
    title = topic.title;
    // A link from before notes took links moves into them, so it stays editable.
    notes =
      topic.link && !topic.notes.includes(topic.link)
        ? [topic.notes.trimEnd(), topic.link].filter(Boolean).join('\n\n')
        : topic.notes;
    shelfPick = topic.shelf;
    newShelf = '';
    tried = false;
    editing = true;
  }
  async function saveEdit(e: SubmitEvent) {
    e.preventDefault();
    tried = true;
    if (titleProblem || shelfProblem) return;
    const shelfId = shelfPick === 'new' ? await addShelf(newShelf) : shelfPick;
    await editTopic(topic.id, { title: title.trim(), notes, link: '', shelf: shelfId });
    editing = false;
  }

  // How long
  let changing = $state(false);
  let horizon = $state<Horizon>({ kind: 'quarter' });
  const hzProblem = $derived(horizonProblem(topic.studiedOn, horizon, today));
  function startChange() {
    horizon = $state.snapshot(topic.horizon) as Horizon;
    changing = true;
  }
  async function saveChange() {
    if (hzProblem) return;
    await changeHorizon(topic.id, horizon);
    changing = false;
  }

  async function finishIt() {
    await finish(topic.id);
    say(t('Finished {title}. It stays in your topics.', { title: topic.title }));
  }

  // Delete
  let confirming = $state(false);
  async function remove() {
    const name = topic.title;
    await deleteTopic(topic.id);
    confirming = false;
    say(t('Deleted {title}.', { title: name }));
    ondeleted?.();
  }
</script>

<article class="tdl">
  <div class="tdl-head">
    <GrowingPot {shelf} leaves={Math.min(6, history.length + 1)} size={64} />
    <div class="tdl-name">
      <h1 class="tdl-title">{topic.title}</h1>
      <p class="tdl-status">{shelf?.name ?? t('No category')} · {status}</p>
    </div>
    <Dropdown align="end" variant="ghost">
      {#snippet label()}<span class="tdl-dots" aria-label={t('More')}>⋯</span>{/snippet}
      <Menu>
        <li><button type="button" onclick={startEdit}>{t('Edit')}</button></li>
        <li><button type="button" onclick={startChange}>{t('Change how long')}</button></li>
        <li>
          <button type="button" class="tdl-delete" onclick={() => (confirming = true)}>{t('Delete')}</button>
        </li>
      </Menu>
    </Dropdown>
  </div>

  <div class="tdl-row">
    <PlanLine plan={planned} start={topic.studiedOn} end={topic.endOn} {today} />
    <p class="tdl-summary">{summary}</p>
  </div>

  {#if topic.notes.trim()}
    <div class="tdl-notes"><NotesText text={topic.notes} /></div>
  {:else if !topic.link}
    <p class="tdl-nonotes">
      {t('No notes yet.')}
      <button type="button" onclick={startEdit}>{t('Add notes')}</button>
    </p>
  {/if}
  {#if topic.link}
    <a class="tdl-link" href={topic.link} target="_blank" rel="noopener noreferrer"
      ><Glyph name="link" size={16} /><span>{topic.link.replace(/^https?:\/\//i, '')}</span></a
    >
  {/if}

  <div class="tdl-keys">
    {#if topic.state === 'done' || ended}
      <Key tone="leaf" onclick={startChange}>{t('Keep reviewing')}</Key>
    {:else}
      <Key tone="leaf" onclick={() => goto(`${resolve('/(app)/review')}?id=${topic.id}`)}
        ><Glyph name="play" size={16} />{t('Review now')}</Key
      >
    {/if}
    {#if topic.state === 'active'}<Key onclick={finishIt}>{t('Finish')}</Key>{/if}
  </div>
</article>

<Sheet title={t('Edit topic')} bind:open={editing}>
  <form id="edit-topic-{topic.id}" class="tdl-form" onsubmit={saveEdit} novalidate>
    <Field
      label={t('What did you study?')}
      invalid={tried && !!titleProblem}
      hint={tried && titleProblem ? t(titleProblem) : undefined}
    >
      <Input bind:value={title} maxlength={200} autocomplete="off" />
    </Field>
    <ShelfPicker bind:shelf={shelfPick} bind:newName={newShelf} problem={tried ? shelfProblem : null} />
    <NotesEditor bind:value={notes} rows={7} />
  </form>
  {#snippet foot()}
    <Key tone="leaf" big wide type="submit" form="edit-topic-{topic.id}">{t('Save changes')}</Key>
  {/snippet}
</Sheet>

<Sheet title={t('Change how long')} bind:open={changing}>
  <p class="tdl-lead">{t('Reviews move to fit the new end date. Nothing done so far is lost.')}</p>
  <HorizonPicker bind:horizon {today} problem={hzProblem} />
  {#snippet foot()}
    <Key tone="leaf" big wide onclick={saveChange} disabled={!!hzProblem}>{t('Save how long')}</Key>
  {/snippet}
</Sheet>

<Modal title={t('Delete {title}?', { title: topic.title })} bind:open={confirming}>
  <p>{t('Its reviews go too, on every device. This can’t be undone.')}</p>
  {#snippet actions()}
    <Button onclick={() => (confirming = false)}>{t('Cancel')}</Button>
    <Button variant="danger-solid" onclick={remove}>{t('Delete topic')}</Button>
  {/snippet}
</Modal>

<style>
  .tdl {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .tdl-head {
    display: flex;
    align-items: flex-end;
    gap: 0.875rem;
  }
  .tdl-name {
    flex: 1;
    min-width: 0;
    padding-bottom: 0.25rem;
  }
  .tdl-title {
    margin: 0;
    font-size: 1.75rem;
    line-height: 1.15;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-heading);
    overflow-wrap: anywhere;
  }
  .tdl-status {
    margin: 0.25rem 0 0;
    color: var(--color-muted);
    font-size: 0.9375rem;
  }
  .tdl-dots {
    font-size: 1.25rem;
    line-height: 1;
  }
  .tdl-delete {
    color: var(--color-error);
  }
  .tdl-row {
    padding: 0.75rem 1rem 0.875rem;
    border-radius: 18px;
    background: var(--color-base-200);
  }
  .tdl-summary {
    margin: 0.5rem 0 0;
    color: var(--color-muted);
    font-size: 0.875rem;
  }
  .tdl-notes {
    line-height: 1.55;
  }
  .tdl-nonotes {
    margin: 0;
    color: var(--color-muted);
  }
  .tdl-nonotes button {
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-primary);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .tdl-nonotes button:focus-visible,
  .tdl-link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
  .tdl-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    max-width: 100%;
    color: var(--color-link);
    font-size: 0.9375rem;
  }
  .tdl-link span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tdl-keys {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
  }
  .tdl-form {
    display: grid;
    gap: 1rem;
  }
  .tdl-lead {
    margin: 0 0 1rem;
    color: var(--color-muted);
  }
</style>
