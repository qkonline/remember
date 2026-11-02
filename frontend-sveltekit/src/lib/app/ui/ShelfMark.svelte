<!--
  A shelf's mark: a soft square in the shelf's colour with the first letter of its name. A topic
  on no shelf gets a sprout on grey.

    <ShelfMark shelf={shelfOf(topic)} size={36} />
-->
<script lang="ts">
  import type { Shelf } from '#lib/app/store.svelte.ts';
  import Glyph from './Glyph.svelte';

  let { shelf, size = 32 }: { shelf: Shelf | null; size?: number } = $props();

  const letter = $derived(shelf ? (Array.from(shelf.name.trim())[0]?.toLocaleUpperCase() ?? '') : '');
</script>

<span
  class="sm shelf-{shelf?.color ?? 'none'}"
  style:width="{size}px"
  style:height="{size}px"
  style:font-size="{Math.round(size * 0.44)}px"
  aria-hidden="true"
>
  {#if shelf}{letter}{:else}<Glyph name="sprout" size={Math.round(size * 0.6)} />{/if}
</span>

<style>
  .sm {
    flex: none;
    display: inline-grid;
    place-items: center;
    border-radius: 30%;
    background: var(--sh-card);
    color: var(--sh-ink);
    font-weight: 600;
    line-height: 1;
  }
</style>
