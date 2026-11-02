<!--
  Light or dark, one tap: a sun in dark mode (to go light), a moon in light mode (to go dark).
  It starts from what the page shows (the device's choice until someone picks), and keeps the
  pick on this device with the core's display preferences (Account → Display has the same).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '#lib/i18n/index.svelte.ts';
  import { readPreferences, setPreferences } from '#lib/preferences.ts';

  /** As a labelled row ("Dark mode"), for the sidebar; otherwise a round icon key. */
  let { row = false }: { row?: boolean } = $props();

  let dark = $state(false);

  function shown(): boolean {
    const mode = readPreferences().mode;
    if (mode !== 'system') return mode === 'dark';
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  onMount(() => {
    dark = shown();
    const query = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    const follow = () => (dark = shown());
    query?.addEventListener('change', follow);
    return () => query?.removeEventListener('change', follow);
  });

  function flip() {
    dark = !dark;
    setPreferences({ ...readPreferences(), mode: dark ? 'dark' : 'light' });
  }
</script>

<button
  type="button"
  class="ms"
  class:ms-row={row}
  onclick={flip}
  aria-label={row ? undefined : dark ? t('Switch to light mode') : t('Switch to dark mode')}
  title={row ? undefined : dark ? t('Switch to light mode') : t('Switch to dark mode')}
>
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    {#if dark}
      <circle cx="10" cy="10" r="3.6" class="ms-fill" />
      <path
        d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"
        class="ms-line"
      />
    {:else}
      <path d="M16.5 12.2A6.8 6.8 0 017.8 3.5a6.8 6.8 0 108.7 8.7z" class="ms-fill" />
    {/if}
  </svg>
  {#if row}<span>{dark ? t('Light mode') : t('Dark mode')}</span>{/if}
</button>

<style>
  .ms {
    flex: none;
    width: 2.75rem;
    height: 2.75rem;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 12px;
    background: none;
    color: var(--color-base-content);
    cursor: pointer;
  }
  .ms-row {
    width: 100%;
    height: auto;
    min-height: 2.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 0.75rem;
    color: var(--color-muted);
    font: inherit;
    text-align: start;
  }
  .ms-row svg {
    width: 22px;
    height: 22px;
  }
  .ms-row:hover {
    color: var(--color-heading);
  }
  .ms:hover {
    background: var(--color-base-200);
  }
  .ms:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .ms-fill {
    fill: var(--color-leaf-tint);
    stroke: var(--color-leaf-line);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .ms-line {
    stroke: var(--color-leaf-line);
    stroke-width: 1.5;
    stroke-linecap: round;
  }
</style>
