<!--
  One topic (`/topic?id=…`), in full: see TopicDetail. On a computer the Shelves page shows the
  same beside its list; this page is where a phone goes, and where links to a topic land.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { t } from '#lib/i18n/index.svelte.ts';
  import { memory } from '#lib/app/store.svelte.ts';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import TopicDetail from '#lib/app/ui/TopicDetail.svelte';

  const id = $derived(page.url.searchParams.get('id') ?? '');
  const topic = $derived(memory.topics.find((x) => x.id === id) ?? null);
</script>

<svelte:head><title>{topic?.title ?? t('Topic')} · {appName}</title></svelte:head>

<div class="tp">
  <a class="tp-back" href={resolve('/(app)/topics')}
    ><Glyph name="back" size={20} /><span>{t('Categories')}</span></a
  >

  {#if !memory.loaded}
    <p class="tp-muted">{t('Loading…')}</p>
  {:else if !topic}
    <h1>{t('This topic isn’t here')}</h1>
    <p class="tp-muted">{t('It may have been deleted on another device.')}</p>
  {:else}
    {#key topic.id}
      <TopicDetail {topic} ondeleted={() => goto(resolve('/(app)/topics'))} />
    {/key}
  {/if}
</div>

<style>
  .tp {
    max-width: 40rem;
  }
  .tp-back {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 2.75rem;
    margin-bottom: 0.5rem;
    padding-inline-end: 0.75rem;
    color: var(--color-base-content);
    font-size: 0.9375rem;
    text-decoration: none;
  }
  .tp-back:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .tp-muted {
    color: var(--color-muted);
  }
</style>
