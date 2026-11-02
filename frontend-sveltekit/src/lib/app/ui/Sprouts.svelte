<!--
  How far a topic has grown: a sprout per check-in done, a seed per one still to come.
-->
<script lang="ts">
  import { tn } from '#lib/i18n/index.svelte.ts';

  let { done, total, size = 16 }: { done: number; total: number; size?: number } = $props();

  const all = $derived(Math.max(total, done));
  const shown = $derived(Math.min(all, 8));
</script>

<span
  class="sp"
  role="img"
  aria-label={tn(all, '{done} of 1 check-in done', '{done} of about {count} check-ins done', { done })}
>
  {#each Array.from({ length: shown }, (_v, i) => i) as i (i)}
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {#if i < done}
        <path d="M8 14V8M8 8c0-3 2-5 5-5 0 3-2 5-5 5z" class="sp-grown" />
      {:else}
        <path d="M8 14V9" class="sp-seed-stem" /><circle cx="8" cy="8" r="1.6" class="sp-seed" />
      {/if}
    </svg>
  {/each}
</span>

<style>
  .sp {
    display: inline-flex;
    gap: 3px;
    align-items: center;
    vertical-align: middle;
  }
  .sp-grown {
    fill: var(--color-leaf-bright);
    stroke: var(--color-leaf-line);
    stroke-width: 1.3;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .sp-seed-stem {
    stroke: var(--color-border-strong);
    stroke-width: 1.3;
    stroke-linecap: round;
  }
  .sp-seed {
    fill: var(--color-border-strong);
  }
</style>
