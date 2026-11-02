<!--
  One day in the Growth garden: bare soil with nothing checked in, then a seedling, two leaves, a
  small bush, and a flower for the busiest days (level 0–4 from growth.ts `level`). A day still
  to come is an empty patch.
-->
<script lang="ts">
  let { level, future = false }: { level: number; future?: boolean } = $props();
</script>

<svg class="ds" viewBox="0 0 32 32" aria-hidden="true">
  <path d="M5 27.5h22" class="ds-soil" class:ds-future={future} />
  {#if future}
    <!-- nothing yet -->
  {:else if level === 0}
    <circle cx="16" cy="25.5" r="1.4" class="ds-seed" />
  {:else}
    <path d="M16 27V{level >= 3 ? 11 : level === 2 ? 15 : 19}" class="ds-stem" />
    <path d="M16 {level === 1 ? 20 : 17}c0-4 2.8-6.5 7.5-6.5 0 4-2.8 6.5-7.5 6.5z" class="ds-leaf" />
    {#if level >= 2}<path d="M16 21c0-3.6-2.6-6-6.8-6 0 3.6 2.6 6 6.8 6z" class="ds-leaf ds-leaf-b" />{/if}
    {#if level >= 3}<path d="M16 14c0-3-2.2-5-5.6-5 0 3 2.2 5 5.6 5z" class="ds-leaf" />{/if}
    {#if level >= 4}<circle cx="16" cy="8.5" r="3.6" class="ds-bloom" /><circle
        cx="16"
        cy="8.5"
        r="1.3"
        class="ds-heart"
      />{/if}
  {/if}
</svg>

<style>
  .ds {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .ds-soil {
    stroke: light-dark(#d6c9b1, #4a4234);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .ds-future {
    stroke: var(--color-base-300);
    stroke-dasharray: 2 4;
    stroke-width: 2;
  }
  .ds-seed {
    fill: light-dark(#b8a27c, #6b5d43);
  }
  .ds-stem {
    stroke: var(--color-leaf-line);
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .ds-leaf {
    fill: var(--color-leaf-soft);
    stroke: var(--color-leaf-line);
    stroke-width: 1.2;
    stroke-linejoin: round;
  }
  .ds-leaf-b {
    fill: var(--color-leaf-bright);
  }
  .ds-bloom {
    fill: light-dark(#fecdd3, #4a1f27);
    stroke: light-dark(#be123c, #fda4af);
    stroke-width: 1.2;
  }
  .ds-heart {
    fill: light-dark(#facc15, #fde047);
  }
</style>
