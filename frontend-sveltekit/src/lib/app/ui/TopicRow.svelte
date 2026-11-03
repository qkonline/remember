<!--
  One topic in a list: its shelf's mark, its title, its shelf and how far it has grown, and when
  it comes back ("Today" stands out). The whole row is one link (or button).
-->
<script lang="ts">
  import { t } from '#lib/i18n/index.svelte.ts';
  import { growthOf, memory, shelfOf, type Topic } from '#lib/app/store.svelte.ts';
  import { daysBetween } from '#lib/app/schedule/index.ts';
  import { formatDay, whenNext } from '#lib/app/dates.ts';
  import ShelfMark from './ShelfMark.svelte';
  import Sprouts from './Sprouts.svelte';

  let {
    topic,
    href,
    onclick,
    selected = false,
  }: { topic: Topic; href?: string; onclick?: (e: MouseEvent) => void; selected?: boolean } = $props();

  const today = $derived(memory.today);
  const shelf = $derived(shelfOf(topic));
  const grown = $derived(growthOf(topic));
  const dueNow = $derived(topic.state === 'active' && topic.due !== null && topic.due <= today);
  const when = $derived(
    topic.state === 'done'
      ? topic.doneOn
        ? t('Learned {date}', { date: formatDay(topic.doneOn, today) })
        : t('Learned')
      : topic.due === null
        ? t('No more check-ins')
        : dueNow
          ? t('Today')
          : (() => {
              const s = whenNext(topic.due, today);
              return daysBetween(today, topic.due) < 60 ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s;
            })(),
  );
</script>

{#snippet body()}
  <ShelfMark {shelf} size={38} />
  <span class="tr-text">
    <span class="tr-title">{topic.title}</span>
    <span class="tr-meta"
      >{shelf?.name ?? t('No category')}<Sprouts done={grown.done} total={grown.total} size={13} /></span
    >
  </span>
  <span class="tr-when" class:tr-now={dueNow}>{when}</span>
{/snippet}

{#if href}
  <a class="tr" class:tr-sel={selected} {href} {onclick} aria-current={selected ? 'true' : undefined}
    >{@render body()}</a
  >
{:else}
  <button type="button" class="tr" class:tr-sel={selected} {onclick}>{@render body()}</button>
{/if}

<style>
  .tr {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 4rem;
    padding: 0.625rem 1rem;
    box-sizing: border-box;
    border: 0;
    border-bottom: 1px solid var(--color-base-300);
    background: none;
    color: inherit;
    font: inherit;
    text-align: start;
    text-decoration: none;
    cursor: pointer;
  }
  .tr:hover {
    background: var(--color-base-200);
  }
  .tr:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
  .tr-sel,
  .tr-sel:hover {
    background: var(--color-leaf-tab);
    box-shadow: inset 3px 0 0 var(--color-leaf-line);
  }
  .tr-text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 0.1875rem;
  }
  .tr-title {
    font-weight: 500;
    font-size: 1rem;
    color: var(--color-heading);
    overflow-wrap: anywhere;
  }
  .tr-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
  .tr-when {
    flex: none;
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
  .tr-now {
    padding: 0.1875rem 0.5625rem;
    border-radius: 999px;
    background: var(--color-leaf-tint);
    color: var(--color-leaf-deep);
    font-weight: 500;
  }
</style>
