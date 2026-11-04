<!--
  Today: a windowsill of the topics due (pots waiting for water), how many and one key to start;
  one line for what comes up, a line for each topic that reached its end date, and the categories
  as pots on a wooden shelf. With nothing due: a calm "all caught up", or for a new person, the
  first topic to add and then, once it is saved, the offer of a daily reminder.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import {
    changeHorizon,
    finish,
    finishedLines,
    growthOf,
    lastCheckInDay,
    memory,
    shelfOf,
    type Topic,
  } from '#lib/app/store.svelte.ts';
  import {
    addDays,
    backFromBreak,
    daysBetween,
    horizonProblem,
    minutesFor,
    todayList,
    type Day,
    type Horizon,
  } from '#lib/app/schedule/index.ts';
  import { whenNext } from '#lib/app/dates.ts';
  import { say, startAdding } from '#lib/app/ui.svelte.ts';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import HorizonPicker from '#lib/app/ui/HorizonPicker.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import GrowingPot from '#lib/app/ui/GrowingPot.svelte';
  import Plank from '#lib/app/ui/Plank.svelte';
  import ReminderAsk from '#lib/app/ui/ReminderAsk.svelte';
  import Windowsill from '#lib/app/ui/Windowsill.svelte';
  import Sheet from '#lib/app/ui/Sheet.svelte';

  const today = $derived(memory.today);
  const active = $derived(memory.topics.filter((x) => x.state === 'active'));
  const list = $derived(todayList(active, today, memory.settings.dailyCap, memory.settings.retention));
  const next = $derived(list.now[0] ?? null);
  const finished = $derived(memory.loaded ? finishedLines() : []);
  const welcomeBack = $derived(backFromBreak(lastCheckInDay(), today) && list.now.length > 0);
  const tomorrow = $derived(active.filter((x) => x.due !== null && daysBetween(today, x.due) === 1).length);
  const nextDue = $derived(
    active.reduce<Day | null>(
      (a, x) => (x.due && x.due > today && (a === null || x.due < a) ? x.due : a),
      null,
    ),
  );

  /** The sill: today's cards waiting for water, or, on a calm day, the next few to come back. */
  const sillPot = (x: Topic, thirsty: boolean) => ({
    key: x.id,
    shelf: shelfOf(x),
    leaves: growthOf(x).done + 1,
    label: x.title,
    thirsty,
  });
  // The window holds as many pots as fit its width (a little over 4rem each, up to ten); past that, the
  // last place shows "+N more".
  let sillWidth = $state(0);
  const room = $derived(sillWidth ? Math.min(10, Math.max(3, Math.floor((sillWidth - 24) / 68))) : 5);
  const duePots = $derived(
    list.now.slice(0, list.now.length <= room ? room : room - 1).map((x) => sillPot(x, true)),
  );
  const restingPots = $derived(
    active
      .filter((x) => x.due)
      .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))
      .slice(0, 4)
      .map((x) => sillPot(x, false)),
  );

  /** The shelves (and "No shelf" when some topics have none), with what each has due today. */
  const pots = $derived.by(() => {
    const dueNow = new Set(list.now.map((x) => x.id));
    const rows = memory.shelves.map((s) => ({
      shelf: s,
      href: `${resolve('/(app)/topics')}?shelf=${s.id}`,
      due: active.filter((x) => x.shelf === s.id && dueNow.has(x.id)).length,
      count: active.filter((x) => x.shelf === s.id).length,
    }));
    const loose = active.filter((x) => !x.shelf || !memory.shelves.some((s) => s.id === x.shelf));
    if (loose.length && memory.shelves.length)
      rows.push({
        shelf: null as never,
        href: `${resolve('/(app)/topics')}?shelf=none`,
        due: loose.filter((x) => dueNow.has(x.id)).length,
        count: loose.length,
      });
    return rows;
  });

  /** The next days with something to review: up to three, for one line. */
  const comingUp = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, i + 1);
      return { day, count: active.filter((x) => x.due === day).length };
    })
      .filter((d) => d.count > 0)
      .slice(0, 3),
  );
  const dayName = (d: Day) =>
    daysBetween(today, d) === 1
      ? t('Tomorrow')
      : new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(
          new Date(`${d}T12:00:00Z`),
        );
  /** The first topic, just added: Today says so rather than "all caught up". */
  const firstTopic = $derived(
    memory.topics.length === 1 && memory.checkins.length === 0 && !next ? memory.topics[0]! : null,
  );

  // Keep reviewing a topic past its end date
  let extending = $state<Topic | null>(null);
  let extendOpen = $state(false);
  let newHorizon = $state<Horizon>({ kind: 'forever' });
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
    say(t('Reviewing {title} for longer.', { title: extending.title }));
  }
</script>

<svelte:head><title>{t('Today')} · {appName}</title></svelte:head>

<div class="td">
  <h1 class="sr-only">{t('Today')}</h1>

  <section class="td-hero" class:td-hero-calm={!next} aria-label={t('Today')}>
    {#if !memory.loaded}
      <p class="td-sub" aria-live="polite">{t('Loading your topics…')}</p>
    {:else}
      <div class="td-sill" bind:clientWidth={sillWidth}>
        {#if next}
          <Windowsill pots={duePots} more={Math.max(0, list.now.length - duePots.length)} />
        {:else if memory.topics.length === 0}
          <Windowsill seed />
        {:else}
          <Windowsill pots={restingPots} sun />
        {/if}
      </div>

      <div class="td-text">
        {#if next}
          <p class="td-count">
            <span class="td-num">{list.now.length}</span>
            <span class="td-what">
              <span class="td-what-big">{tn(list.now.length, 'topic to review', 'topics to review')}</span>
              <span class="td-sub">
                {welcomeBack
                  ? t('Welcome back. These matter most today.')
                  : tn(minutesFor(list.now.length), 'About 1 minute', 'About {count} minutes')}
              </span>
            </span>
          </p>
          <div class="td-start">
            <Key tone="leaf" big wide onclick={() => goto(resolve('/(app)/review'))}
              ><Glyph name="play" size={18} />{t('Start review')}</Key
            >
          </div>
        {:else if memory.topics.length === 0}
          <h2 class="td-calm">{t('Add your first topic')}</h2>
          <p class="td-lead">
            {t(
              'Type what you studied. We’ll ask you about it tomorrow. You recall it, then check your notes.',
            )}
          </p>
          <div class="td-start">
            <Key tone="leaf" big onclick={() => startAdding()}
              ><Glyph name="plus" size={18} />{t('Add topic')}</Key
            >
          </div>
        {:else if firstTopic}
          <h2 class="td-calm">{t('{title} is saved', { title: firstTopic.title })}</h2>
          <p class="td-lead">
            {nextDue
              ? t('Your first review is {when}.', { when: whenNext(nextDue, today) })
              : t('Add another topic whenever you study.')}
          </p>
        {:else}
          <h2 class="td-calm">{t('All caught up')}</h2>
          <p class="td-lead">
            {tomorrow
              ? tn(tomorrow, '1 topic to review tomorrow.', '{count} topics to review tomorrow.')
              : nextDue
                ? t('Your next review is {when}.', { when: whenNext(nextDue, today) })
                : t('Nothing is waiting. Add what you study next.')}
          </p>
        {/if}
      </div>
    {/if}
  </section>

  {#if memory.loaded && memory.topics.length && memory.settings.reminderAt === null}
    <ReminderAsk />
  {/if}

  {#if list.later.length}
    <p class="td-line">
      {tn(
        list.later.length,
        '1 more waits for the next days, so today stays short.',
        '{count} more wait for the next days, so today stays short.',
      )}
    </p>
  {/if}

  {#if comingUp.length && !firstTopic}
    <p class="td-line">
      {t('Coming up: {days}', {
        days: comingUp.map((d) => `${dayName(d.day)} ${d.count}`).join(' · '),
      })}
    </p>
  {/if}

  {#each finished as topic (topic.id)}
    <div class="td-end">
      <p>{t('{title} reached its end date.', { title: topic.title })}</p>
      <div class="td-end-keys">
        <button type="button" onclick={() => extend(topic)}>{t('Keep reviewing')}</button>
        <button type="button" onclick={() => finish(topic.id)}>{t('Finish')}</button>
      </div>
    </div>
  {/each}

  {#if pots.length}
    <section class="td-rack" aria-label={t('Your categories')}>
      <div class="td-board"><Plank /></div>
      <ul class="td-pots">
        {#each pots as p (p.shelf?.id ?? 'none')}
          <li>
            <a href={p.href}>
              <span class="td-pot-art"
                ><GrowingPot shelf={p.shelf} leaves={Math.min(6, p.count)} size={56} /></span
              >
              <span class="td-pot-name">{p.shelf?.name ?? t('No category')}</span>
              <span class="td-pot-due">{t('{count} to review', { count: p.due })}</span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<Sheet title={t('Keep reviewing')} bind:open={extendOpen}>
  {#if extending}
    <p class="ex-lead">{t('How much longer do you need {title}?', { title: extending.title })}</p>
    <HorizonPicker bind:horizon={newHorizon} {today} problem={extendProblem} />
  {/if}
  {#snippet foot()}
    <Key tone="leaf" big wide onclick={saveExtend} disabled={!!extendProblem}>{t('Save')}</Key>
  {/snippet}
</Sheet>

<style>
  .td {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
    max-width: 44rem;
    margin-inline: auto;
  }
  /* The hero: the windowsill, then the words and the key. */
  .td-hero {
    display: grid;
    gap: 1.25rem;
    padding: 1rem 1rem 1.5rem;
    border: 1px solid var(--color-base-300);
    border-radius: 26px;
  }
  .td-text {
    display: grid;
    gap: 0.75rem;
    align-content: center;
    padding: 0 0.25rem;
  }
  .td-hero-calm .td-text {
    justify-items: center;
    text-align: center;
  }
  .td-count {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    margin: 0;
  }
  .td-num {
    font-size: 4.5rem;
    line-height: 0.8;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--color-leaf-deep);
  }
  .td-what {
    display: grid;
    gap: 0.125rem;
    padding-bottom: 0.125rem;
  }
  .td-what-big {
    font-size: 1.1875rem;
    font-weight: 500;
    color: var(--color-heading);
  }
  .td-sub {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.9375rem;
  }
  .td-lead {
    margin: 0;
    max-width: 38ch;
    color: var(--color-muted);
    line-height: 1.5;
  }
  .td-calm {
    margin: 0;
    font-size: 1.625rem;
    line-height: 1.2;
    font-weight: 600;
    color: var(--color-heading);
  }
  .td-start {
    margin-top: 0.75rem;
  }
  .td-line {
    margin: 0 0.25rem;
    color: var(--color-muted);
    font-size: 0.9375rem;
  }
  .td-end {
    display: grid;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    border-radius: 16px;
    background: var(--color-base-200);
  }
  .td-end p {
    margin: 0;
  }
  .td-end-keys {
    display: flex;
    gap: 1rem;
  }
  .td-end-keys button {
    min-height: 2.25rem;
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-primary);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .td-end-keys button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }

  /* The categories on a wooden shelf: the board sits at the pots' feet (0.5rem + a 56px pot's
     foot), the names below it; the pots scroll along it on a phone. */
  .td-rack {
    position: relative;
  }
  .td-board {
    position: absolute;
    top: calc(0.5rem + 66px);
    left: 0;
    right: 0;
  }
  .td-board :global(.pk) {
    --pk-inset: 0.25rem;
  }
  .td-pots {
    position: relative;
    list-style: none;
    margin: 0;
    padding: 0 1.5rem 0.25rem;
    display: flex;
    justify-content: safe center;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .td-pot-art {
    display: block;
    height: 73px;
    margin-bottom: 1.125rem;
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .td-pots a:hover .td-pot-art {
    transform: translateY(-3px);
  }
  @media (prefers-reduced-motion: reduce) {
    .td-pot-art {
      transition: none;
    }
    .td-pots a:hover .td-pot-art {
      transform: none;
    }
  }
  .td-pots a {
    display: grid;
    justify-items: center;
    gap: 0.0625rem;
    width: 5.25rem;
    padding: 0.5rem 0.25rem 0.25rem;
    border-radius: 16px;
    text-decoration: none;
    color: var(--color-heading);
  }
  .td-pots a:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .td-pot-name {
    max-width: 100%;
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.2;
    text-align: center;
    overflow-wrap: anywhere;
  }
  .td-pot-due {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .ex-lead {
    margin: 0 0 1rem;
    color: var(--color-muted);
  }

  /* With room, the key sits beside the count. */
  .td-hero {
    container: today / inline-size;
  }
  @container today (min-width: 34rem) {
    .td-text:has(.td-count) {
      grid-template-columns: minmax(0, 1fr) 15rem;
      column-gap: 1.5rem;
      align-items: center;
    }
    .td-text .td-start {
      margin-top: 0;
    }
    .td-num {
      font-size: 5rem;
    }
    .td-what-big {
      font-size: 1.375rem;
    }
  }
</style>
