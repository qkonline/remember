<!--
  Every topic: the ones still being kept (soonest check-in first) and the ones kept to their
  finish line. Search by title or notes. Each row opens the topic.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Segmented from '#lib/components/ui/Segmented.svelte';
  import { memory, watch } from '#lib/app/store.svelte.ts';
  import TopicRow from '#lib/app/ui/TopicRow.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import AddSheet from '#lib/app/ui/AddSheet.svelte';

  onMount(() => watch());

  let show = $state<'active' | 'done'>('active');
  let query = $state('');
  let adding = $state(false);

  const shown = $derived.by(() => {
    const q = query.trim().toLocaleLowerCase();
    return memory.topics
      .filter((x) => x.state === show)
      .filter((x) => !q || x.title.toLocaleLowerCase().includes(q) || x.notes.toLocaleLowerCase().includes(q))
      .sort((a, b) =>
        show === 'active'
          ? (a.due ?? '9999') < (b.due ?? '9999')
            ? -1
            : (a.due ?? '9999') > (b.due ?? '9999')
              ? 1
              : a.title.localeCompare(b.title)
          : (b.doneOn ?? '') < (a.doneOn ?? '')
            ? -1
            : 1,
      );
  });
  const counts = $derived({
    active: memory.topics.filter((x) => x.state === 'active').length,
    done: memory.topics.filter((x) => x.state === 'done').length,
  });
</script>

<svelte:head><title>{t('Topics')} · {appName}</title></svelte:head>

<div class="tp">
  <h1>{t('Topics')}</h1>

  {#if memory.loaded && memory.topics.length === 0}
    <p class="tp-empty">{t('Nothing here yet. Add the first thing you studied and it shows up here.')}</p>
    <Key tone="primary" onclick={() => (adding = true)}>{t('Add what you studied')}</Key>
  {:else}
    <div class="tp-tools">
      <Segmented
        legend={t('Show')}
        hideLegend
        options={[
          { value: 'active', label: t('Keeping ({count})', { count: counts.active }) },
          { value: 'done', label: t('Done ({count})', { count: counts.done }) },
        ]}
        bind:value={show}
      />
      <Field label={t('Search topics')} hideLabel>
        <Input type="search" bind:value={query} placeholder={t('Search')} autocomplete="off" />
      </Field>
    </div>

    {#if shown.length}
      <ul class="tp-list">
        {#each shown as topic (topic.id)}
          <li>
            <TopicRow
              {topic}
              href={`${resolve('/(app)/topic')}?id=${encodeURIComponent(topic.id)}`}
              showNext
            />
          </li>
        {/each}
      </ul>
    {:else if query.trim()}
      <p class="tp-empty">{t('No topics match “{query}”.', { query: query.trim() })}</p>
    {:else if show === 'done'}
      <p class="tp-empty">{t('Topics you keep to their finish line show up here.')}</p>
    {:else}
      <p class="tp-empty">{t('Nothing is being kept right now.')}</p>
    {/if}
    {#if show === 'active' && shown.length}
      <p class="tp-count">{tn(shown.length, '1 topic', '{count} topics')}</p>
    {/if}
  {/if}
</div>

<AddSheet bind:open={adding} />

<style>
  .tp {
    max-width: 40rem;
  }
  .tp h1 {
    margin: 0 0 1.25rem;
  }
  .tp-tools {
    display: grid;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  @media (min-width: 40rem) {
    .tp-tools {
      grid-template-columns: auto 1fr;
      align-items: center;
    }
  }
  .tp-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--color-base-300);
  }
  .tp-empty {
    color: var(--color-muted);
    max-width: 44ch;
    margin: 1rem 0;
  }
  .tp-count {
    margin-top: 1rem;
    color: var(--color-muted);
    font-size: 0.875rem;
  }
</style>
