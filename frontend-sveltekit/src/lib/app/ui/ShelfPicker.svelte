<!--
  Which category a topic is in. A tray of tabs: the categories used most recently (up to four,
  plus the one picked), "No category", and a last tab that opens a finder: "All categories (N)"
  once there are more than fit, else "New category". The finder searches every category by
  name and offers to make one from what was typed, so a hundred categories never crowd the form.
  A new category is made when the form is saved. (In the code a category is a "shelf".)

    <ShelfPicker bind:shelf bind:newName />
-->
<script lang="ts">
  import Input from '#lib/components/ui/Input.svelte';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import { memory, type Shelf } from '#lib/app/store.svelte.ts';
  import ShelfMark from './ShelfMark.svelte';
  import Glyph from './Glyph.svelte';

  let {
    shelf = $bindable(),
    newName = $bindable(''),
    problem = null,
  }: {
    /** A category id, null for none, or 'new' while a new one is named in `newName`. */
    shelf: string | null;
    newName?: string;
    problem?: string | null;
  } = $props();

  const uid = $props.id();
  const SHOWN = 4;

  /** Categories by their latest topic (ids are time-ordered), then by name. */
  const ordered = $derived.by(() => {
    const latest: Record<string, string> = {};
    for (const x of memory.topics) if (x.shelf && (latest[x.shelf] ?? '') < x.id) latest[x.shelf] = x.id;
    return [...memory.shelves].sort(
      (a, b) => (latest[b.id] ?? '').localeCompare(latest[a.id] ?? '') || a.name.localeCompare(b.name),
    );
  });
  const many = $derived(ordered.length > SHOWN + 1);
  const tabs = $derived.by(() => {
    if (!many) return ordered;
    const top = ordered.slice(0, SHOWN);
    const picked = ordered.find((s) => s.id === shelf);
    return picked && !top.includes(picked) ? [...top.slice(0, SHOWN - 1), picked] : top;
  });
  const counts = $derived(
    new Map(memory.shelves.map((s) => [s.id, memory.topics.filter((x) => x.shelf === s.id).length])),
  );

  // The finder.
  let finding = $state(false);
  let query = $state('');
  let search = $state<HTMLInputElement>();
  const q = $derived(query.trim().toLocaleLowerCase());
  const found = $derived(q ? ordered.filter((s) => s.name.toLocaleLowerCase().includes(q)) : ordered);
  const exact = $derived(ordered.some((s) => s.name.trim().toLocaleLowerCase() === q));

  function openFinder() {
    finding = !finding;
    query = shelf === 'new' ? newName : '';
    if (finding) queueMicrotask(() => search?.focus());
  }
  function choose(s: Shelf) {
    shelf = s.id;
    newName = '';
    finding = false;
  }
  function make() {
    const name = query.trim();
    if (!name) return;
    newName = name.slice(0, 40);
    shelf = 'new';
    finding = false;
  }
  function finderKeys(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      // Close the finder, not the whole form.
      e.preventDefault();
      e.stopPropagation();
      finding = false;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const first = found[0];
      if (q && found.length === 1 && first) choose(first);
      else if (q && !exact) make();
      else if (first) choose(first);
    }
  }
</script>

<fieldset class="spk">
  <legend class="spk-legend">{t('Category')}</legend>
  <div class="spk-tray">
    {#each tabs as s (s.id)}
      <label class="spk-tab" class:spk-on={shelf === s.id}>
        <input
          type="radio"
          name="{uid}-shelf"
          value={s.id}
          checked={shelf === s.id}
          onchange={() => {
            shelf = s.id;
            newName = '';
          }}
        />
        <ShelfMark shelf={s} size={22} />
        <span class="spk-name">{s.name}</span>
      </label>
    {/each}
    {#if shelf === 'new' && newName}
      <label class="spk-tab spk-on">
        <input type="radio" name="{uid}-shelf" value="new" checked />
        <span class="spk-new-mark" aria-hidden="true"><Glyph name="plus" size={14} /></span>
        <span class="spk-name">{newName}</span>
        <span class="spk-badge">{t('new')}</span>
      </label>
    {/if}
    <label class="spk-tab" class:spk-on={shelf === null}>
      <input
        type="radio"
        name="{uid}-shelf"
        value=""
        checked={shelf === null}
        onchange={() => {
          shelf = null;
          newName = '';
        }}
      />
      <ShelfMark shelf={null} size={22} />
      <span class="spk-name">{t('No category')}</span>
    </label>
    <button
      type="button"
      class="spk-tab spk-find"
      class:spk-open={finding}
      aria-expanded={finding}
      aria-controls="{uid}-finder"
      onclick={openFinder}
    >
      {#if many}
        <Glyph name="search" size={16} /><span class="spk-name"
          >{t('All categories ({count})', { count: ordered.length })}</span
        >
      {:else}
        <Glyph name="plus" size={16} /><span class="spk-name">{t('New category')}</span>
      {/if}
    </button>
  </div>

  {#if finding}
    <div class="spk-finder" id="{uid}-finder">
      <div class="spk-search">
        <span class="spk-search-icon" aria-hidden="true"><Glyph name="search" size={18} /></span>
        <Input
          bind:ref={search}
          bind:value={query}
          type="search"
          maxlength={40}
          autocomplete="off"
          aria-label={many ? t('Find or name a category') : t('Name of the new category')}
          placeholder={many ? t('Find or name a category') : t('Biology, Law, Spanish…')}
          onkeydown={finderKeys}
        />
      </div>
      {#if found.length || q}
        <ul class="spk-list">
          {#each found as s (s.id)}
            <li>
              <button
                type="button"
                class="spk-row"
                class:spk-row-on={shelf === s.id}
                onclick={() => choose(s)}
              >
                <ShelfMark shelf={s} size={28} />
                <span class="spk-row-name">{s.name}</span>
                <span class="spk-row-n">{tn(counts.get(s.id) ?? 0, '1 topic', '{count} topics')}</span>
                {#if shelf === s.id}<Glyph name="check" size={18} />{/if}
              </button>
            </li>
          {/each}
          {#if q && !exact}
            <li>
              <button type="button" class="spk-row spk-make" onclick={make}>
                <span class="spk-new-mark spk-new-big" aria-hidden="true"
                  ><Glyph name="plus" size={16} /></span
                >
                <span class="spk-row-name">{t('Make “{name}”', { name: query.trim() })}</span>
                <span class="spk-row-n">{t('New category')}</span>
              </button>
            </li>
          {/if}
        </ul>
      {/if}
    </div>
  {/if}
  {#if problem}<p class="spk-problem" role="alert">{t(problem)}</p>{/if}
</fieldset>

<style>
  .spk {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  .spk-legend {
    font-weight: 500;
    font-size: 0.9375rem;
    margin-bottom: 0.5rem;
    color: var(--color-heading);
  }
  /* The tray: tabs with rounded corners on a soft ground; the one picked is raised. */
  .spk-tray {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--color-base-300);
    border-radius: 16px;
    background: var(--color-base-200);
  }
  .spk-tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    max-width: 100%;
    padding: 0 0.75rem 0 0.5rem;
    border: 1px solid transparent;
    border-radius: 12px;
    background: none;
    color: var(--color-base-content);
    font: inherit;
    font-size: 0.9375rem;
    cursor: pointer;
  }
  .spk-tab:hover {
    background: color-mix(in oklab, var(--color-base-100) 60%, transparent);
  }
  .spk-tab input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }
  .spk-tab:has(input:focus-visible),
  .spk-find:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }
  .spk-on {
    background: var(--color-base-100);
    border-color: var(--color-leaf-line);
    box-shadow: 0 1px 2px light-dark(rgb(23 61 15 / 0.12), rgb(0 0 0 / 0.4));
    color: var(--color-leaf-deep);
    font-weight: 500;
  }
  .spk-on:hover {
    background: var(--color-base-100);
  }
  .spk-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .spk-find {
    padding-inline: 0.75rem;
    color: var(--color-leaf-deep);
    font-weight: 500;
  }
  .spk-open {
    background: var(--color-base-100);
  }
  .spk-new-mark {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 30%;
    border: 1.5px dashed var(--color-leaf-line);
    color: var(--color-leaf-deep);
    flex: none;
  }
  .spk-new-big {
    width: 28px;
    height: 28px;
  }
  .spk-badge {
    padding: 0.0625rem 0.375rem;
    border-radius: 6px;
    background: var(--color-leaf-tab);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .spk-finder {
    margin-top: 0.5rem;
    border: 1px solid var(--color-base-300);
    border-radius: 16px;
    background: var(--color-base-100);
    box-shadow: 0 8px 24px -12px light-dark(rgb(23 61 15 / 0.25), rgb(0 0 0 / 0.6));
    overflow: hidden;
  }
  .spk-search {
    position: relative;
    padding: 0.5rem;
    border-bottom: 1px solid var(--color-base-300);
  }
  .spk-search :global(input) {
    padding-inline-start: 2.375rem;
    border-radius: 12px;
  }
  .spk-search-icon {
    position: absolute;
    left: 1.25rem;
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    color: var(--color-muted);
    pointer-events: none;
    z-index: 1;
  }
  .spk-list {
    list-style: none;
    margin: 0;
    padding: 0.25rem;
    max-height: 15rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .spk-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    min-height: 2.75rem;
    padding: 0.25rem 0.625rem;
    border: 0;
    border-radius: 10px;
    background: none;
    color: var(--color-base-content);
    font: inherit;
    text-align: start;
    cursor: pointer;
  }
  .spk-row:hover,
  .spk-row:focus-visible {
    background: var(--color-base-200);
    outline: none;
  }
  .spk-row:focus-visible {
    box-shadow: inset 0 0 0 2px var(--color-primary);
  }
  .spk-row-on {
    color: var(--color-leaf-deep);
  }
  .spk-row-name {
    flex: 1;
    min-width: 0;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .spk-row-n {
    font-size: 0.8125rem;
    color: var(--color-muted);
    white-space: nowrap;
  }
  .spk-make .spk-row-name {
    color: var(--color-leaf-deep);
  }
  .spk-problem {
    margin: 0.5rem 0 0;
    font-size: 0.875rem;
    color: var(--color-error);
  }
</style>
