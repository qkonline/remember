<!--
  A shelf drawn as a flower pot in its colour, with two cards growing out of it.
-->
<script lang="ts">
  import type { Shelf } from '#lib/app/store.svelte.ts';
  import Glyph from './Glyph.svelte';

  let { shelf, size = 76 }: { shelf: Shelf | null; size?: number } = $props();

  const letter = $derived(shelf ? (Array.from(shelf.name.trim())[0]?.toLocaleUpperCase() ?? '') : '');
</script>

<span class="pot shelf-{shelf?.color ?? 'none'}" style:--pot-size="{size}px" aria-hidden="true">
  <span class="pot-card pot-back"></span>
  <span class="pot-card pot-front"></span>
  <span class="pot-body"
    >{#if shelf}{letter}{:else}<Glyph name="sprout" size={16} />{/if}</span
  >
</span>

<style>
  .pot {
    position: relative;
    display: block;
    width: var(--pot-size);
    height: calc(var(--pot-size) * 0.92);
    flex: none;
  }
  .pot-card {
    position: absolute;
    top: 0;
    width: 34%;
    height: 54%;
    border-radius: 6px;
    border: 1px solid var(--color-base-300);
  }
  .pot-back {
    left: 21%;
    top: 6%;
    background: var(--color-base-100);
    transform: rotate(-12deg);
  }
  .pot-front {
    left: 42%;
    background: var(--sh-card);
    transform: rotate(10deg);
  }
  .pot-body {
    position: absolute;
    left: 8%;
    right: 8%;
    bottom: 0;
    height: 54%;
    clip-path: polygon(0 0, 100% 0, 88% 100%, 12% 100%);
    background: var(--sh-pot);
    color: var(--sh-ink);
    display: grid;
    place-items: center;
    font-weight: 600;
    font-size: calc(var(--pot-size) * 0.2);
  }
</style>
