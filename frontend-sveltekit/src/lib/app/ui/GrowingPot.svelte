<!--
  A pot in a shelf's colour with a plant in it that grows with what it holds: a seed at 0, then
  a leaf more for each step (up to 6), and a bud on top once it's full. Drawn in the shelf's
  colours (`.shelf-<colour>` from the frame), light and dark.

    <GrowingPot shelf={s} leaves={3} />
-->
<script lang="ts">
  import type { Shelf, ShelfColor } from '#lib/app/store.svelte.ts';

  let {
    shelf = null,
    color,
    leaves = 0,
    size = 84,
    letter: showLetter = true,
  }: {
    shelf?: Shelf | null;
    color?: ShelfColor;
    leaves?: number;
    size?: number;
    letter?: boolean;
  } = $props();

  const n = $derived(Math.max(0, Math.min(6, Math.round(leaves))));
  const top = $derived(64 - (10 + n * 8));
  const letter = $derived(shelf ? (Array.from(shelf.name.trim())[0]?.toLocaleUpperCase() ?? '') : '');
  const at = (i: number) => 60 - i * 8;
</script>

<svg
  class="gp shelf-{color ?? shelf?.color ?? 'none'}"
  width={size}
  height={size * 1.3}
  viewBox="0 0 84 110"
  aria-hidden="true"
>
  {#if n === 0}
    <ellipse cx="42" cy="63" rx="5" ry="3.4" class="gp-seed" />
  {:else}
    <path d="M42 66V{top}" class="gp-stem" />
    {#each Array.from({ length: n }, (_v, i) => i) as i (i)}
      {#if i % 2 === 0}
        <path
          d="M42 {at(i)}c0-7 5-11.5 14-11.5 0 7-5 11.5-14 11.5z"
          class="gp-leaf"
          class:gp-leaf-b={i % 4 === 0}
        />
      {:else}
        <path
          d="M42 {at(i)}c0-7-5-11.5-14-11.5 0 7 5 11.5 14 11.5z"
          class="gp-leaf"
          class:gp-leaf-b={i % 4 === 1}
        />
      {/if}
    {/each}
    {#if n >= 6}<circle cx="42" cy={top - 3} r="4.5" class="gp-bud" />{/if}
  {/if}
  <rect x="11" y="64" width="62" height="9" rx="3" class="gp-rim" />
  <path d="M15 72h54l-6 34H21z" class="gp-pot" />
  {#if showLetter && letter}<text x="42" y="95" text-anchor="middle" class="gp-letter">{letter}</text>{/if}
</svg>

<style>
  .gp {
    flex: none;
    display: block;
    overflow: visible;
  }
  .gp-pot,
  .gp-rim {
    fill: var(--sh-pot);
    stroke: color-mix(in oklab, var(--sh-ink) 35%, transparent);
    stroke-width: 1.2;
    stroke-linejoin: round;
  }
  .gp-rim {
    fill: color-mix(in oklab, var(--sh-pot) 80%, var(--sh-ink));
  }
  .gp-letter {
    fill: var(--sh-ink);
    font: 600 17px var(--font-sans);
  }
  .gp-stem {
    stroke: var(--color-leaf-line);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .gp-leaf {
    fill: var(--color-leaf-soft);
    stroke: var(--color-leaf-line);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .gp-leaf-b {
    fill: var(--color-leaf-bright);
  }
  .gp-bud {
    fill: light-dark(#fecdd3, #4a1f27);
    stroke: light-dark(#be123c, #fda4af);
    stroke-width: 1.4;
  }
  .gp-seed {
    fill: light-dark(#a16207, #ca8a04);
    opacity: 0.75;
  }
</style>
