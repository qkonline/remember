<!--
  Categories: every topic, by category. The categories as pots on a wooden wall shelf across the
  top (tap one to see only it, and to rename, recolour or remove it), "New category" at the top,
  Growing or Learned, and a search over titles and notes. On a computer the topic picked opens
  beside the list; on a phone a topic opens its own page. (In the code and the synced data a
  category is still a "shelf".) `?shelf=<id>` (or `none`) starts on a category, `?id=<topic>` on
  a topic.
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
  import ShelfSheet from '#lib/app/ui/ShelfSheet.svelte';
  import Plank from '#lib/app/ui/Plank.svelte';
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
      ? [{ id: 'none', shelf: null, name: t('No category'), count: loose }]
      : []),
  ]);
  const current = $derived(memory.shelves.find((s) => s.id === shelfFilter) ?? null);

  // The pots stand on as many shelves as the width needs, like a bookcase: each holds as many
  // 5.75rem pots (0.5rem apart) as fit inside its 2.75rem ends; on a phone, 4.5rem pots side by
  // side inside 1.5rem ends.
  let shelfWidth = $state(0);
  const narrow = $derived(shelfWidth > 0 && shelfWidth < 480);
  const perShelf = $derived(
    Math.max(1, narrow ? Math.floor((shelfWidth - 48) / 72) : Math.floor((shelfWidth - 88 + 8) / (92 + 8))),
  );
  const racks = $derived(
    Array.from({ length: Math.ceil(pots.length / perShelf) }, (_v, i) =>
      pots.slice(i * perShelf, (i + 1) * perShelf),
    ),
  );

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

  // Categories: make one, or change or remove the one picked (ShelfSheet).
  let shelfOpen = $state(false);
  let shelfEditing = $state<Shelf | null>(null);
  function newShelf() {
    shelfEditing = null;
    shelfOpen = true;
  }
  function editShelfSheet(s: Shelf) {
    shelfEditing = s;
    shelfOpen = true;
  }
</script>

<svelte:head><title>{t('Categories')} · {appName}</title></svelte:head>

<div class="sv" class:sv-split={wide && memory.topics.length > 0}>
  <div class="sv-list">
    <header class="sv-head">
      <h1>{t('Categories')}</h1>
      <span class="sv-total">{tn(memory.topics.length, '1 topic', '{count} topics')}</span>
      {#if memory.topics.length || memory.shelves.length}
        <button type="button" class="sv-new" onclick={newShelf} aria-label={t('New category')}
          ><Glyph name="plus" size={16} /><span class="sv-new-long" aria-hidden="true"
            >{t('New category')}</span
          ><span class="sv-new-short" aria-hidden="true">{t('New')}</span></button
        >
      {/if}
    </header>

    {#if memory.loaded && memory.topics.length === 0 && memory.shelves.length === 0}
      <section class="sv-blank" aria-labelledby="blank-title">
        <div class="sv-blank-shelf" aria-hidden="true">
          <div class="sv-blank-pots">
            {#each [0, 1] as g (g)}
              <svg class="sv-ghost-pot" width="46" height="40" viewBox="11 62 62 46">
                <path
                  d="M17.5 73.5h49l-5.3 27.4a3.6 3.6 0 0 1-3.5 2.9H26.3a3.6 3.6 0 0 1-3.5-2.9zM13 64h58v10.5H13z"
                />
              </svg>
              {#if g === 0}<GrowingPot color="green" leaves={0} size={66} letter={false} />{/if}
            {/each}
          </div>
          <Plank />
        </div>
        <h2 id="blank-title">{t('Nothing planted yet')}</h2>
        <p>
          {t(
            'Add the first thing you studied. Put it in a category like Biology or Law, and it grows here as you check in.',
          )}
        </p>
        <div class="sv-blank-keys">
          <Key tone="leaf" big onclick={() => startAdding()}
            ><Glyph name="plus" size={18} />{t('Add what you studied')}</Key
          >
          <Key big onclick={newShelf}>{t('Make a category first')}</Key>
        </div>
      </section>
    {:else}
      <section
        class="sv-shelf"
        class:sv-narrow={narrow}
        aria-label={t('Categories')}
        bind:clientWidth={shelfWidth}
      >
        {#each racks as rack, r (r)}
          <div class="sv-rack">
            <div class="sv-board"><Plank /></div>
            <ul class="sv-pots">
              {#each rack as p (p.id)}
                <li>
                  <button type="button" aria-pressed={shelfFilter === p.id} onclick={() => pickShelf(p.id)}>
                    <span class="sv-pot-art"
                      ><GrowingPot shelf={p.shelf} leaves={Math.min(6, p.count)} size={60} /></span
                    >
                    <span class="sv-pot-tag">
                      <span class="sv-pot-name">{p.name}</span>
                      <span class="sv-pot-n">{tn(p.count, '1 topic', '{count} topics')}</span>
                    </span>
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
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
            ><Glyph name="edit" size={16} />{t('Edit category')}</button
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
  .sv-blank :global(.pk) {
    --pk-inset: 18%;
  }
  .sv-blank-pots {
    margin-bottom: -3px;
  }
  .sv-ghost-pot {
    display: block;
    margin-bottom: 3px;
  }
  .sv-ghost-pot path {
    fill: none;
    stroke: var(--color-border-strong);
    stroke-width: 1.5;
    stroke-dasharray: 4 3.5;
    stroke-linejoin: round;
  }
  .sv-blank-keys {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }
  .sv-blank h2 {
    margin: 2.25rem 0 0;
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
  /* The categories as pots on a wooden wall shelf, each plant as big as what it holds; tap one
     to see only it. */
  .sv-shelf {
    margin: 0.25rem 0 1.25rem;
    border: 1px solid var(--color-base-300);
    border-radius: 24px;
    background: linear-gradient(
      to bottom,
      var(--color-base-100) 40%,
      color-mix(in oklab, var(--color-base-200) 55%, var(--color-base-100))
    );
    padding-bottom: 0.375rem;
  }
  /* One shelf of pots. The board sits where the pots' feet are: 1.25rem of headroom + a 60px
     pot's foot. */
  .sv-rack {
    position: relative;
    padding: 1.25rem 2.75rem 0.5rem;
  }
  .sv-board {
    position: absolute;
    top: calc(1.25rem + 71px);
    left: 0.5rem;
    right: 0.5rem;
  }
  .sv-board :global(.pk) {
    --pk-inset: 0.625rem;
  }
  .sv-pots {
    position: relative;
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 0.5rem;
  }
  .sv-pots button {
    display: grid;
    justify-items: center;
    width: 5.75rem;
    padding: 0;
    border: 0;
    border-radius: 14px;
    background: none;
    color: var(--color-heading);
    font: inherit;
    cursor: pointer;
  }
  .sv-pot-art {
    display: block;
    height: 78px;
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .sv-pots button:hover .sv-pot-art {
    transform: translateY(-3px);
  }
  /* The name under the shelf; the category picked wears it on a green tag. */
  .sv-pot-tag {
    display: grid;
    justify-items: center;
    max-width: 100%;
    box-sizing: border-box;
    margin-top: 1.125rem;
    padding: 0.25rem 0.375rem 0.3125rem;
    border: 1px solid transparent;
    border-radius: 10px;
  }
  .sv-pots button[aria-pressed='true'] .sv-pot-tag {
    border-color: var(--color-leaf-line);
    background: var(--color-leaf-tab);
  }
  .sv-pots button[aria-pressed='true'] .sv-pot-name {
    color: var(--color-leaf-deep);
  }
  @media (prefers-reduced-motion: reduce) {
    .sv-pot-art {
      transition: none;
    }
    .sv-pots button:hover .sv-pot-art {
      transform: none;
    }
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
    line-height: 1.25;
    text-align: center;
    overflow-wrap: break-word;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
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

  .sv-new {
    margin-inline-start: auto;
    align-self: center;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0 1rem 0 0.875rem;
    border: 1px solid var(--color-leaf-line);
    border-radius: 999px;
    background: var(--color-leaf-tab);
    color: var(--color-leaf-deep);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
  .sv-new-short {
    display: none;
  }
  @media (max-width: 30rem) {
    .sv-new-long {
      display: none;
    }
    .sv-new-short {
      display: inline;
    }
  }
  .sv-total {
    white-space: nowrap;
  }
  .sv-narrow .sv-rack {
    padding-inline: 1.5rem;
  }
  .sv-narrow .sv-pots {
    gap: 0;
  }
  .sv-narrow .sv-pots button {
    width: 4.5rem;
  }
  .sv-narrow .sv-pot-tag {
    padding-inline: 0.125rem;
  }
  .sv-narrow .sv-pot-name {
    font-size: 0.8125rem;
  }
  .sv-narrow .sv-board :global(.pk) {
    --pk-inset: 0.25rem;
  }
  .sv-new:hover {
    background: color-mix(in oklab, var(--color-leaf-tab) 70%, var(--color-leaf-soft));
  }
  .sv-new:focus-visible {
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
