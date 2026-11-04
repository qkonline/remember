<!--
  One topic in a list: its category's coloured mark, its title, and when it comes back ("Today"
  stands out). The whole row is one link.
-->
<script lang="ts">
  import { t } from '#lib/i18n/index.svelte.ts';
  import { memory, shelfOf, type Topic } from '#lib/app/store.svelte.ts';
  import { daysBetween } from '#lib/app/schedule/index.ts';
  import { formatDay, whenNext } from '#lib/app/dates.ts';
  import ShelfMark from './ShelfMark.svelte';

  let { topic, href }: { topic: Topic; href: string } = $props();

  const today = $derived(memory.today);
  const shelf = $derived(shelfOf(topic));
  const dueNow = $derived(topic.state === 'active' && topic.due !== null && topic.due <= today);
  const when = $derived(
    topic.state === 'done'
      ? topic.doneOn
        ? t('Finished {date}', { date: formatDay(topic.doneOn, today) })
        : t('Finished')
      : topic.due === null
        ? t('No more reviews')
        : dueNow
          ? t('Today')
          : (() => {
              const s = whenNext(topic.due, today);
              return daysBetween(today, topic.due) < 60 ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s;
            })(),
  );
</script>

<a class="tr" {href}>
  <ShelfMark {shelf} size={34} />
  <span class="tr-title">{topic.title}</span>
  <span class="tr-when" class:tr-now={dueNow}>{when}</span>
</a>

<style>
  .tr {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 3.5rem;
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
  .tr-title {
    flex: 1;
    min-width: 0;
    font-weight: 500;
    font-size: 1rem;
    color: var(--color-heading);
    overflow-wrap: anywhere;
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
