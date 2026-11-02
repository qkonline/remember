<!--
  The family's sheet: rises from the bottom on a phone, stands at the right on a computer.
  On <dialog> like the core's Modal, so Escape, focus and the backdrop work the browser's way.

    <Sheet title="Add a topic" bind:open>…{#snippet foot()}<Key>Save</Key>{/snippet}</Sheet>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '#lib/i18n/index.svelte.ts';

  const uid = $props.id();

  let {
    title,
    open = $bindable(false),
    dismissible = true,
    hideTitle = false,
    onclose,
    foot,
    children,
  }: {
    title: string;
    open?: boolean;
    /** False keeps it open on Escape and outside clicks (unsaved changes). */
    dismissible?: boolean;
    /** The title is still read out, but not shown (the content carries its own heading). */
    hideTitle?: boolean;
    onclose?: () => void;
    foot?: Snippet;
    children: Snippet;
  } = $props();

  let dialog: HTMLDialogElement;

  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  function closed() {
    open = false;
    onclose?.();
  }
</script>

<dialog
  bind:this={dialog}
  class="modal modal-bottom sm:modal-end"
  aria-labelledby="{uid}-title"
  onclose={closed}
  oncancel={(e) => {
    if (!dismissible) e.preventDefault();
  }}
>
  <div class="modal-box sheet-box">
    <div class="sheet-grip" aria-hidden="true"></div>
    <header class="sheet-head">
      <h2 id="{uid}-title" class:sr-only={hideTitle}>{title}</h2>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square"
        aria-label={t('Close')}
        onclick={() => (open = false)}>✕</button
      >
    </header>
    <div class="sheet-body">{@render children()}</div>
    {#if foot}<footer class="sheet-foot">{@render foot()}</footer>{/if}
  </div>
  {#if dismissible}
    <form method="dialog" class="modal-backdrop"><button aria-label={t('Close')}>{t('Close')}</button></form>
  {/if}
</dialog>

<style>
  .sheet-box {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
    max-height: 92dvh;
    border-radius: var(--radius-box) var(--radius-box) 0 0;
  }
  .sheet-grip {
    align-self: center;
    width: 2.5rem;
    height: 0.25rem;
    border-radius: 999px;
    background: var(--color-base-300);
    margin-bottom: 0.25rem;
  }
  .sheet-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
  }
  .sheet-head h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    margin-inline-end: auto;
  }
  .sheet-body {
    overflow-y: auto;
    flex: 1;
  }
  .sheet-foot {
    display: flex;
    gap: 0.625rem;
  }
  @media (min-width: 40rem) {
    .sheet-box {
      height: 100dvh;
      max-height: none;
      width: 26rem;
      max-width: 100vw;
      border-radius: var(--radius-box) 0 0 var(--radius-box);
      padding: 1.25rem 1.5rem;
    }
    .sheet-grip {
      display: none;
    }
  }
</style>
