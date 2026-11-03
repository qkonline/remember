<!--
  A topic as a card on a fanned stack of two more (rose and yellow behind it): its shelf, how
  long is left when the end is near, its title and how far it has grown. Today shows the next
  one to refresh this way.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '#lib/i18n/index.svelte.ts';
  import { growthOf, memory, shelfOf, type Topic } from '#lib/app/store.svelte.ts';
  import { daysBetween } from '#lib/app/schedule/index.ts';
  import { timeLeft } from '#lib/app/dates.ts';
  import ShelfMark from './ShelfMark.svelte';
  import Sprouts from './Sprouts.svelte';

  let { topic, big = false, children }: { topic: Topic; big?: boolean; children?: Snippet } = $props();

  const shelf = $derived(shelfOf(topic));
  const grown = $derived(growthOf(topic));
  const near = $derived(topic.endOn !== null && daysBetween(memory.today, topic.endOn) <= 45);
</script>

<div class="tk" class:tk-big={big}>
  <span class="tk-back tk-b2" aria-hidden="true"></span>
  <span class="tk-back tk-b1" aria-hidden="true"></span>
  <article class="tk-card">
    <div class="tk-top">
      <ShelfMark {shelf} size={big ? 34 : 30} />
      <span class="tk-shelf">{shelf?.name ?? t('No category')}</span>
      {#if near && topic.endOn}<span class="tk-end">{timeLeft(topic.endOn, memory.today)}</span>{/if}
    </div>
    <h2 class="tk-title">{topic.title}</h2>
    {#if children}{@render children()}{:else}
      <Sprouts done={grown.done} total={grown.total} />
    {/if}
  </article>
</div>

<style>
  .tk {
    position: relative;
    padding-bottom: 1rem;
  }
  .tk-back {
    position: absolute;
    inset: 0.75rem 1.375rem 0.25rem;
    border-radius: 20px;
  }
  .tk-b2 {
    background: light-dark(#fef9c3, #2c2712);
    transform: rotate(3.5deg);
  }
  .tk-b1 {
    inset: 0.5rem 0.75rem 0.5rem;
    background: light-dark(#ffe4e6, #2e171b);
    transform: rotate(-2.5deg);
  }
  .tk-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    min-height: 9.5rem;
    box-sizing: border-box;
    padding: 1rem 1.125rem;
    border-radius: 20px;
    background: var(--color-base-100);
    border: 1px solid var(--color-base-300);
    box-shadow: var(--shadow-pop);
  }
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
  .tk-end {
    margin-inline-start: auto;
    flex: none;
    padding: 0.25rem 0.5625rem;
    border-radius: 999px;
    background: light-dark(#ffe4e6, #3a1a20);
    color: light-dark(#9f1239, #fda4af);
    font-size: 0.75rem;
    font-weight: 500;
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
  .tk-big .tk-card {
    min-height: 11rem;
    padding: 1.25rem 1.375rem;
  }
  .tk-big .tk-title {
    font-size: 1.875rem;
  }
</style>
