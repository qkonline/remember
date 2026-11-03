<!--
  A pot in a category's colour with a plant in it that grows with what it holds: a seed in the
  soil at 0, then a leaf more for each step (up to 6, the lower ones larger), and a bud on top
  once it's full. Drawn like a glazed pot in daylight: a rolled rim, soil, a sheen on the left
  and shade on the right, in the category's colours (`.shelf-<colour>` from the frame), light
  and dark. The pot's foot sits at the bottom of the box, so it stands on whatever is below.

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
  const top = $derived(64 - (9 + n * 8));
  const letter = $derived(shelf ? (Array.from(shelf.name.trim())[0]?.toLocaleUpperCase() ?? '') : '');
  /** Where leaf i joins the stem, and how big it is (the first leaves are the largest). */
  const at = (i: number) => 59 - i * 8;
  const scale = (i: number) => 1.08 - i * 0.07;
</script>

<svg
  class="gp shelf-{color ?? shelf?.color ?? 'none'}"
  width={size}
  height={size * 1.3}
  viewBox="0 0 84 110"
  aria-hidden="true"
>
  <ellipse cx="42" cy="107.2" rx="25" ry="2.6" class="gp-ground" />

  <!-- The pot: body, shade on the right, sheen on the left, then the rim over it. -->
  <path d="M17.5 73.5h49l-5.3 27.4a3.6 3.6 0 0 1-3.5 2.9H26.3a3.6 3.6 0 0 1-3.5-2.9z" class="gp-pot" />
  <path d="M52 74h14l-5.1 26.6a3.6 3.6 0 0 1-3.5 2.9H49.5z" class="gp-shade" />
  <path d="M22.4 76.5h3.4l3 23.3h-2.4a1.6 1.6 0 0 1-1.6-1.3z" class="gp-sheen" />
  <rect x="13" y="64" width="58" height="10.5" rx="3.2" class="gp-rim" />
  <path d="M16.5 66.6h51" class="gp-rim-light" />
  <ellipse cx="42" cy="64.6" rx="25.5" ry="2.3" class="gp-soil" />

  {#if n === 0}
    <ellipse cx="42" cy="62.6" rx="4.4" ry="2.9" class="gp-seed" />
    <path d="M40.6 61.8q1-1 2.4-.9" class="gp-seed-shine" />
  {:else}
    <path d="M42 64.5C41.2 {(64 + top) / 2} 42.8 {(64 + top) / 2} 42 {top}" class="gp-stem" />
    {#each Array.from({ length: n }, (_v, i) => i) as i (i)}
      {@const side = i % 2 === 0 ? 1 : -1}
      <g transform="translate(42 {at(i)}) scale({side * scale(i)} {scale(i)})">
        <path
          d="M0 0C1.6-8.6 8.4-13.6 16.4-12.4 15-4.6 8.6.8 0 0z"
          class="gp-leaf"
          class:gp-leaf-b={i % 3 === 1}
        />
        <path d="M.8-.8C5-4.6 9.6-8 14.6-11.2" class="gp-vein" />
      </g>
    {/each}
    {#if n >= 6}
      <g transform="translate(42 {top})">
        <path
          d="M0 1C-3.2.4-4.6-2.2-4-4.6-1.8-4.2-.4-2.4 0 1zM0 1C3.2.4 4.6-2.2 4-4.6 1.8-4.2.4-2.4 0 1z"
          class="gp-leaf"
        />
        <path d="M0-1.6C-3-2.6-3.6-6.6 0-10.4 3.6-6.6 3-2.6 0-1.6z" class="gp-bud" />
      </g>
    {/if}
  {/if}

  {#if showLetter && letter}<text x="42" y="94.5" text-anchor="middle" class="gp-letter">{letter}</text>{/if}
</svg>

<style>
  .gp {
    flex: none;
    display: block;
    overflow: visible;
  }
  .gp-ground {
    fill: light-dark(rgb(70 52 24 / 0.16), rgb(0 0 0 / 0.45));
  }
  .gp-pot,
  .gp-rim {
    fill: var(--sh-pot);
    stroke: color-mix(in oklab, var(--sh-ink) 55%, transparent);
    stroke-width: 1.25;
    stroke-linejoin: round;
  }
  .gp-rim {
    fill: color-mix(in oklab, var(--sh-pot) 86%, var(--sh-ink));
  }
  .gp-shade {
    fill: var(--sh-ink);
    opacity: 0.09;
  }
  .gp-sheen {
    fill: light-dark(rgb(255 255 255 / 0.55), color-mix(in oklab, var(--sh-ink) 14%, transparent));
  }
  .gp-rim-light {
    stroke: light-dark(rgb(255 255 255 / 0.6), color-mix(in oklab, var(--sh-ink) 18%, transparent));
    stroke-width: 1.3;
    stroke-linecap: round;
  }
  .gp-soil {
    fill: light-dark(#6b5537, #2a2219);
  }
  .gp-letter {
    fill: var(--sh-ink);
    font: 600 15px var(--font-sans);
  }
  .gp-stem {
    fill: none;
    stroke: var(--color-leaf-line);
    stroke-width: 2.1;
    stroke-linecap: round;
  }
  .gp-leaf {
    fill: var(--color-leaf-soft);
    stroke: var(--color-leaf-line);
    stroke-width: 1.3;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  .gp-leaf-b {
    fill: var(--color-leaf-bright);
  }
  .gp-vein {
    fill: none;
    stroke: var(--color-leaf-line);
    stroke-width: 0.9;
    stroke-linecap: round;
    opacity: 0.55;
    vector-effect: non-scaling-stroke;
  }
  .gp-bud {
    fill: light-dark(#fecdd3, #4a1f27);
    stroke: light-dark(#be123c, #fda4af);
    stroke-width: 1.3;
    stroke-linejoin: round;
  }
  .gp-seed {
    fill: light-dark(#a16207, #ca8a04);
  }
  .gp-seed-shine {
    fill: none;
    stroke: light-dark(#fef3c7, #fde68a);
    stroke-width: 0.9;
    stroke-linecap: round;
    opacity: 0.8;
  }
</style>
