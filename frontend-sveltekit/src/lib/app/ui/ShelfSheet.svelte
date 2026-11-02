<!--
  Make a shelf, or change one: its name and colour, with a live pot showing how it will look.
  An existing shelf can be removed here too (after a confirm); its topics stay, on no shelf.

    <ShelfSheet bind:open shelf={null} oncreated={(id) => …} />   (new)
    <ShelfSheet bind:open shelf={s} onremoved={() => …} />        (edit)
-->
<script lang="ts">
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Modal from '#lib/components/ui/Modal.svelte';
  import Button from '#lib/components/ui/Button.svelte';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import {
    addShelf,
    deleteShelf,
    editShelf,
    memory,
    nextShelfColor,
    SHELF_COLORS,
    type Shelf,
    type ShelfColor,
  } from '#lib/app/store.svelte.ts';
  import { say } from '#lib/app/ui.svelte.ts';
  import GrowingPot from './GrowingPot.svelte';
  import Key from './Key.svelte';
  import Sheet from './Sheet.svelte';

  let {
    open = $bindable(false),
    shelf = null,
    oncreated,
    onremoved,
  }: {
    open?: boolean;
    /** The shelf to change; null makes a new one. */
    shelf?: Shelf | null;
    oncreated?: (id: string) => void;
    onremoved?: () => void;
  } = $props();

  const uid = $props.id();
  let name = $state('');
  let color = $state<ShelfColor>('green');
  let tried = $state(false);
  let saving = $state(false);
  let confirming = $state(false);
  let wasOpen = false;

  // A fresh form each time it opens (only then, so typing isn't undone by a sync).
  $effect(() => {
    if (open && !wasOpen) {
      name = shelf?.name ?? '';
      color = shelf?.color ?? nextShelfColor();
      tried = false;
    }
    wasOpen = open;
  });

  const problem = $derived(
    !name.trim()
      ? 'Name the shelf.'
      : memory.shelves.some(
            (s) =>
              s.id !== shelf?.id && s.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
          )
        ? 'You already have a shelf with this name.'
        : null,
  );
  const topics = $derived(shelf ? memory.topics.filter((x) => x.shelf === shelf.id).length : 0);
  const preview = $derived<Shelf>({ id: 'preview', name: name.trim() || '?', color });

  const colorName: Record<ShelfColor, string> = {
    green: 'Green',
    rose: 'Rose',
    yellow: 'Yellow',
    fuchsia: 'Fuchsia',
    lime: 'Lime',
    sand: 'Sand',
  };

  async function save(e: SubmitEvent) {
    e.preventDefault();
    tried = true;
    if (problem || saving) return;
    saving = true;
    try {
      if (shelf) {
        await editShelf(shelf.id, { name, color });
        say(t('Saved {shelf}.', { shelf: name.trim() }));
      } else {
        const id = await addShelf(name, color);
        say(t('Made the {shelf} shelf.', { shelf: name.trim() }));
        oncreated?.(id);
      }
      open = false;
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!shelf) return;
    const was = shelf.name;
    await deleteShelf(shelf.id);
    confirming = false;
    open = false;
    say(t('Removed {shelf}. Its topics are still here, on no shelf.', { shelf: was }));
    onremoved?.();
  }
</script>

<Sheet title={shelf ? t('Edit shelf') : t('New shelf')} bind:open dismissible={!name || name === shelf?.name}>
  <form id="{uid}-shelf" class="ss" onsubmit={save} novalidate>
    <div class="ss-preview" aria-hidden="true">
      <GrowingPot shelf={preview} leaves={Math.min(6, topics)} size={72} />
      <span class="ss-plank"></span>
    </div>

    <Field label={t('Name')} invalid={tried && !!problem} hint={tried && problem ? t(problem) : undefined}>
      <Input bind:value={name} maxlength={40} autocomplete="off" placeholder={t('Biology, Law, Spanish…')} />
    </Field>

    <fieldset class="ss-colors">
      <legend>{t('Colour')}</legend>
      <div>
        {#each SHELF_COLORS as c (c)}
          <label class="ss-color shelf-{c}" class:ss-on={color === c}>
            <input type="radio" name="{uid}-color" value={c} bind:group={color} />
            <span class="ss-swatch" aria-hidden="true"></span>
            <span>{t(colorName[c])}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    {#if shelf}
      <div class="ss-danger">
        <p>
          {topics
            ? tn(topics, '1 topic is on this shelf.', '{count} topics are on this shelf.')
            : t('No topics on this shelf yet.')}
        </p>
        <button type="button" class="ss-remove" onclick={() => (confirming = true)}
          >{t('Remove this shelf')}</button
        >
      </div>
    {/if}
  </form>

  {#snippet foot()}
    <Key tone="leaf" big wide type="submit" form="{uid}-shelf" disabled={saving}
      >{shelf ? t('Save shelf') : t('Make shelf')}</Key
    >
  {/snippet}
</Sheet>

{#if shelf}
  <Modal title={t('Remove {shelf}?', { shelf: shelf.name })} bind:open={confirming}>
    <p>{t('Its topics stay, on no shelf, with all their check-ins.')}</p>
    {#snippet actions()}
      <Button onclick={() => (confirming = false)}>{t('Keep it')}</Button>
      <Button variant="danger-solid" onclick={remove}>{t('Remove shelf')}</Button>
    {/snippet}
  </Modal>
{/if}

<style>
  .ss {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .ss-preview {
    display: grid;
    justify-items: center;
    padding: 0.75rem 0 0;
    border-radius: 18px;
    background: linear-gradient(to bottom, var(--color-base-100), var(--color-leaf-tab));
    overflow: hidden;
  }
  .ss-plank {
    display: block;
    width: 100%;
    height: 0.625rem;
    background: light-dark(#e3d5bc, #4a4234);
    box-shadow: inset 0 3px 0 light-dark(#efe5d3, #5a5141);
  }
  .ss-colors {
    border: 0;
    margin: 0;
    padding: 0;
  }
  .ss-colors legend {
    font-weight: 500;
    font-size: 0.9375rem;
    margin-bottom: 0.625rem;
  }
  .ss-colors div {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }
  .ss-color {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding: 0 0.625rem;
    border: 1px solid var(--color-base-300);
    border-radius: 12px;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .ss-color input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }
  .ss-color:has(input:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .ss-on {
    border: 1.5px solid var(--color-leaf-line);
    background: var(--color-leaf-tab);
  }
  .ss-swatch {
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 7px;
    background: var(--sh-pot);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.06);
  }
  .ss-danger {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-base-300);
  }
  .ss-danger p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-muted);
  }
  .ss-remove {
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    background: var(--color-base-100);
    color: light-dark(#be123c, #fb7185);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
  .ss-remove:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
