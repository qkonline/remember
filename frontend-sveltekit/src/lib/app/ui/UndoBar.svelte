<!--
  A short message after a change, with Undo: "Next check-in in 9 days. Undo". Stays a few
  seconds, longer while the pointer or focus is on it. Announced politely to screen readers.
-->
<script lang="ts">
  import { t } from '#lib/i18n/index.svelte.ts';

  let {
    message,
    onundo,
    ondone,
    ms = 10000,
  }: { message: string; onundo?: () => void; ondone: () => void; ms?: number } = $props();

  let hold = $state(false);

  $effect(() => {
    if (hold) return;
    const timer = setTimeout(ondone, ms);
    return () => clearTimeout(timer);
  });
</script>

<div
  class="ub"
  role="status"
  aria-live="polite"
  onpointerenter={() => (hold = true)}
  onpointerleave={() => (hold = false)}
  onfocusin={() => (hold = true)}
  onfocusout={() => (hold = false)}
>
  <span>{message}</span>
  {#if onundo}
    <button
      type="button"
      class="ub-undo"
      onclick={() => {
        onundo?.();
        ondone();
      }}>{t('Undo')}</button
    >
  {/if}
</div>

<style>
  .ub {
    position: fixed;
    inset-inline: 1rem;
    bottom: calc(1rem + env(safe-area-inset-bottom));
    z-index: var(--z-pop);
    margin-inline: auto;
    max-width: 28rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0.75rem 0.75rem 1rem;
    border-radius: var(--radius-box);
    background: var(--color-neutral);
    color: var(--color-neutral-content);
    box-shadow: var(--shadow-pop);
    font-weight: 500;
  }
  .ub-undo {
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
    min-height: 2.75rem;
    padding: 0 0.5rem;
    cursor: pointer;
  }
  .ub-undo:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 4px;
  }
</style>
