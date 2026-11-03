<!--
  Which shelf a topic sits on: a radio group of the person's shelves drawn as chips, "No shelf",
  and "New shelf", which opens a name field (the shelf is made when the form is saved).

    <ShelfPicker bind:shelf bind:newName />
-->
<script lang="ts">
  import Input from '#lib/components/ui/Input.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import { t } from '#lib/i18n/index.svelte.ts';
  import { memory } from '#lib/app/store.svelte.ts';
  import ShelfMark from './ShelfMark.svelte';
  import Glyph from './Glyph.svelte';

  let {
    shelf = $bindable(),
    newName = $bindable(''),
    problem = null,
  }: {
    /** A shelf id, null for none, or 'new' while a new one is being named. */
    shelf: string | null;
    newName?: string;
    problem?: string | null;
  } = $props();

  const uid = $props.id();
  const options = $derived([
    ...memory.shelves.map((s) => ({ value: s.id, label: s.name, shelf: s })),
    { value: '', label: t('No category'), shelf: null },
  ]);
</script>

<fieldset class="spk">
  <legend class="spk-legend">{t('Which category?')}</legend>
  <div class="spk-chips">
    {#each options as o (o.value)}
      <label class="spk-chip" class:spk-on={(shelf ?? '') === o.value}>
        <input
          type="radio"
          name="{uid}-shelf"
          value={o.value}
          checked={(shelf ?? '') === o.value}
          onchange={() => (shelf = o.value || null)}
        />
        <ShelfMark shelf={o.shelf} size={24} />
        <span>{o.label}</span>
      </label>
    {/each}
    <label class="spk-chip" class:spk-on={shelf === 'new'}>
      <input
        type="radio"
        name="{uid}-shelf"
        value="new"
        checked={shelf === 'new'}
        onchange={() => (shelf = 'new')}
      />
      <Glyph name="plus" size={16} />
      <span>{t('New category')}</span>
    </label>
  </div>
  {#if shelf === 'new'}
    <div class="spk-new">
      <Field
        label={t('Name of the new category')}
        invalid={!!problem}
        hint={problem ? t(problem) : undefined}
      >
        <Input
          bind:value={newName}
          maxlength={40}
          autocomplete="off"
          placeholder={t('Biology, Law, Spanish…')}
        />
      </Field>
    </div>
  {/if}
</fieldset>

<style>
  .spk {
    border: 0;
    padding: 0;
    margin: 0;
  }
  .spk-legend {
    font-weight: 500;
    font-size: 0.9375rem;
    margin-bottom: 0.625rem;
    color: var(--color-heading);
  }
  .spk-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .spk-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.4375rem;
    min-height: 2.75rem;
    padding: 0 0.875rem 0 0.5rem;
    border: 1px solid var(--color-base-300);
    border-radius: 999px;
    background: var(--color-base-100);
    font-size: 0.9375rem;
    cursor: pointer;
    user-select: none;
    color: var(--color-leaf-line);
  }
  .spk-chip span {
    color: var(--color-base-content);
  }
  .spk-chip input {
    position: absolute;
    opacity: 0;
    inset: 0;
    margin: 0;
    cursor: pointer;
  }
  .spk-chip:has(input:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .spk-on {
    border: 1.5px solid var(--color-leaf-line);
    background: var(--color-leaf-tint);
  }
  .spk-on span {
    color: var(--color-leaf-deep);
  }
  .spk-new {
    margin-top: 0.875rem;
  }
</style>
