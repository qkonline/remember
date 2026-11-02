<!--
  One check-in: the topic's title and a prompt to recall it first, the notes only when asked,
  then one honest tap: Forgot, Hazy or Got it. Forgot keeps the sheet open on the notes, to
  re-study now; the topic comes back soon either way.
-->
<script lang="ts">
  import { t } from '#lib/i18n/index.svelte.ts';
  import { checkIn, type CheckedIn, type Topic } from '#lib/app/store.svelte.ts';
  import { whenNext } from '#lib/app/dates.ts';
  import { memory } from '#lib/app/store.svelte.ts';
  import type { RatingName } from '#lib/app/schedule/index.ts';
  import Sheet from './Sheet.svelte';
  import Key from './Key.svelte';

  let {
    topic,
    open = $bindable(false),
    onrated,
  }: { topic: Topic | null; open?: boolean; onrated?: (r: CheckedIn, rating: RatingName) => void } = $props();

  let reveal = $state(false);
  let restudy = $state<CheckedIn | null>(null);
  let busy = $state(false);

  $effect(() => {
    if (open) {
      reveal = false;
      restudy = null;
    }
  });

  const hasNotes = $derived(!!topic && !!(topic.notes.trim() || topic.link));

  async function rate(rating: RatingName) {
    if (!topic || busy) return;
    busy = true;
    try {
      const r = await checkIn(topic.id, rating);
      if (!r) return;
      onrated?.(r, rating);
      if (rating === 'forgot' && hasNotes) {
        restudy = r;
        reveal = true;
      } else open = false;
    } finally {
      busy = false;
    }
  }
</script>

<Sheet title={topic?.title ?? t('Check yourself')} bind:open hideTitle>
  {#if topic}
    <article class="rc">
      <h2 class="rc-title">{topic.title}</h2>
      {#if restudy}
        <p class="rc-prompt">
          {restudy.next
            ? t('Have another look now. It comes back {when}.', {
                when: whenNext(restudy.next, memory.today),
              })
            : t('Have another look now.')}
        </p>
      {:else}
        <p class="rc-prompt">{t('Take 30 seconds. What do you remember about it?')}</p>
      {/if}

      {#if hasNotes}
        {#if reveal}
          <div class="rc-notes">
            {#if topic.notes.trim()}<p class="rc-text">{topic.notes}</p>{/if}
            {#if topic.link}
              <a class="rc-link" href={topic.link} target="_blank" rel="noopener noreferrer"
                >{t('Open your link')}</a
              >
            {/if}
          </div>
        {:else}
          <button type="button" class="rc-show" onclick={() => (reveal = true)}>{t('Show my notes')}</button>
        {/if}
      {/if}
    </article>
  {/if}

  {#snippet foot()}
    {#if restudy}
      <Key wide onclick={() => (open = false)}>{t('Done')}</Key>
    {:else}
      <div class="rc-keys" role="group" aria-label={t('How did it go?')}>
        <Key onclick={() => rate('forgot')} disabled={busy}>{t('Forgot')}</Key>
        <Key onclick={() => rate('hazy')} disabled={busy}>{t('Hazy')}</Key>
        <Key tone="go" onclick={() => rate('got')} disabled={busy}>{t('Got it')}</Key>
      </div>
    {/if}
  {/snippet}
</Sheet>

<style>
  .rc {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding-top: 0.25rem;
  }
  .rc-title {
    font-size: 1.5rem;
    line-height: 1.25;
    font-weight: 600;
    margin: 0;
    color: var(--color-heading);
    overflow-wrap: anywhere;
  }
  .rc-prompt {
    margin: 0;
    color: var(--color-muted);
    max-width: 34ch;
  }
  .rc-show {
    align-self: flex-start;
    background: none;
    border: 0;
    padding: 0.5rem 0;
    color: var(--color-link);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .rc-show:focus-visible,
  .rc-link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .rc-notes {
    border-inline-start: 3px solid var(--color-base-300);
    padding-inline-start: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .rc-text {
    margin: 0;
    white-space: pre-wrap;
    max-width: 65ch;
  }
  .rc-link {
    color: var(--color-link);
    font-weight: 500;
  }
  .rc-keys {
    display: grid;
    grid-template-columns: 1fr 1fr 1.25fr;
    gap: 0.625rem;
    width: 100%;
  }
</style>
