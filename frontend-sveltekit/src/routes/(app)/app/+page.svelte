<!--
  Today: a windowsill of the cards due (pots waiting for water), how many and one key to start;
  the shelves as pots on a plank; what comes up this week; and topics that reached their finish line. With nothing due:
  a calm "all caught up", or for a new person, an invitation to add what they studied.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { auth } from '#lib/session.svelte.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import {
    changeHorizon,
    checkinsOf,
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
  import { lengthOf, longDay, whenNext } from '#lib/app/dates.ts';
  import { say, startAdding } from '#lib/app/ui.svelte.ts';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import HorizonPicker from '#lib/app/ui/HorizonPicker.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import GrowingPot from '#lib/app/ui/GrowingPot.svelte';
  import Plank from '#lib/app/ui/Plank.svelte';
  import Windowsill from '#lib/app/ui/Windowsill.svelte';
  import ShelfMark from '#lib/app/ui/ShelfMark.svelte';
  import Sheet from '#lib/app/ui/Sheet.svelte';
  import Track from '#lib/app/ui/Track.svelte';

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
  const duePots = $derived(list.now.slice(0, 5).map((x) => sillPot(x, true)));
  const restingPots = $derived(
    active
      .filter((x) => x.due)
      .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))
      .slice(0, 4)
      .map((x) => sillPot(x, false)),
  );

  const greeting = $derived.by(() => {
    const hour = new Date().getHours();
    const name = auth.user?.name?.trim().split(/\s+/)[0];
    const part = hour < 12 ? t('Good morning') : hour < 18 ? t('Good afternoon') : t('Good evening');
    return name ? t('{greeting}, {name}', { greeting: part, name }) : part;
  });

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

  /** The next seven days: how many come back each day, and from which shelves. */
  const week = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, i + 1);
      const topics = active.filter((x) => x.due === day);
      const shelves = [...new Set(topics.map((x) => x.shelf))].slice(0, 4);
      return { day, count: topics.length, shelves };
    }),
  );
  const weekTotal = $derived(week.reduce((a, d) => a + d.count, 0));
  const dayName = (d: Day) =>
    daysBetween(today, d) === 1
      ? t('Tomorrow')
      : new Intl.DateTimeFormat(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        }).format(new Date(`${d}T12:00:00Z`));

  // Keep it longer
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
    say(t('Keeping {title} longer.', { title: extending.title }));
  }

  const keptFor = (topic: Topic) => lengthOf(daysBetween(topic.studiedOn, topic.endOn ?? today));
  const recalled = (topic: Topic) => checkinsOf(topic.id).filter((c) => c.rating !== 'forgot').length;
</script>

<svelte:head><title>{t('Today')} · {appName}</title></svelte:head>

<div class="td">
  <header class="td-head">
    <h1>{greeting}</h1>
    <p>{longDay(today)}</p>
  </header>

  <div class="td-grid">
    <div class="td-main">
      <section class="td-hero" class:td-hero-due={!!next} class:td-hero-calm={!next} aria-label={t('Today')}>
        {#if !memory.loaded}
          <p class="td-sub" aria-live="polite">{t('Loading your topics…')}</p>
        {:else}
          <div class="td-sill">
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
                  <span class="td-what-big">{tn(list.now.length, 'card to refresh', 'cards to refresh')}</span
                  >
                  <span class="td-sub">
                    {welcomeBack
                      ? t('Welcome back. These matter most today.')
                      : tn(minutesFor(list.now.length), 'about 1 minute', 'about {count} minutes')}
                  </span>
                </span>
              </p>
              <p class="td-lead">
                {t('Next up: {title}. Recall what you can, then check your notes.', { title: next.title })}
              </p>
              <div class="td-start">
                <Key tone="leaf" big wide onclick={() => goto(resolve('/(app)/review'))}
                  ><Glyph name="play" size={18} />{t('Start refreshing')}</Key
                >
              </div>
            {:else if memory.topics.length === 0}
              <h2 class="td-calm">{t('Studied something today?')}</h2>
              <p class="td-lead">
                {t(
                  'Plant it here, choose how long you need it, and Remember brings it back on the right days.',
                )}
              </p>
              <div class="td-start">
                <Key tone="leaf" big onclick={() => startAdding()}
                  ><Glyph name="plus" size={18} />{t('Add what you studied')}</Key
                >
              </div>
            {:else}
              <h2 class="td-calm">{t('All caught up')}</h2>
              <p class="td-lead">
                {tomorrow
                  ? tn(tomorrow, '1 card comes back tomorrow.', '{count} cards come back tomorrow.')
                  : nextDue
                    ? t('The next one comes back {when}.', { when: whenNext(nextDue, today) })
                    : t('Nothing is waiting. Add what you study next.')}
              </p>
              <div class="td-start">
                <Key onclick={() => startAdding()}
                  ><Glyph name="plus" size={18} />{t('Add what you studied')}</Key
                >
              </div>
            {/if}
          </div>
        {/if}
      </section>

      {#if list.later.length}
        <p class="td-later">
          {tn(
            list.later.length,
            '1 more waits for the next days, so today stays short.',
            '{count} more wait for the next days, so today stays short.',
          )}
        </p>
      {/if}

      {#if finished.length}
        <section class="td-sec" aria-labelledby="finish-title">
          <h2 id="finish-title" class="td-h2">
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
                  { length: keptFor(topic) },
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
                <Key tone="leaf" leaves={false} onclick={() => finish(topic.id)}>{t('Done with it')}</Key>
                <Key onclick={() => extend(topic)}>{t('Keep it longer')}</Key>
              </div>
            </div>
          {/each}
        </section>
      {/if}

      {#if pots.length}
        <section class="td-sec" aria-labelledby="shelves-title">
          <div class="td-sec-head">
            <h2 id="shelves-title" class="td-h2">{t('Your categories')}</h2>
            <a href={resolve('/(app)/topics')}>{t('See all topics')}</a>
          </div>
          <div class="td-rack">
            <div class="td-board"><Plank /></div>
            <ul class="td-pots">
              {#each pots as p (p.shelf?.id ?? 'none')}
                <li>
                  <a href={p.href}>
                    <span class="td-pot-art"
                      ><GrowingPot shelf={p.shelf} leaves={Math.min(6, p.count)} size={56} /></span
                    >
                    <span class="td-pot-name">{p.shelf?.name ?? t('No category')}</span>
                    <span class="td-pot-due">
                      {p.due ? tn(p.due, '1 due', '{count} due') : p.count ? t('Caught up') : t('Empty')}
                    </span>
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        </section>
      {/if}
    </div>

    {#if memory.loaded && memory.topics.length}
      <aside class="td-week" aria-labelledby="week-title">
        <h2 id="week-title" class="td-h2">{t('Coming up')}</h2>
        <p class="td-sub">
          {weekTotal
            ? tn(weekTotal, '1 card over the next week', '{count} cards over the next week')
            : t('Nothing over the next week')}
        </p>
        <ul class="td-days">
          {#each week as d (d.day)}
            <li>
              <span class="td-day">{dayName(d.day)}</span>
              <span class="td-marks">
                {#each d.shelves as s (s ?? 'none')}
                  <ShelfMark shelf={memory.shelves.find((x) => x.id === s) ?? null} size={24} />
                {/each}
              </span>
              <span class="td-n">{d.count ? tn(d.count, '1 card', '{count} cards') : t('Rest')}</span>
            </li>
          {/each}
        </ul>
        {#if memory.settings.reminderAt}
          <p class="td-remind">
            <Glyph name="bell" />
            <span
              >{t('A reminder every day at {time}, only when cards are due.', {
                time: memory.settings.reminderAt,
              })}</span
            >
          </p>
        {:else}
          <a class="td-remind" href={resolve('/(app)/settings')}>
            <Glyph name="bell" />
            <span>{t('Get a reminder on days with cards to refresh')}</span>
          </a>
        {/if}
      </aside>
    {/if}
  </div>
</div>

<Sheet title={t('Keep it longer')} bind:open={extendOpen}>
  {#if extending}
    <p class="ex-lead">{t('How long do you need {title} now?', { title: extending.title })}</p>
    <HorizonPicker bind:horizon={newHorizon} {today} problem={extendProblem} />
  {/if}
  {#snippet foot()}
    <Key tone="leaf" big wide onclick={saveExtend} disabled={!!extendProblem}>{t('Keep it')}</Key>
  {/snippet}
</Sheet>

<style>
  /* The greeting and the day read as one heading: the day sits right under it. */
  .td-head {
    display: grid;
    gap: 0.125rem;
    margin: 0.25rem 0 1rem;
  }
  .td-head h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-heading);
  }
  .td-head p {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.9375rem;
  }
  .td-grid {
    display: grid;
    /* One column no wider than the screen: the categories row scrolls inside it. */
    grid-template-columns: minmax(0, 1fr);
    gap: 1.75rem;
  }

  /* The hero: the windowsill and the words beside it (stacked on phones, sill first). */
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
  .td-later {
    margin: 0.875rem 0.25rem 0;
    color: var(--color-muted);
    font-size: 0.9375rem;
  }

  .td-sec {
    margin-top: 1.75rem;
  }
  .td-sec-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }
  .td-sec-head a {
    font-size: 0.875rem;
    text-decoration: none;
  }
  .td-h2 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-heading);
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .td-pot-due {
    font-size: 0.75rem;
    color: var(--color-muted);
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

  .td-week {
    border: 1px solid var(--color-base-300);
    border-radius: 24px;
    padding: 1.25rem 1.375rem;
    align-self: start;
  }
  .td-week .td-h2 {
    margin: 0;
  }
  .td-days {
    list-style: none;
    margin: 0.5rem 0 0;
    padding: 0;
  }
  .td-days li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 2.75rem;
    border-bottom: 1px solid var(--color-base-300);
  }
  .td-day {
    flex: 1;
    font-size: 0.9375rem;
  }
  .td-marks {
    display: flex;
    gap: 0.25rem;
  }
  .td-n {
    min-width: 4.25rem;
    text-align: end;
    font-size: 0.875rem;
    color: var(--color-muted);
  }
  .td-remind {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1rem 0 0;
    padding: 0.875rem 1rem;
    border-radius: 16px;
    background: var(--color-leaf-tab);
    color: var(--color-leaf-deep);
    font-size: 0.875rem;
    text-decoration: none;
  }
  .ex-lead {
    margin: 0 0 1rem;
    color: var(--color-muted);
  }

  @media (min-width: 40rem) {
    .td-head h1 {
      font-size: 2rem;
    }
    .td-head p {
      font-size: 1rem;
    }
  }

  @media (min-width: 64rem) {
    .td-grid:has(.td-week) {
      grid-template-columns: minmax(0, 1fr) 22rem;
      gap: 1.75rem;
    }
    .td-grid:not(:has(.td-week)) {
      max-width: 52rem;
    }
    .td-pots {
      scrollbar-width: thin;
    }
  }

  /* The hero puts the sill beside the words only when its own column has room for both (with
     the week beside it, a laptop's column doesn't). */
  .td-main {
    container: today / inline-size;
  }
  @container today (min-width: 46rem) {
    .td-hero {
      grid-template-columns: minmax(0, 1fr) minmax(17rem, 24rem);
      gap: 2rem;
      padding: 1.5rem 1.5rem 1.5rem 2rem;
      min-height: 17rem;
    }
    .td-sill {
      order: 2;
      align-self: end;
    }
    .td-hero-calm .td-text {
      justify-items: start;
      text-align: start;
    }
    .td-num {
      font-size: 6rem;
    }
    .td-what-big {
      font-size: 1.375rem;
    }
    .td-start {
      max-width: 17rem;
    }
  }
</style>
