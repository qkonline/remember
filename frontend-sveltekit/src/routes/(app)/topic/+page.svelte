<!--
  One topic (`/topic?id=…`): its horizon track, what's planned, its notes, every check-in so far,
  and what can be done with it: edit, change how long, check yourself now, delete.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Textarea from '#lib/components/ui/Textarea.svelte';
  import Modal from '#lib/components/ui/Modal.svelte';
  import Button from '#lib/components/ui/Button.svelte';
  import {
    changeHorizon,
    checkinsOf,
    deleteTopic,
    editTopic,
    memory,
    undoCheckIn,
    watch,
    type CheckedIn,
  } from '#lib/app/store.svelte.ts';
  import { horizonProblem, type Horizon, type RatingName } from '#lib/app/schedule/index.ts';
  import { formatDay, timeLeft, whenNext } from '#lib/app/dates.ts';
  import Track from '#lib/app/ui/Track.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import Sheet from '#lib/app/ui/Sheet.svelte';
  import HorizonPicker from '#lib/app/ui/HorizonPicker.svelte';
  import RecallSheet from '#lib/app/ui/RecallSheet.svelte';
  import UndoBar from '#lib/app/ui/UndoBar.svelte';

  onMount(() => watch());

  const id = $derived(page.url.searchParams.get('id') ?? '');
  const topic = $derived(memory.topics.find((x) => x.id === id) ?? null);
  const today = $derived(memory.today);
  const history = $derived(topic ? checkinsOf(topic.id).slice().reverse() : []);
  const recalled = $derived(history.filter((c) => c.rating !== 'forgot').length);

  const ratingLabel: Record<RatingName, string> = { forgot: 'Forgot', hazy: 'Hazy', got: 'Got it' };

  // Edit
  let editing = $state(false);
  let title = $state('');
  let notes = $state('');
  let link = $state('');
  const titleProblem = $derived(title.trim() ? null : 'Name what you studied.');
  const linkProblem = $derived(
    link.trim() && !/^https?:\/\/\S+$/i.test(link.trim()) ? 'Start the link with https://.' : null,
  );

  function startEdit() {
    if (!topic) return;
    title = topic.title;
    notes = topic.notes;
    link = topic.link;
    editing = true;
  }
  async function saveEdit(e: SubmitEvent) {
    e.preventDefault();
    if (!topic || titleProblem || linkProblem) return;
    await editTopic(topic.id, { title: title.trim(), notes, link: link.trim() });
    editing = false;
  }

  // How long
  let changing = $state(false);
  let horizon = $state<Horizon>({ kind: 'quarter' });
  const hzProblem = $derived(topic ? horizonProblem(topic.studiedOn, horizon, today) : null);
  function startChange() {
    if (!topic) return;
    horizon = $state.snapshot(topic.horizon) as Horizon;
    changing = true;
  }
  async function saveChange() {
    if (!topic || hzProblem) return;
    await changeHorizon(topic.id, horizon);
    changing = false;
  }

  // Check yourself now
  let recalling = $state(false);
  let note = $state<{ message: string; undo?: () => void } | null>(null);
  function rated(r: CheckedIn) {
    note = {
      message: r.next
        ? t('Next check-in {when}.', { when: whenNext(r.next, today) })
        : t('That was the last check-in.'),
      undo: () => void undoCheckIn(r),
    };
  }

  // Delete
  let confirming = $state(false);
  async function remove() {
    if (!topic) return;
    await deleteTopic(topic.id);
    confirming = false;
    await goto(resolve('/(app)/topics'));
  }
</script>

<svelte:head><title>{topic?.title ?? t('Topic')} · {appName}</title></svelte:head>

<div class="tc">
  <a class="tc-back" href={resolve('/(app)/topics')}>{t('All topics')}</a>

  {#if !memory.loaded}
    <p class="tc-muted">{t('Loading…')}</p>
  {:else if !topic}
    <h1>{t('This topic isn’t here')}</h1>
    <p class="tc-muted">{t('It may have been deleted on another device.')}</p>
  {:else}
    <h1 class="tc-title">{topic.title}</h1>

    <div class="tc-track">
      <Track
        size="large"
        start={topic.studiedOn}
        end={topic.endOn}
        done={history.map((c) => c.day)}
        next={topic.due}
        {today}
        finished={topic.state === 'done'}
      />
      <div class="tc-ends">
        <span>{t('Studied {date}', { date: formatDay(topic.studiedOn, today) })}</span>
        <span>{topic.endOn ? formatDay(topic.endOn, today) : t('For good')}</span>
      </div>
    </div>

    <dl class="tc-facts">
      <div>
        <dt>{t('Next check-in')}</dt>
        <dd>
          {topic.state === 'done'
            ? t('None: kept to the finish line')
            : topic.due
              ? whenNext(topic.due, today)
              : t('None before the end date')}
        </dd>
      </div>
      <div>
        <dt>{t('Remember')}</dt>
        <dd>{topic.endOn ? timeLeft(topic.endOn, today) : t('For good')}</dd>
      </div>
      <div>
        <dt>{t('Check-ins')}</dt>
        <dd>
          {history.length
            ? tn(history.length, '1 so far, recalled {recalled}', '{count} so far, recalled {recalled}', {
                recalled,
              })
            : t('None yet')}
        </dd>
      </div>
    </dl>

    <div class="tc-keys">
      <Key tone="primary" onclick={() => (recalling = true)}>{t('Check yourself now')}</Key>
      <Key onclick={startChange}>{t('Change how long')}</Key>
      <Key onclick={startEdit}>{t('Edit')}</Key>
    </div>

    {#if topic.notes.trim() || topic.link}
      <section class="tc-sec" aria-labelledby="notes-title">
        <h2 id="notes-title">{t('Notes')}</h2>
        {#if topic.notes.trim()}<p class="tc-notes">{topic.notes}</p>{/if}
        {#if topic.link}
          <a class="tc-link" href={topic.link} target="_blank" rel="noopener noreferrer">{topic.link}</a>
        {/if}
      </section>
    {/if}

    <section class="tc-sec" aria-labelledby="history-title">
      <h2 id="history-title">{t('Check-ins')}</h2>
      {#if history.length}
        <ol class="tc-history">
          {#each history as c (c.id)}
            <li>
              <span>{formatDay(c.day, today)}</span>
              <span class="tc-rating" class:tc-forgot={c.rating === 'forgot'}>{t(ratingLabel[c.rating])}</span
              >
            </li>
          {/each}
        </ol>
      {:else}
        <p class="tc-muted">
          {topic.due
            ? t('The first one is {when}.', { when: whenNext(topic.due, today) })
            : t('No check-ins were planned.')}
        </p>
      {/if}
    </section>

    <div class="tc-danger">
      <Button variant="danger" onclick={() => (confirming = true)}>{t('Delete topic')}</Button>
    </div>
  {/if}
</div>

{#if topic}
  <Sheet title={t('Edit topic')} bind:open={editing}>
    <form id="edit-topic" class="tc-form" onsubmit={saveEdit} novalidate>
      <Field
        label={t('What did you study?')}
        invalid={!!titleProblem}
        hint={titleProblem ? t(titleProblem) : undefined}
      >
        <Input bind:value={title} maxlength={200} autocomplete="off" />
      </Field>
      <Field label={t('Notes')}>
        <Textarea bind:value={notes} rows={5} maxlength={20000} />
      </Field>
      <Field label={t('Link')} invalid={!!linkProblem} hint={linkProblem ? t(linkProblem) : undefined}>
        <Input type="url" inputmode="url" bind:value={link} placeholder="https://" maxlength={2000} />
      </Field>
    </form>
    {#snippet foot()}
      <Key tone="primary" wide type="submit" form="edit-topic">{t('Save changes')}</Key>
    {/snippet}
  </Sheet>

  <Sheet title={t('Change how long')} bind:open={changing}>
    <p class="tc-muted tc-lead">
      {t('The check-ins move to fit the new end date. Nothing done so far is lost.')}
    </p>
    <HorizonPicker bind:horizon {today} problem={hzProblem} />
    {#snippet foot()}
      <Key tone="primary" wide onclick={saveChange} disabled={!!hzProblem}>{t('Save how long')}</Key>
    {/snippet}
  </Sheet>

  <RecallSheet {topic} bind:open={recalling} onrated={rated} />

  <Modal title={t('Delete {title}?', { title: topic.title })} bind:open={confirming}>
    <p>{t('Its check-ins go too, on every device. This can’t be undone.')}</p>
    {#snippet actions()}
      <Button onclick={() => (confirming = false)}>{t('Keep it')}</Button>
      <Button variant="danger-solid" onclick={remove}>{t('Delete topic')}</Button>
    {/snippet}
  </Modal>
{/if}

{#if note}
  {#key note}
    <UndoBar message={note.message} onundo={note.undo} ondone={() => (note = null)} />
  {/key}
{/if}

<style>
  .tc {
    max-width: 40rem;
  }
  .tc-back {
    display: inline-block;
    margin-bottom: 1rem;
    color: var(--color-link);
    font-weight: 500;
  }
  .tc-title {
    margin: 0 0 1.5rem;
    overflow-wrap: anywhere;
  }
  .tc-track {
    margin-bottom: 1.5rem;
  }
  .tc-ends {
    display: flex;
    justify-content: space-between;
    margin-top: 0.625rem;
    color: var(--color-muted);
    font-size: 0.875rem;
  }
  .tc-facts {
    display: grid;
    gap: 0.75rem;
    margin: 0 0 1.5rem;
  }
  @media (min-width: 36rem) {
    .tc-facts {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .tc-facts dt {
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
  .tc-facts dd {
    margin: 0.125rem 0 0;
    font-weight: 600;
  }
  .tc-keys {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
    margin-bottom: 2rem;
  }
  .tc-sec {
    margin-bottom: 2rem;
  }
  .tc-sec h2 {
    font-size: 1.0625rem;
    font-weight: 600;
    margin: 0 0 0.625rem;
  }
  .tc-notes {
    white-space: pre-wrap;
    margin: 0 0 0.5rem;
    max-width: 65ch;
  }
  .tc-link {
    color: var(--color-link);
    overflow-wrap: anywhere;
  }
  .tc-history {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--color-base-300);
  }
  .tc-history li {
    display: flex;
    justify-content: space-between;
    padding: 0.625rem 0;
    border-bottom: 1px solid var(--color-base-300);
  }
  .tc-rating {
    font-weight: 600;
    color: var(--color-success);
  }
  .tc-forgot {
    color: var(--color-muted);
  }
  .tc-muted {
    color: var(--color-muted);
  }
  .tc-lead {
    margin: 0 0 1rem;
  }
  .tc-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .tc-danger {
    padding-top: 1rem;
    border-top: 1px solid var(--color-base-300);
  }
</style>
