<!--
  Refreshing, one card at a time and nothing else on screen: the topic and a prompt to recall it
  first, the notes only when asked, then one honest tap (Forgot, Hazy, Got it; keys 1, 2, 3).
  Forgot opens the notes to look again before the next card. The last card leads to "All caught
  up". `?id=…` checks one topic now (from its page); otherwise today's list, as it was on opening.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { appName } from '#lib/config.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import { checkIn, memory, undoCheckIn, type CheckedIn } from '#lib/app/store.svelte.ts';
  import { daysBetween, minutesFor, todayList, type RatingName } from '#lib/app/schedule/index.ts';
  import { whenNext } from '#lib/app/dates.ts';
  import { currentRun } from '#lib/app/growth.ts';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import TopicCard from '#lib/app/ui/TopicCard.svelte';
  import { say } from '#lib/app/ui.svelte.ts';

  const only = $derived(page.url.searchParams.get('id'));
  const today = $derived(memory.today);

  /** The cards of this round, fixed when it starts: rating one doesn't reshuffle the rest. */
  let queue = $state<string[] | null>(null);
  $effect(() => {
    if (queue !== null || !memory.loaded) return;
    queue = only
      ? memory.topics.some((x) => x.id === only)
        ? [only]
        : []
      : todayList(
          memory.topics.filter((x) => x.state === 'active'),
          memory.today,
          memory.settings.dailyCap,
          memory.settings.retention,
        ).now.map((x) => x.id);
  });

  let index = $state(0);
  let reveal = $state(false);
  let restudy = $state<CheckedIn | null>(null);
  let busy = $state(false);
  let results = $state<{ result: CheckedIn; rating: RatingName }[]>([]);
  let last = $state<{ result: CheckedIn; rating: RatingName } | null>(null);

  const total = $derived(queue?.length ?? 0);
  const topic = $derived(
    queue && index < queue.length ? (memory.topics.find((x) => x.id === queue![index]) ?? null) : null,
  );
  const done = $derived(queue !== null && index >= total);
  const hasNotes = $derived(!!topic && !!(topic.notes.trim() || topic.link));
  const leftMinutes = $derived(minutesFor(Math.max(1, total - index)));

  const counts = $derived({
    got: results.filter((r) => r.rating === 'got').length,
    hazy: results.filter((r) => r.rating === 'hazy').length,
    forgot: results.filter((r) => r.rating === 'forgot').length,
  });
  const tomorrow = $derived(
    memory.topics.filter((x) => x.state === 'active' && x.due !== null && daysBetween(today, x.due) === 1)
      .length,
  );
  const run = $derived(currentRun(memory.checkins, today));

  function advance() {
    index += 1;
    reveal = false;
    restudy = null;
  }

  async function rate(rating: RatingName) {
    if (!topic || busy || restudy) return;
    busy = true;
    try {
      const r = await checkIn(topic.id, rating);
      if (!r) return;
      results = [...results, { result: r, rating }];
      last = { result: r, rating };
      say(
        rating === 'forgot'
          ? t('Coming back {when}.', { when: r.next ? whenNext(r.next, today) : t('soon') })
          : r.next
            ? t('Next check-in {when}.', { when: whenNext(r.next, today) })
            : t('That was the last check-in.'),
        () => void undo(),
      );
      if (rating === 'forgot' && hasNotes) {
        restudy = r;
        reveal = true;
      } else advance();
    } finally {
      busy = false;
    }
  }

  async function undo() {
    if (!last) return;
    const { result } = last;
    last = null;
    await undoCheckIn(result);
    results = results.filter((r) => r.result.checkinId !== result.checkinId);
    const back = queue?.indexOf(result.topicId) ?? -1;
    if (back >= 0) index = back;
    reveal = false;
    restudy = null;
  }

  const stop = () => goto(resolve('/(app)/app'));

  onMount(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      if (done) return;
      if (restudy && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        advance();
      } else if (e.key === '1') void rate('forgot');
      else if (e.key === '2') void rate('hazy');
      else if (e.key === '3') void rate('got');
      else if (e.key === ' ' && hasNotes && !(target instanceof HTMLButtonElement)) {
        e.preventDefault();
        reveal = !reveal;
      } else if (e.key === 'Escape') void stop();
    };
    addEventListener('keydown', keys);
    return () => removeEventListener('keydown', keys);
  });
</script>

<svelte:head><title>{done ? t('All caught up') : t('Refreshing')} · {appName}</title></svelte:head>

<div class="rv">
  {#if !memory.loaded || queue === null}
    <p class="rv-quiet" aria-live="polite">{t('Loading your topics…')}</p>
  {:else if done}
    <section class="rv-done" aria-labelledby="done-title">
      <svg class="rv-grown" width="220" height="230" viewBox="0 0 240 250" aria-hidden="true">
        <circle cx="120" cy="120" r="104" class="rv-sun" />
        <path d="M120 200V80" class="rv-stem" />
        <path d="M120 104c0-30 20-48 54-48 0 30-20 48-54 48z" class="rv-leaf-a" />
        <path d="M120 134c0-24-17-40-44-40 0 24 17 40 44 40z" class="rv-leaf-b" />
        <path d="M120 82c0-16 10-26 26-26" class="rv-stem" fill="none" />
        <circle cx="146" cy="56" r="9" class="rv-bud" />
        <path d="M88 200h64l-8 34H96z" class="rv-pot" />
      </svg>
      <h1 id="done-title">{total ? t('All caught up') : t('Nothing to refresh right now')}</h1>
      {#if results.length}
        <p class="rv-sub">
          {tn(results.length, '1 refreshed', '{count} refreshed')}:
          {[
            counts.got ? tn(counts.got, '1 got it', '{count} got it') : '',
            counts.hazy ? tn(counts.hazy, '1 hazy', '{count} hazy') : '',
            counts.forgot ? tn(counts.forgot, '1 forgot', '{count} forgot') : '',
          ]
            .filter(Boolean)
            .join(', ')}.
        </p>
        {#if counts.hazy || counts.forgot}
          <p class="rv-sub">{t('Hazy and forgotten ones come back sooner.')}</p>
        {/if}
      {/if}
      <div class="rv-facts">
        <span
          >{tomorrow
            ? tn(tomorrow, 'Tomorrow: 1 card', 'Tomorrow: {count} cards')
            : t('Nothing tomorrow')}</span
        >
        {#if run > 1}<span>{tn(run, 'Run: 1 day', 'Run: {count} days')}</span>{/if}
      </div>
      <div class="rv-done-key">
        <Key tone="leaf" big wide onclick={stop}>{t('Back to Today')}</Key>
      </div>
    </section>
  {:else}
    <header class="rv-top">
      <button type="button" class="rv-stop" onclick={stop}
        ><Glyph name="close" size={18} /><span>{t('Stop for now')}</span></button
      >
      <div class="rv-progress" role="img" aria-label={t('Card {n} of {total}', { n: index + 1, total })}>
        {#each Array.from({ length: total }, (_v, i) => i) as i (i)}<span class:rv-on={i <= index}
          ></span>{/each}
      </div>
      <span class="rv-of"
        >{t('{n} of {total}', { n: index + 1, total })}<span class="rv-min"
          >, {tn(leftMinutes, 'about 1 min', 'about {count} min')}</span
        ></span
      >
    </header>

    {#if topic}
      <div class="rv-stage">
        <TopicCard {topic} big>
          {#if restudy}
            <p class="rv-prompt">
              {restudy.next
                ? t('Have another look now. It comes back {when}.', { when: whenNext(restudy.next, today) })
                : t('Have another look now.')}
            </p>
          {:else}
            <p class="rv-prompt">{t('Take 30 seconds. What do you remember about it?')}</p>
          {/if}
          {#if hasNotes}
            {#if reveal}
              <div class="rv-notes">
                <p class="rv-notes-head">
                  {t('Your notes')}<span class="rv-hint">{t('Space to hide')}</span>
                </p>
                {#if topic.notes.trim()}<p class="rv-text">{topic.notes}</p>{/if}
                {#if topic.link}
                  <a class="rv-link" href={topic.link} target="_blank" rel="noopener noreferrer"
                    ><Glyph name="link" size={16} />{t('Open your link')}</a
                  >
                {/if}
              </div>
            {:else}
              <button type="button" class="rv-show" onclick={() => (reveal = true)}
                ><Glyph name="down" size={16} />{t('Show my notes')}</button
              >
            {/if}
          {/if}
        </TopicCard>
      </div>

      <div class="rv-keys">
        {#if restudy}
          <Key tone="leaf" big wide onclick={advance}>{index + 1 < total ? t('Next card') : t('Finish')}</Key>
        {:else}
          <p class="rv-ask" id="ask">{t('How did it go?')}</p>
          <div class="rv-rate" role="group" aria-labelledby="ask">
            <Key tone="forgot" big onclick={() => rate('forgot')} disabled={busy}
              ><Glyph name="cross" size={18} />{t('Forgot')}<kbd>1</kbd></Key
            >
            <Key tone="hazy" big onclick={() => rate('hazy')} disabled={busy}
              ><Glyph name="wave" size={18} />{t('Hazy')}<kbd>2</kbd></Key
            >
            <Key tone="leaf" big onclick={() => rate('got')} disabled={busy}
              ><Glyph name="check" size={18} />{t('Got it')}<kbd>3</kbd></Key
            >
          </div>
          <p class="rv-note">{t('Hazy still counts. It just comes back a little sooner.')}</p>
        {/if}
      </div>
    {:else}
      <p class="rv-quiet">{t('This topic isn’t here any more.')}</p>
      <div class="rv-keys"><Key big wide onclick={advance}>{t('Next card')}</Key></div>
    {/if}
  {/if}
</div>

<style>
  .rv {
    min-height: 100dvh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding: calc(1rem + env(safe-area-inset-top)) 1.25rem calc(1.5rem + env(safe-area-inset-bottom));
    max-width: 44rem;
    margin: 0 auto;
  }
  .rv-quiet {
    margin: auto;
    color: var(--color-muted);
  }
  .rv-top {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }
  .rv-stop {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0 0.75rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    background: var(--color-base-100);
    color: var(--color-base-content);
    font: inherit;
    font-size: 0.9375rem;
    cursor: pointer;
  }
  .rv-stop span {
    display: none;
  }
  .rv-stop:focus-visible,
  .rv-show:focus-visible,
  .rv-link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .rv-progress {
    flex: 1;
    display: flex;
    gap: 0.375rem;
  }
  .rv-progress span {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--color-base-300);
  }
  .rv-progress .rv-on {
    background: var(--color-leaf);
  }
  .rv-of {
    color: var(--color-muted);
    font-size: 0.875rem;
    white-space: nowrap;
  }
  .rv-min {
    display: none;
  }
  .rv-stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin: 1.5rem 0 1rem;
  }
  .rv-stage :global(.tk-card) {
    min-height: min(26rem, 52dvh);
  }
  .rv-stage :global(.tk-title) {
    margin-top: 2.5rem;
  }
  .rv-prompt {
    margin: 0;
    color: var(--color-muted);
    font-size: 1rem;
    line-height: 1.5;
    max-width: 34ch;
  }
  .rv-show {
    align-self: flex-start;
    margin-top: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0;
    background: none;
    border: 0;
    color: var(--color-link);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .rv-notes {
    margin-top: auto;
    display: grid;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    border-radius: 16px;
    background: var(--color-base-200);
    border: 1px solid var(--color-base-300);
  }
  .rv-notes-head {
    display: flex;
    align-items: center;
    margin: 0;
    font-weight: 500;
    color: var(--color-leaf-deep);
  }
  .rv-hint {
    margin-inline-start: auto;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--color-muted);
  }
  .rv-text {
    margin: 0;
    white-space: pre-wrap;
    line-height: 1.55;
    max-width: 65ch;
  }
  .rv-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--color-link);
    font-weight: 500;
  }
  .rv-ask {
    margin: 0 0 0.625rem;
    text-align: center;
    color: var(--color-muted);
    font-size: 0.875rem;
  }
  .rv-rate {
    display: grid;
    grid-template-columns: 1fr 1fr 1.25fr;
    gap: 0.625rem;
  }
  .rv-rate :global(.rk-in) {
    flex-direction: column;
    gap: 0.125rem;
  }
  .rv-rate kbd {
    display: none;
  }
  .rv-note {
    margin: 0.875rem 0 0;
    text-align: center;
    color: var(--color-muted);
    font-size: 0.8125rem;
  }

  .rv-done {
    margin: auto 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
    padding-top: 2rem;
  }
  .rv-done h1 {
    margin: 1rem 0 0;
    font-size: 1.875rem;
    font-weight: 600;
    color: var(--color-heading);
  }
  .rv-sub {
    margin: 0;
    color: var(--color-muted);
  }
  .rv-facts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.625rem;
    margin-top: 1rem;
  }
  .rv-facts span {
    padding: 0.625rem 0.875rem;
    border-radius: 14px;
    background: var(--color-base-200);
    border: 1px solid var(--color-base-300);
    font-size: 0.875rem;
  }
  .rv-done-key {
    width: 100%;
    max-width: 24rem;
    margin-top: 2rem;
  }
  .rv-sun {
    fill: var(--color-leaf-tab);
  }
  .rv-stem {
    stroke: var(--color-leaf-line);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .rv-leaf-a,
  .rv-leaf-b {
    stroke: var(--color-leaf-line);
    stroke-width: 2.2;
  }
  .rv-leaf-a {
    fill: var(--color-leaf-soft);
  }
  .rv-leaf-b {
    fill: var(--color-leaf-bright);
  }
  .rv-bud {
    fill: light-dark(#fecdd3, #4a1f27);
    stroke: light-dark(#9f1239, #fda4af);
    stroke-width: 1.8;
  }
  .rv-pot {
    fill: light-dark(#fde68a, #4a3d12);
    stroke: light-dark(#854d0e, #fde68a);
    stroke-width: 2;
    stroke-linejoin: round;
  }

  @media (min-width: 40rem) {
    .rv {
      padding-top: 1.5rem;
    }
    .rv-stop span,
    .rv-min {
      display: inline;
    }
    .rv-stop {
      padding: 0 1rem 0 0.75rem;
    }
    .rv-rate :global(.rk-in) {
      flex-direction: row;
      gap: 0.5rem;
    }
    .rv-rate kbd {
      display: inline-block;
      padding: 0.0625rem 0.4375rem;
      border-radius: 6px;
      background: rgb(255 255 255 / 0.6);
      font: inherit;
      font-size: 0.75rem;
      color: inherit;
    }
  }
</style>
