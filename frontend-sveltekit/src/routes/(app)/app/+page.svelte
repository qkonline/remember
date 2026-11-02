<!--
  Today: the one list a day. What to refresh, the most likely to be forgotten first, up to the
  daily cap; topics that reached their finish line; and a raised key to add what was studied.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import {
    changeHorizon,
    checkinsOf,
    finish,
    finishedLines,
    lastCheckInDay,
    memory,
    undoCheckIn,
    watch,
    type CheckedIn,
    type Topic,
  } from '#lib/app/store.svelte.ts';
  import {
    backFromBreak,
    DEFAULT_HORIZON,
    daysBetween,
    horizonProblem,
    minutesFor,
    todayList,
    type Day,
    type Horizon,
    type RatingName,
  } from '#lib/app/schedule/index.ts';
  import { formatDay, lengthOf, longDay, whenNext } from '#lib/app/dates.ts';
  import AddSheet from '#lib/app/ui/AddSheet.svelte';
  import RecallSheet from '#lib/app/ui/RecallSheet.svelte';
  import TopicRow from '#lib/app/ui/TopicRow.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import Sheet from '#lib/app/ui/Sheet.svelte';
  import UndoBar from '#lib/app/ui/UndoBar.svelte';
  import HorizonPicker from '#lib/app/ui/HorizonPicker.svelte';
  import Track from '#lib/app/ui/Track.svelte';

  onMount(() => watch());

  const today = $derived(memory.today);
  const active = $derived(memory.topics.filter((t) => t.state === 'active'));
  const list = $derived(todayList(active, today, memory.settings.dailyCap, memory.settings.retention));
  const finished = $derived(memory.loaded ? finishedLines() : []);
  const welcomeBack = $derived(backFromBreak(lastCheckInDay(), today) && list.now.length > 0);
  const tomorrow = $derived(
    active.filter((t) => t.due !== null && t.due > today && daysBetween(today, t.due) === 1).length,
  );
  const nextDue = $derived(
    active.reduce<Day | null>(
      (a, t) => (t.due && t.due > today && (a === null || t.due < a) ? t.due : a),
      null,
    ),
  );

  let adding = $state(false);
  let recalling = $state(false);
  let current = $state<Topic | null>(null);
  let note = $state<{ message: string; undo?: () => void } | null>(null);

  function open(topic: Topic) {
    current = topic;
    recalling = true;
  }

  function rated(r: CheckedIn, rating: RatingName) {
    const next = r.next ? whenNext(r.next, today) : null;
    const message =
      rating === 'forgot'
        ? t('Coming back {when}.', { when: next ?? t('soon') })
        : next
          ? t('Next check-in {when}.', { when: next })
          : t('That was the last check-in.');
    note = { message, undo: () => void undoCheckIn(r) };
  }

  function added(r: { title: string; plan: Day[]; endOn: Day | null }) {
    const first = r.plan[0];
    if (!first) {
      note = { message: t('Added {title}.', { title: r.title }) };
      return;
    }
    const firstWhen = whenNext(first, today);
    note = {
      message: r.endOn
        ? tn(
            r.plan.length,
            'First check-in {when}, the only one before {end}.',
            'First check-in {when}, about {count} check-ins until {end}.',
            {
              when: firstWhen,
              end: formatDay(r.endOn, today),
            },
          )
        : t('First check-in {when}, then less and less often.', { when: firstWhen }),
    };
  }

  // Keep it longer
  let extending = $state<Topic | null>(null);
  let extendOpen = $state(false);
  let newHorizon = $state<Horizon>(DEFAULT_HORIZON);
  const extendProblem = $derived(extending ? horizonProblem(extending.studiedOn, newHorizon, today) : null);

  function extend(topic: Topic) {
    extending = topic;
    newHorizon = { kind: 'forever' };
    extendOpen = true;
  }

  async function saveExtend() {
    if (!extending || extendProblem) return;
    await changeHorizon(extending.id, newHorizon);
    extendOpen = false;
    note = { message: t('Keeping {title} longer.', { title: extending.title }) };
  }

  const keptFor = (topic: Topic) => lengthOf(daysBetween(topic.studiedOn, topic.endOn ?? today));
  const recalled = (topic: Topic) => checkinsOf(topic.id).filter((c) => c.rating !== 'forgot').length;
</script>

<svelte:head><title>{t('Today')} · {appName}</title></svelte:head>

<div class="today">
  <header class="td-head">
    <div class="td-top">
      <p class="td-date">{longDay(today)}</p>
      <a class="td-settings" href={resolve('/(app)/settings')}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"
          ><circle cx="8" cy="8" r="2.25" fill="none" stroke="currentColor" stroke-width="1.6" /><path
            d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          /></svg
        >{t('Settings')}</a
      >
    </div>
    {#if !memory.loaded}
      <p class="td-loading" aria-live="polite">{t('Loading your topics…')}</p>
    {:else if list.now.length}
      <h1 class="td-count">
        <span class="td-num">{list.now.length}</span>
        <span class="td-what">{tn(list.now.length, 'to refresh', 'to refresh')}</span>
      </h1>
      <p class="td-sub">
        {welcomeBack
          ? tn(
              list.now.length,
              'Welcome back. This is the one that matters most today.',
              'Welcome back. These are the {count} that matter most today.',
            )
          : tn(minutesFor(list.now.length), 'About 1 minute.', 'About {count} minutes.')}
      </p>
    {:else if memory.topics.length === 0}
      <h1 class="td-empty-title">{t('Studied something today?')}</h1>
      <p class="td-sub">
        {t('Add it, choose how long you need it, and Remember brings it back on the right days.')}
      </p>
    {:else}
      <h1 class="td-empty-title">{t('All done for today.')}</h1>
      <p class="td-sub">
        {tomorrow
          ? tn(tomorrow, '1 topic comes back tomorrow.', '{count} topics come back tomorrow.')
          : nextDue
            ? t('The next one comes back {when}.', { when: whenNext(nextDue, today) })
            : t('Nothing is waiting. Add what you study next.')}
      </p>
    {/if}
  </header>

  {#if list.now.length}
    <ul class="td-list" aria-label={t('To refresh today')}>
      {#each list.now as topic (topic.id)}
        <li><TopicRow {topic} onclick={() => open(topic)} /></li>
      {/each}
    </ul>
    {#if list.later.length}
      <p class="td-later">
        {tn(
          list.later.length,
          '1 more waits for the next days, so today stays short.',
          '{count} more wait for the next days, so today stays short.',
        )}
      </p>
    {/if}
  {/if}

  {#if finished.length}
    <section class="td-finish" aria-labelledby="finish-title">
      <h2 id="finish-title">
        {tn(finished.length, 'Reached its finish line', 'Reached their finish lines')}
      </h2>
      {#each finished as topic (topic.id)}
        <div class="fl">
          <p class="fl-title">{topic.title}</p>
          <p class="fl-said">
            {tn(
              recalled(topic),
              'You kept it for {length}, recalled at 1 check-in.',
              'You kept it for {length}, recalled at {count} check-ins.',
              {
                length: keptFor(topic),
              },
            )}
          </p>
          <Track
            start={topic.studiedOn}
            end={topic.endOn}
            done={checkinsOf(topic.id).map((c) => c.day)}
            {today}
            finished
          />
          <div class="fl-keys">
            <Key tone="go" onclick={() => finish(topic.id)}>{t('Done with it')}</Key>
            <Key onclick={() => extend(topic)}>{t('Keep it longer')}</Key>
          </div>
        </div>
      {/each}
    </section>
  {/if}
</div>

<div class="td-add">
  <Key tone="primary" onclick={() => (adding = true)} aria-label={t('Add what you studied')}>
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"
      ><path d="M9 3v12M3 9h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg
    >
    <span>{t('Add')}</span>
  </Key>
</div>

<AddSheet bind:open={adding} onadded={added} />
<RecallSheet topic={current} bind:open={recalling} onrated={rated} />

<Sheet title={t('Keep it longer')} bind:open={extendOpen}>
  {#if extending}
    <p class="ex-lead">{t('How long do you need {title} now?', { title: extending.title })}</p>
    <HorizonPicker bind:horizon={newHorizon} {today} problem={extendProblem} />
  {/if}
  {#snippet foot()}
    <Key tone="primary" wide onclick={saveExtend} disabled={!!extendProblem}>{t('Keep it')}</Key>
  {/snippet}
</Sheet>

{#if note}
  {#key note}
    <UndoBar message={note.message} onundo={note.undo} ondone={() => (note = null)} />
  {/key}
{/if}

<style>
  .today {
    max-width: 40rem;
    padding-bottom: 6rem;
  }
  .td-head {
    margin-bottom: 1.5rem;
  }
  .td-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .td-settings {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding-inline: 0.25rem;
    color: var(--color-muted);
    font-weight: 500;
    font-size: 0.9375rem;
    text-decoration: none;
  }
  .td-settings:hover {
    color: var(--color-primary);
  }
  .td-settings:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
  .td-date {
    margin: 0;
    color: var(--color-muted);
    font-weight: 500;
  }
  .td-count {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    margin: 0;
    font-weight: 600;
    color: var(--color-heading);
  }
  .td-num {
    font-family: var(--font-number);
    font-size: 4rem;
    line-height: 0.9;
    letter-spacing: -0.03em;
  }
  .td-what {
    font-size: 1.375rem;
  }
  .td-empty-title {
    margin: 0;
    font-size: 1.75rem;
    line-height: 1.2;
    font-weight: 600;
    color: var(--color-heading);
  }
  .td-sub,
  .td-loading {
    margin: 0.5rem 0 0;
    color: var(--color-muted);
    max-width: 44ch;
  }
  .td-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--color-base-300);
  }
  .td-later {
    margin-top: 1rem;
    color: var(--color-muted);
    font-size: 0.9375rem;
  }
  .td-finish {
    margin-top: 2.5rem;
  }
  .td-finish h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.75rem;
  }
  .fl {
    padding: 1rem 0 1.25rem;
    border-top: 1px solid var(--color-base-300);
  }
  .fl-title {
    margin: 0;
    font-weight: 600;
    font-size: 1.0625rem;
  }
  .fl-said {
    margin: 0.25rem 0 0.875rem;
    color: var(--color-muted);
  }
  .fl-keys {
    display: flex;
    gap: 0.625rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }
  .td-add {
    position: fixed;
    inset-inline-end: max(1rem, calc((100vw - var(--page-width)) / 2));
    bottom: calc(1.25rem + env(safe-area-inset-bottom));
    z-index: 5;
  }
  .ex-lead {
    margin: 0 0 1rem;
    color: var(--color-muted);
  }
</style>
