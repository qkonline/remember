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
  import Modal from '#lib/components/ui/Modal.svelte';
  import Button from '#lib/components/ui/Button.svelte';
  import {
    deleteShelf,
    editShelf,
    memory,
    SHELF_COLORS,
    type Shelf,
    type ShelfColor,
  } from '#lib/app/store.svelte.ts';
  import { startAdding } from '#lib/app/ui.svelte.ts';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import Pot from '#lib/app/ui/Pot.svelte';
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

  // Edit a shelf
  let editingShelf = $state(false);
  let shelfName = $state('');
  let shelfColor = $state<ShelfColor>('green');
  let confirmRemove = $state(false);
  const nameProblem = $derived(shelfName.trim() ? null : 'Name the shelf.');
  function startEditShelf() {
    if (!current) return;
    shelfName = current.name;
    shelfColor = current.color;
    editingShelf = true;
  }
  async function saveShelf(e: SubmitEvent) {
    e.preventDefault();
    if (!current || nameProblem) return;
    await editShelf(current.id, { name: shelfName, color: shelfColor });
    editingShelf = false;
  }
  async function removeShelf() {
    if (!current) return;
    await deleteShelf(current.id);
    confirmRemove = false;
    editingShelf = false;
    shelfFilter = null;
    syncUrl();
  }
  const colorName: Record<ShelfColor, string> = {
    green: 'Green',
    rose: 'Rose',
    yellow: 'Yellow',
    fuchsia: 'Fuchsia',
    lime: 'Lime',
    sand: 'Sand',
  };
</script>

<svelte:head><title>{t('Shelves')} · {appName}</title></svelte:head>

<div class="sv" class:sv-split={wide && memory.topics.length > 0}>
  <div class="sv-list">
    <header class="sv-head">
      <h1>{t('Shelves')}</h1>
      <span class="sv-total">{tn(memory.topics.length, '1 topic', '{count} topics')}</span>
    </header>

    {#if memory.loaded && memory.topics.length === 0}
      <p class="sv-empty">{t('Nothing here yet. Add the first thing you studied and it grows here.')}</p>
      <Key tone="leaf" big onclick={() => startAdding()}
        ><Glyph name="plus" size={18} />{t('Add what you studied')}</Key
      >
    {:else}
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

      {#if pots.length}
        <ul class="sv-pots" aria-label={t('Shelves')}>
          {#each pots as p (p.id)}
            <li>
              <button type="button" aria-pressed={shelfFilter === p.id} onclick={() => pickShelf(p.id)}>
                <Pot shelf={p.shelf} size={68} />
                <span class="sv-pot-name">{p.name}</span>
                <span class="sv-pot-n">{tn(p.count, '1 topic', '{count} topics')}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      {#if current}
        <div class="sv-shelf-bar">
          <span>{t('Only {shelf}', { shelf: current.name })}</span>
          <button type="button" onclick={startEditShelf}
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

{#if current}
  <Sheet title={t('Edit shelf')} bind:open={editingShelf}>
    <form id="edit-shelf" class="sv-form" onsubmit={saveShelf} novalidate>
      <Field label={t('Name')} invalid={!!nameProblem} hint={nameProblem ? t(nameProblem) : undefined}>
        <Input bind:value={shelfName} maxlength={40} autocomplete="off" />
      </Field>
      <fieldset class="sv-colors">
        <legend>{t('Colour')}</legend>
        <div>
          {#each SHELF_COLORS as c (c)}
            <label class="sv-color shelf-{c}" class:sv-color-on={shelfColor === c}>
              <input type="radio" name="shelf-color" value={c} bind:group={shelfColor} />
              <span class="sv-swatch" aria-hidden="true"></span>
              <span class="sv-color-name">{t(colorName[c])}</span>
            </label>
          {/each}
        </div>
      </fieldset>
      <button type="button" class="sv-remove" onclick={() => (confirmRemove = true)}
        >{t('Remove this shelf')}</button
      >
    </form>
    {#snippet foot()}
      <Key tone="leaf" big wide type="submit" form="edit-shelf">{t('Save shelf')}</Key>
    {/snippet}
  </Sheet>

  <Modal title={t('Remove {shelf}?', { shelf: current.name })} bind:open={confirmRemove}>
    <p>{t('Its topics stay, on no shelf, with all their check-ins.')}</p>
    {#snippet actions()}
      <Button onclick={() => (confirmRemove = false)}>{t('Keep it')}</Button>
      <Button variant="danger-solid" onclick={removeShelf}>{t('Remove shelf')}</Button>
    {/snippet}
  </Modal>
{/if}

<style>
  .sv-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
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
  .sv-pots {
    list-style: none;
    margin: 1rem -0.25rem 0;
    padding: 0;
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .sv-pots button {
    display: grid;
    justify-items: center;
    gap: 0.125rem;
    width: 5.25rem;
    padding: 0.5rem 0.25rem;
    border: 1.5px solid transparent;
    border-radius: 16px;
    background: none;
    color: var(--color-heading);
    font: inherit;
    cursor: pointer;
  }
  .sv-pots button:hover {
    background: var(--color-base-200);
  }
  .sv-pots button[aria-pressed='true'] {
    border-color: var(--color-leaf-line);
    background: var(--color-leaf-tab);
  }
  .sv-pots button:focus-visible,
  .sv-seg button:focus-visible,
  .sv-shelf-bar button:focus-visible,
  .sv-remove:focus-visible {
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

  .sv-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .sv-colors {
    border: 0;
    margin: 0;
    padding: 0;
  }
  .sv-colors legend {
    font-weight: 500;
    font-size: 0.9375rem;
    margin-bottom: 0.625rem;
  }
  .sv-colors div {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }
  .sv-color {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding: 0 0.625rem;
    border: 1px solid var(--color-base-300);
    border-radius: 12px;
    cursor: pointer;
  }
  .sv-color input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }
  .sv-color:has(input:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .sv-color-on {
    border: 1.5px solid var(--color-leaf-line);
    background: var(--color-leaf-tab);
  }
  .sv-swatch {
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 7px;
    background: var(--sh-pot);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.06);
  }
  .sv-color-name {
    font-size: 0.875rem;
  }
  .sv-remove {
    align-self: flex-start;
    min-height: 2.75rem;
    padding: 0;
    border: 0;
    background: none;
    color: light-dark(#be123c, #fb7185);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
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
