<!--
  One topic in a list: its title, how long is left (or when it comes back), and its horizon
  track. The whole row is one button or link.
-->
<script lang="ts">
  import { t } from '#lib/i18n/index.svelte.ts';
  import { checkinsOf, memory, type Topic } from '#lib/app/store.svelte.ts';
  import { timeLeft, whenNext } from '#lib/app/dates.ts';
  import Track from './Track.svelte';

  let {
    topic,
    href,
    onclick,
    showNext = false,
  }: { topic: Topic; href?: string; onclick?: () => void; showNext?: boolean } = $props();

  const today = $derived(memory.today);
  const done = $derived(checkinsOf(topic.id).map((c) => c.day));
  const meta = $derived.by(() => {
    if (topic.state === 'done') return t('Kept to the finish line');
    const parts: string[] = [];
    if (showNext)
      parts.push(topic.due ? t('Next {when}', { when: whenNext(topic.due, today) }) : t('No more check-ins'));
    parts.push(topic.endOn ? timeLeft(topic.endOn, today) : t('For good'));
    return parts.join(', ');
  });
</script>

{#snippet body()}
  <span class="tr-title">{topic.title}</span>
  <span class="tr-meta">{meta}</span>
  <span class="tr-track">
    <Track
      start={topic.studiedOn}
      end={topic.endOn}
      {done}
      next={topic.due}
      {today}
      finished={topic.state === 'done'}
    />
  </span>
{/snippet}

{#if href}
  <a class="tr" {href}>{@render body()}</a>
{:else}
  <button type="button" class="tr" {onclick}>{@render body()}</button>
{/if}

<style>
  .tr {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'title meta'
      'track track';
    align-items: baseline;
    column-gap: 1rem;
    row-gap: 0.75rem;
    width: 100%;
    padding: 1rem 0.25rem;
    background: none;
    border: 0;
    border-bottom: 1px solid var(--color-base-300);
    color: inherit;
    font: inherit;
    text-align: start;
    text-decoration: none;
    cursor: pointer;
  }
  .tr:hover .tr-title {
    color: var(--color-primary);
  }
  .tr:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
  .tr-title {
    grid-area: title;
    font-weight: 600;
    font-size: 1.0625rem;
    color: var(--color-heading);
    overflow-wrap: anywhere;
  }
  .tr-meta {
    grid-area: meta;
    font-size: 0.875rem;
    color: var(--color-muted);
    white-space: nowrap;
  }
  .tr-track {
    grid-area: track;
  }
  @media (max-width: 26rem) {
    .tr {
      grid-template-columns: 1fr;
      grid-template-areas:
        'title'
        'meta'
        'track';
      row-gap: 0.375rem;
    }
    .tr-track {
      margin-top: 0.375rem;
    }
  }
</style>
