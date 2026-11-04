<!--
  A topic to review on its fanned stack of cards: its category, its title, and what the page puts
  under them.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '#lib/i18n/index.svelte.ts';
  import { shelfOf, type Topic } from '#lib/app/store.svelte.ts';
  import CardDeck from './CardDeck.svelte';
  import ShelfMark from './ShelfMark.svelte';

  let { topic, big = false, children }: { topic: Topic; big?: boolean; children?: Snippet } = $props();

  const shelf = $derived(shelfOf(topic));
</script>

<CardDeck {big}>
  <div class="tk-top">
    <ShelfMark {shelf} size={big ? 34 : 30} />
    <span class="tk-shelf">{shelf?.name ?? t('No category')}</span>
  </div>
  <h2 class="tk-title" class:tk-title-big={big}>{topic.title}</h2>
  {@render children?.()}
</CardDeck>

<style>
  .tk-top {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  .tk-shelf {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-leaf-deep);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tk-title {
    margin: auto 0 0;
    font-size: 1.5rem;
    line-height: 1.15;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-heading);
    overflow-wrap: anywhere;
  }
  .tk-title-big {
    font-size: 1.875rem;
  }
</style>
