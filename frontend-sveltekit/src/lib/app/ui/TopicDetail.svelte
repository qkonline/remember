<!--
  One topic in full: its shelf, title, notes and link; how long it is kept (with Change); how it
  has grown, check-in by check-in, and what comes next; and what can be done with it (check
  yourself now, edit, mark as learned, delete). The topic page shows it; on a computer the
  Shelves page shows it beside the list.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { t } from '#lib/i18n/index.svelte.ts';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Textarea from '#lib/components/ui/Textarea.svelte';
  import Modal from '#lib/components/ui/Modal.svelte';
  import Button from '#lib/components/ui/Button.svelte';
  import {
    addShelf,
    changeHorizon,
    checkinsOf,
    deleteTopic,
    editTopic,
    finish,
    growthOf,
    memory,
    shelfOf,
    type Topic,
  } from '#lib/app/store.svelte.ts';
  import { daysBetween, horizonProblem, type Horizon, type RatingName } from '#lib/app/schedule/index.ts';
  import { formatDay, horizonLabel, timeLeft, whenNext } from '#lib/app/dates.ts';
  import { say } from '#lib/app/ui.svelte.ts';
  import Glyph from './Glyph.svelte';
  import HorizonPicker from './HorizonPicker.svelte';
  import Key from './Key.svelte';
  import ShelfMark from './ShelfMark.svelte';
  import ShelfPicker from './ShelfPicker.svelte';
  import Sheet from './Sheet.svelte';

  let { topic, ondeleted }: { topic: Topic; ondeleted?: () => void } = $props();

  const today = $derived(memory.today);
  const shelf = $derived(shelfOf(topic));
  const history = $derived(checkinsOf(topic.id));
  const grown = $derived(growthOf(topic));
  const length = $derived(horizonLabel(topic.horizon));

  const ratingLabel: Record<RatingName, string> = { forgot: 'Forgot', hazy: 'Hazy', got: 'Got it' };

  type Step = {
    key: string;
    kind: 'plant' | RatingName | 'due' | 'next' | 'end' | 'learned';
    what: string;
    when: string;
  };
  const steps = $derived.by<Step[]>(() => {
    const out: Step[] = [
      { key: 'studied', kind: 'plant', what: t('Studied'), when: formatDay(topic.studiedOn, today) },
      ...history.map((c) => ({
        key: c.id,
        kind: c.rating,
        what: t(ratingLabel[c.rating]),
        when: formatDay(c.day, today),
      })),
    ];
    if (topic.state === 'done') {
      out.push({
        key: 'learned',
        kind: 'learned',
        what: t('Learned'),
        when: topic.doneOn ? formatDay(topic.doneOn, today) : '',
      });
      return out;
    }
    if (topic.due)
      out.push(
        topic.due <= today
          ? { key: 'due', kind: 'due', what: t('Due today'), when: formatDay(today, today) }
          : {
              key: 'due',
              kind: 'next',
              what: t('Next check-in, {when}', { when: whenNext(topic.due, today) }),
              when: formatDay(topic.due, today),
            },
      );
    if (topic.endOn)
      out.push({ key: 'end', kind: 'end', what: t('Kept until here'), when: formatDay(topic.endOn, today) });
    return out;
  });

  // Edit
  let editing = $state(false);
  let title = $state('');
  let notes = $state('');
  let link = $state('');
  let shelfPick = $state<string | null>(null);
  let newShelf = $state('');
  let tried = $state(false);
  const titleProblem = $derived(title.trim() ? null : 'Name what you studied.');
  const shelfProblem = $derived(shelfPick === 'new' && !newShelf.trim() ? 'Name the new shelf.' : null);
  const linkProblem = $derived(
    link.trim() && !/^https?:\/\/\S+$/i.test(link.trim()) ? 'Start the link with https://.' : null,
  );

  function startEdit() {
    title = topic.title;
    notes = topic.notes;
    link = topic.link;
    shelfPick = topic.shelf;
    newShelf = '';
    tried = false;
    editing = true;
  }
  async function saveEdit(e: SubmitEvent) {
    e.preventDefault();
    tried = true;
    if (titleProblem || linkProblem || shelfProblem) return;
    const shelfId = shelfPick === 'new' ? await addShelf(newShelf) : shelfPick;
    await editTopic(topic.id, { title: title.trim(), notes, link: link.trim(), shelf: shelfId });
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

  async function learned() {
    await finish(topic.id);
    say(t('{title} is learned. It stays in its category.', { title: topic.title }));
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
  <div class="tdl-top">
    <ShelfMark {shelf} size={30} />
    <span class="tdl-shelf">{shelf?.name ?? t('No category')}</span>
    <button type="button" class="tdl-edit" onclick={startEdit}
      ><Glyph name="edit" size={18} />{t('Edit')}</button
    >
  </div>

  <h1 class="tdl-title">{topic.title}</h1>
  {#if topic.notes.trim()}<p class="tdl-notes">{topic.notes}</p>{/if}
  {#if topic.link}
    <a class="tdl-link" href={topic.link} target="_blank" rel="noopener noreferrer"
      ><Glyph name="link" size={16} /><span>{topic.link.replace(/^https?:\/\//i, '')}</span></a
    >
  {/if}

  <div class="tdl-keep">
    <Glyph name="calendar" size={34} />
    <span class="tdl-keep-text">
      <span class="tdl-keep-big">
        {topic.state === 'done'
          ? t('Learned')
          : topic.endOn
            ? t('Keep it until {date}', { date: formatDay(topic.endOn, today) })
            : t('Keep it for good')}
      </span>
      <span class="tdl-keep-small">
        {[
          length ?? '',
          topic.endOn && topic.state === 'active' && daysBetween(today, topic.endOn) < 70
            ? timeLeft(topic.endOn, today)
            : '',
          t('{done} of about {total} check-ins done', { done: grown.done, total: grown.total }),
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </span>
    <button type="button" class="tdl-change" onclick={startChange}>{t('Change')}</button>
  </div>

  <h2 class="tdl-h2">{t('How it is growing')}</h2>
  <ol class="tdl-steps">
    {#each steps as s (s.key)}
      <li class="tdl-step tdl-{s.kind}">
        <span class="tdl-dot" aria-hidden="true"></span>
        <span class="tdl-what">{s.what}</span>
        <span class="tdl-when">{s.when}</span>
      </li>
    {/each}
  </ol>

  <div class="tdl-keys">
    {#if topic.state === 'active'}
      <Key tone="leaf" onclick={() => goto(`${resolve('/(app)/review')}?id=${topic.id}`)}
        ><Glyph name="play" size={16} />{t('Check yourself now')}</Key
      >
      <Key onclick={learned}><Glyph name="sprout" size={18} />{t('Mark as learned')}</Key>
    {:else}
      <Key onclick={startChange}><Glyph name="sprout" size={18} />{t('Keep growing it')}</Key>
    {/if}
    <button type="button" class="tdl-delete" onclick={() => (confirming = true)}>{t('Delete')}</button>
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
    <Field label={t('Notes')}>
      <Textarea bind:value={notes} rows={5} maxlength={20000} />
    </Field>
    <Field
      label={t('Link')}
      invalid={tried && !!linkProblem}
      hint={tried && linkProblem ? t(linkProblem) : undefined}
    >
      <Input type="url" inputmode="url" bind:value={link} placeholder="https://" maxlength={2000} />
    </Field>
  </form>
  {#snippet foot()}
    <Key tone="leaf" big wide type="submit" form="edit-topic-{topic.id}">{t('Save changes')}</Key>
  {/snippet}
</Sheet>

<Sheet title={t('Change how long')} bind:open={changing}>
  <p class="tdl-lead">{t('The check-ins move to fit the new end date. Nothing done so far is lost.')}</p>
  <HorizonPicker bind:horizon {today} problem={hzProblem} />
  {#snippet foot()}
    <Key tone="leaf" big wide onclick={saveChange} disabled={!!hzProblem}>{t('Save how long')}</Key>
  {/snippet}
</Sheet>

<Modal title={t('Delete {title}?', { title: topic.title })} bind:open={confirming}>
  <p>{t('Its check-ins go too, on every device. This can’t be undone.')}</p>
  {#snippet actions()}
    <Button onclick={() => (confirming = false)}>{t('Keep it')}</Button>
    <Button variant="danger-solid" onclick={remove}>{t('Delete topic')}</Button>
  {/snippet}
</Modal>

<style>
  .tdl {
    display: flex;
    flex-direction: column;
  }
  .tdl-top {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .tdl-shelf {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-leaf-deep);
  }
  .tdl-edit,
  .tdl-change,
  .tdl-delete {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    background: var(--color-base-100);
    color: var(--color-base-content);
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .tdl-edit {
    margin-inline-start: auto;
  }
  .tdl-change {
    border: 0;
    padding: 0 0.25rem;
    color: var(--color-link);
    font-weight: 500;
  }
  .tdl-delete {
    color: light-dark(#be123c, #fb7185);
  }
  .tdl-edit:focus-visible,
  .tdl-change:focus-visible,
  .tdl-delete:focus-visible,
  .tdl-link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .tdl-title {
    margin: 0.875rem 0 0;
    font-size: 2rem;
    line-height: 1.1;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--color-heading);
    overflow-wrap: anywhere;
  }
  .tdl-notes {
    margin: 0.625rem 0 0;
    white-space: pre-wrap;
    line-height: 1.55;
    max-width: 65ch;
  }
  .tdl-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    align-self: flex-start;
    max-width: 100%;
    margin-top: 0.5rem;
    min-height: 2.75rem;
    color: var(--color-link);
    font-size: 0.9375rem;
    text-decoration: none;
  }
  .tdl-link span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tdl-keep {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.125rem;
    padding: 0.875rem 1rem;
    border: 1px solid var(--color-base-300);
    border-radius: 18px;
  }
  .tdl-keep-text {
    flex: 1;
    display: grid;
    gap: 0.125rem;
    min-width: 0;
  }
  .tdl-keep-big {
    font-weight: 500;
  }
  .tdl-keep-small {
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
  .tdl-h2 {
    margin: 1.375rem 0 0.75rem;
    font-size: 0.9375rem;
    font-weight: 500;
  }
  .tdl-steps {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tdl-step {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding-bottom: 0.875rem;
  }
  .tdl-step:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 1.25rem;
    bottom: 0;
    width: 2px;
    background: var(--color-leaf-soft);
  }
  .tdl-dot {
    position: relative;
    flex: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1.6px solid var(--color-leaf-line);
    background: var(--color-base-100);
    margin-inline: 1px;
  }
  .tdl-plant .tdl-dot {
    background: var(--color-leaf-soft);
  }
  .tdl-got .tdl-dot,
  .tdl-learned .tdl-dot {
    background: var(--color-leaf);
    border-color: var(--color-leaf-edge);
  }
  .tdl-hazy .tdl-dot {
    background: light-dark(#fef9c3, #332c10);
    border-color: light-dark(#ca8a04, #fde047);
  }
  .tdl-forgot .tdl-dot {
    background: light-dark(#ffe4e6, #3a1a20);
    border-color: light-dark(#e11d48, #fb7185);
  }
  .tdl-next .tdl-dot,
  .tdl-end .tdl-dot {
    border-style: dashed;
    border-color: var(--color-border-strong);
  }
  .tdl-what {
    flex: 1;
    font-size: 0.9375rem;
  }
  .tdl-due .tdl-what {
    font-weight: 500;
    color: var(--color-leaf-deep);
  }
  .tdl-next .tdl-what,
  .tdl-end .tdl-what {
    color: var(--color-muted);
  }
  .tdl-when {
    font-size: 0.875rem;
    color: var(--color-muted);
  }
  .tdl-keys {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
    margin-top: 1rem;
  }
  .tdl-delete {
    margin-inline-start: auto;
  }
  .tdl-form {
    display: flex;
    flex-direction: column;
    gap: 1.125rem;
  }
  .tdl-lead {
    margin: 0 0 1rem;
    color: var(--color-muted);
  }
</style>
