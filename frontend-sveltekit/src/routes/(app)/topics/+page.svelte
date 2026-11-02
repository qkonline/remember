<!--
  Shelves: every topic, by shelf. The shelves as pots across the top (tap one to see only it, and
  to rename, recolour or remove it), Growing or Learned, and a search over titles and notes. On a
  computer the topic picked opens beside the list; on a phone a topic opens its own page.
  `?shelf=<id>` (or `none`) starts on a shelf, `?id=<topic>` on a topic.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { appName } from '#lib/config.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import { memory, type Shelf } from '#lib/app/store.svelte.ts';
  import { startAdding } from '#lib/app/ui.svelte.ts';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import GrowingPot from '#lib/app/ui/GrowingPot.svelte';
  import ShelfMark from '#lib/app/ui/ShelfMark.svelte';
  import ShelfSheet from '#lib/app/ui/ShelfSheet.svelte';
  import Sheet from '#lib/app/ui/Sheet.svelte';
  import TopicDetail from '#lib/app/ui/TopicDetail.svelte';
  import TopicRow from '#lib/app/ui/TopicRow.svelte';

  let show = $state<'active' | 'done'>('active');
  let query = $state('');
  let shelfFilter = $state<string | null>(page.url.searchParams.get('shelf'));
  let selectedId = $state<string | null>(page.url.searchParams.get('id'));
  let wide = $state(false);
  let search = $state<HTMLInputElement>();

  onMount(() => {
    const mq = matchMedia('(min-width: 64rem)');
    const set = () => (wide = mq.matches);
    set();
    mq.addEventListener('change', set);
    const keys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key === '/' && !target?.closest('input, textarea, select, [contenteditable]')) {
        e.preventDefault();
        search?.focus();
      }
    };
    addEventListener('keydown', keys);
    return () => {
      mq.removeEventListener('change', set);
      removeEventListener('keydown', keys);
    };
  });

  const known = (id: string | null) => id !== null && memory.shelves.some((s) => s.id === id);
  const onShelf = (shelf: string | null, filter: string | null) =>
    filter === null ? true : filter === 'none' ? !known(shelf) : shelf === filter;

  const shown = $derived.by(() => {
    const q = query.trim().toLocaleLowerCase();
    return memory.topics
      .filter((x) => x.state === show && onShelf(x.shelf, shelfFilter))
      .filter((x) => !q || x.title.toLocaleLowerCase().includes(q) || x.notes.toLocaleLowerCase().includes(q))
      .sort((a, b) =>
        show === 'active'
          ? (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.title.localeCompare(b.title)
          : (b.doneOn ?? '').localeCompare(a.doneOn ?? ''),
      );
  });
  const counts = $derived({
    active: memory.topics.filter((x) => x.state === 'active' && onShelf(x.shelf, shelfFilter)).length,
    done: memory.topics.filter((x) => x.state === 'done' && onShelf(x.shelf, shelfFilter)).length,
  });
  const loose = $derived(memory.topics.filter((x) => !known(x.shelf)).length);
  const pots = $derived([
    ...memory.shelves.map((s) => ({
      id: s.id,
      shelf: s as Shelf | null,
      name: s.name,
      count: memory.topics.filter((x) => x.shelf === s.id).length,
    })),
    ...(loose && memory.shelves.length
      ? [{ id: 'none', shelf: null, name: t('No shelf'), count: loose }]
      : []),
  ]);
  const current = $derived(memory.shelves.find((s) => s.id === shelfFilter) ?? null);

  // On a computer the list keeps a topic open beside it: the one picked, or the first.
  const selected = $derived(
    wide
      ? (shown.find((x) => x.id === selectedId) ??
          (selectedId ? memory.topics.find((x) => x.id === selectedId) : null) ??
          shown[0] ??
          null)
      : null,
  );

  function syncUrl() {
    const u = new URL(page.url.href);
    if (shelfFilter) u.searchParams.set('shelf', shelfFilter);
    else u.searchParams.delete('shelf');
    if (selectedId) u.searchParams.set('id', selectedId);
    else u.searchParams.delete('id');
    replaceState(u, {});
  }

  function pickShelf(id: string) {
    shelfFilter = shelfFilter === id ? null : id;
    syncUrl();
  }

  function open(e: MouseEvent, id: string) {
    if (!wide || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    selectedId = id;
    syncUrl();
  }

  // Shelves: make, change, remove (ShelfSheet), and the list of them all.
  let shelfOpen = $state(false);
  let shelfEditing = $state<Shelf | null>(null);
  let manageOpen = $state(false);
  function newShelf() {
    shelfEditing = null;
    manageOpen = false;
    shelfOpen = true;
  }
  function editShelfSheet(s: Shelf) {
    shelfEditing = s;
    manageOpen = false;
    shelfOpen = true;
  }
</script>

<svelte:head><title>{t('Shelves')} · {appName}</title></svelte:head>

<div class="sv" class:sv-split={wide && memory.topics.length > 0}>
  <div class="sv-list">
    <header class="sv-head">
      <h1>{t('Shelves')}</h1>
      <span class="sv-total">{tn(memory.topics.length, '1 topic', '{count} topics')}</span>
      {#if memory.topics.length || memory.shelves.length}
        <button type="button" class="sv-manage-open" onclick={() => (manageOpen = true)}
          ><Glyph name="edit" size={16} />{t('Manage shelves')}</button
        >
      {/if}
    </header>

    {#if memory.loaded && memory.topics.length === 0 && memory.shelves.length === 0}
      <section class="sv-blank" aria-labelledby="blank-title">
        <div class="sv-blank-shelf" aria-hidden="true">
          <div class="sv-blank-pots">
            <span class="sv-ghost-pot"></span>
            <GrowingPot color="green" leaves={0} size={70} letter={false} />
            <span class="sv-ghost-pot"></span>
          </div>
          <span class="sv-plank"></span>
        </div>
        <h2 id="blank-title">{t('An empty shelf, ready to grow')}</h2>
        <p>
          {t(
            'Add the first thing you studied. Put it on a shelf like Biology or Law, and it grows here as you check in.',
          )}
        </p>
        <div class="sv-blank-keys">
          <Key tone="leaf" big onclick={() => startAdding()}
            ><Glyph name="plus" size={18} />{t('Add what you studied')}</Key
          >
          <Key big onclick={newShelf}>{t('Make a shelf first')}</Key>
        </div>
      </section>
    {:else}
      <section class="sv-shelf" aria-label={t('Shelves')}>
        <ul class="sv-pots">
          {#each pots as p (p.id)}
            <li>
              <button type="button" aria-pressed={shelfFilter === p.id} onclick={() => pickShelf(p.id)}>
                <GrowingPot shelf={p.shelf} leaves={Math.min(6, p.count)} size={64} />
                <span class="sv-pot-name">{p.name}</span>
                <span class="sv-pot-n">{tn(p.count, '1 topic', '{count} topics')}</span>
              </button>
            </li>
          {/each}
          <li>
            <button type="button" class="sv-new" onclick={newShelf}>
              <span class="sv-new-pot" aria-hidden="true"><Glyph name="plus" size={20} /></span>
              <span class="sv-pot-name">{t('New shelf')}</span>
              <span class="sv-pot-n">{t('Make one')}</span>
            </button>
          </li>
        </ul>
        <span class="sv-plank" aria-hidden="true"></span>
      </section>

      <div class="sv-search">
        <Field label={t('Search your topics')} hideLabel>
          <Input
            bind:ref={search}
            type="search"
            bind:value={query}
            placeholder={t('Search your topics')}
            autocomplete="off"
          />
        </Field>
        <span class="sv-search-icon" aria-hidden="true"><Glyph name="search" size={18} /></span>
        {#if wide}<kbd class="sv-kbd" aria-hidden="true">/</kbd>{/if}
      </div>

      {#if current}
        <div class="sv-shelf-bar">
          <span>{t('Only {shelf}', { shelf: current.name })}</span>
          <button type="button" onclick={() => current && editShelfSheet(current)}
            ><Glyph name="edit" size={16} />{t('Edit shelf')}</button
          >
          <button type="button" onclick={() => startAdding(current.id)}
            ><Glyph name="plus" size={16} />{t('Add to {shelf}', { shelf: current.name })}</button
          >
        </div>
      {/if}

      <div class="sv-seg" role="radiogroup" aria-label={t('Show')}>
        <button type="button" role="radio" aria-checked={show === 'active'} onclick={() => (show = 'active')}
          >{t('Growing')} <span>{counts.active}</span></button
        >
        <button type="button" role="radio" aria-checked={show === 'done'} onclick={() => (show = 'done')}
          >{t('Learned')} <span>{counts.done}</span></button
        >
      </div>

      {#if shown.length}
        <ul class="sv-rows">
          {#each shown as topic (topic.id)}
            <li>
              <TopicRow
                {topic}
                href="{resolve('/(app)/topic')}?id={topic.id}"
                onclick={(e) => open(e, topic.id)}
                selected={selected?.id === topic.id}
              />
            </li>
          {/each}
        </ul>
      {:else}
        <p class="sv-empty">
          {query.trim()
            ? t('No topic matches “{query}”.', { query: query.trim() })
            : show === 'done'
              ? t('Nothing learned here yet. Topics land here when you mark them learned.')
              : t('Nothing growing here.')}
        </p>
      {/if}
    {/if}
  </div>

  {#if selected}
    <section class="sv-detail" aria-label={selected.title}>
      {#key selected.id}
        <TopicDetail
          topic={selected}
          ondeleted={() => {
            selectedId = null;
            syncUrl();
          }}
        />
      {/key}
    </section>
  {/if}
</div>

<ShelfSheet
  bind:open={shelfOpen}
  shelf={shelfEditing}
  oncreated={(id) => {
    shelfFilter = id;
    syncUrl();
  }}
  onremoved={() => {
    shelfFilter = null;
    syncUrl();
  }}
/>

<Sheet title={t('Your shelves')} bind:open={manageOpen}>
  {#if memory.shelves.length}
    <ul class="sv-manage">
      {#each memory.shelves as s (s.id)}
        <li>
          <ShelfMark shelf={s} size={36} />
          <span class="sv-manage-text">
            <span class="sv-manage-name">{s.name}</span>
            <span class="sv-manage-n"
              >{tn(memory.topics.filter((x) => x.shelf === s.id).length, '1 topic', '{count} topics')}</span
            >
          </span>
          <button
            type="button"
            onclick={() => editShelfSheet(s)}
            aria-label={t('Edit {shelf}', { shelf: s.name })}
            ><Glyph name="edit" size={16} />{t('Edit')}</button
          >
        </li>
      {/each}
    </ul>
  {:else}
    <p class="sv-manage-none">{t('No shelves yet. Make one for each subject, like Biology or Law.')}</p>
  {/if}
  {#snippet foot()}
    <Key tone="leaf" big wide onclick={newShelf}><Glyph name="plus" size={18} />{t('New shelf')}</Key>
  {/snippet}
</Sheet>

<style>
  .sv-head {
    display: flex;
    align-items: baseline;
    justify-content: flex-start;
    gap: 1rem;
    margin: 0.25rem 0 0.875rem;
  }
  .sv-head h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-heading);
  }
  .sv-total {
    color: var(--color-muted);
    font-size: 0.875rem;
  }
  /* Nothing yet: an empty shelf with a seed pot, then the words, then the key. */
  .sv-blank {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    padding: 2rem 1.25rem 2.25rem;
    border: 1px solid var(--color-base-300);
    border-radius: 24px;
    text-align: center;
  }
  .sv-blank-shelf {
    width: min(100%, 18rem);
  }
  .sv-blank-pots {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 1.5rem;
  }
  .sv-blank .sv-plank {
    margin: 0;
    border-radius: 6px;
  }
  .sv-ghost-pot {
    width: 3rem;
    height: 2.75rem;
    border: 1.5px dashed var(--color-border-strong);
    border-radius: 6px 6px 14px 14px;
  }
  .sv-blank-keys {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }
  .sv-blank h2 {
    margin: 0.75rem 0 0;
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--color-heading);
  }
  .sv-blank p {
    margin: 0 0 1rem;
    max-width: 38ch;
    color: var(--color-muted);
    line-height: 1.5;
  }
  .sv-empty {
    color: var(--color-muted);
    margin: 1rem 0;
    max-width: 40ch;
  }
  .sv-search {
    position: relative;
  }
  .sv-search :global(input) {
    padding-inline-start: 2.625rem;
    border-radius: 14px;
    background: var(--color-base-200);
  }
  .sv-search-icon {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted);
    display: grid;
    pointer-events: none;
  }
  .sv-kbd {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0 0.375rem;
    border: 1px solid var(--color-base-300);
    border-radius: 6px;
    background: var(--color-base-100);
    font: inherit;
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  /* The shelf: the person's shelves as pots standing on a plank, each plant as big as what it
     holds; tap one to see only it. A dashed pot at the end starts a new shelf. */
  .sv-shelf {
    position: relative;
    margin: 0.25rem 0 1.25rem;
    padding: 1rem 0.75rem 0;
    border: 1px solid var(--color-base-300);
    border-radius: 24px;
    background: linear-gradient(to bottom, var(--color-base-100) 55%, var(--color-leaf-tab));
    overflow: hidden;
  }
  .sv-pots {
    list-style: none;
    margin: 0;
    padding: 0 0.25rem;
    display: flex;
    align-items: flex-end;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .sv-pots button {
    display: grid;
    justify-items: center;
    gap: 0.0625rem;
    width: 5.5rem;
    padding: 0.5rem 0.25rem 0.375rem;
    border: 1.5px solid transparent;
    border-radius: 18px;
    background: none;
    color: var(--color-heading);
    font: inherit;
    cursor: pointer;
  }
  .sv-pots button:hover {
    background: color-mix(in oklab, var(--color-base-100) 70%, transparent);
  }
  .sv-pots button[aria-pressed='true'] {
    border-color: var(--color-leaf-line);
    background: var(--color-base-100);
  }
  .sv-new-pot {
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.25rem;
    margin: 1.75rem 0 0.25rem;
    border: 1.5px dashed var(--color-border-strong);
    border-radius: 6px 6px 14px 14px;
    color: var(--color-muted);
  }
  .sv-new:hover .sv-new-pot {
    border-color: var(--color-leaf-line);
    color: var(--color-leaf-line);
  }
  .sv-plank {
    display: block;
    height: 0.75rem;
    margin: 0 -0.75rem;
    background: light-dark(#e3d5bc, #4a4234);
    box-shadow: inset 0 3px 0 light-dark(#efe5d3, #5a5141);
  }
  .sv-pots button:focus-visible,
  .sv-seg button:focus-visible,
  .sv-shelf-bar button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .sv-pot-name {
    max-width: 100%;
    font-weight: 500;
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sv-pot-n {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
  .sv-shelf-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .sv-shelf-bar span {
    margin-inline-end: auto;
    font-weight: 500;
    color: var(--color-leaf-deep);
  }
  .sv-shelf-bar button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    background: var(--color-base-100);
    color: var(--color-base-content);
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .sv-seg {
    display: flex;
    gap: 2px;
    margin: 1rem 0 0.375rem;
    padding: 4px;
    border-radius: 12px;
    background: var(--color-base-200);
    border: 1px solid var(--color-base-300);
  }
  .sv-seg button {
    flex: 1;
    min-height: 2.5rem;
    border: 0;
    border-radius: 9px;
    background: none;
    color: var(--color-muted);
    font: inherit;
    font-size: 0.9375rem;
    cursor: pointer;
  }
  .sv-seg button span {
    font-size: 0.8125rem;
    opacity: 0.8;
  }
  .sv-seg button[aria-checked='true'] {
    background: var(--color-base-100);
    box-shadow: 0 1px 0 var(--color-base-300);
    color: var(--color-leaf-deep);
    font-weight: 500;
  }
  .sv-rows {
    list-style: none;
    margin: 0 -1rem;
    padding: 0;
  }

  .sv-manage-open {
    margin-inline-start: auto;
    align-self: center;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    background: var(--color-base-100);
    color: var(--color-base-content);
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .sv-manage-open:hover {
    border-color: var(--color-leaf-line);
  }
  .sv-manage {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .sv-manage li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0;
    border-bottom: 1px solid var(--color-base-300);
  }
  .sv-manage-text {
    flex: 1;
    display: grid;
    min-width: 0;
  }
  .sv-manage-name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sv-manage-n {
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
  .sv-manage button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    background: var(--color-base-100);
    color: var(--color-base-content);
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .sv-manage-none {
    margin: 0;
    color: var(--color-muted);
  }
  .sv-manage-open:focus-visible,
  .sv-manage button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (min-width: 64rem) {
    .sv-split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(22rem, 28rem);
      gap: 1.75rem;
      align-items: start;
    }
    .sv-head h1 {
      font-size: 1.875rem;
    }
    .sv-rows {
      margin: 0.5rem 0 0;
      border: 1px solid var(--color-base-300);
      border-radius: 20px;
      overflow: hidden;
    }
    .sv-rows li:last-child :global(.tr) {
      border-bottom: 0;
    }
    .sv-detail {
      position: sticky;
      top: 2rem;
      max-height: calc(100dvh - 4rem);
      overflow-y: auto;
      padding: 1.5rem;
      border: 1px solid var(--color-base-300);
      border-radius: 24px;
      box-sizing: border-box;
    }
    .sv-detail :global(.tdl-title) {
      font-size: 1.75rem;
    }
  }
</style>
