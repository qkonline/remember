<!-- The frame for the sign-in pages: the app's mark, then one centred panel with a heading. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import Logo from '#lib/app/ui/Logo.svelte';
  import ModeSwitch from '#lib/app/ui/ModeSwitch.svelte';

  let { title, lead, children }: { title: string; lead?: string; children: Snippet } = $props();
</script>

<svelte:head><title>{title} · {appName}</title></svelte:head>

<div class="shell">
  <div class="mode"><ModeSwitch /></div>
  <a class="brand" href={resolve('')}><Logo size={30} />{appName}</a>
  <main id="main" class="auth-card stack">
    <header>
      <h1>{title}</h1>
      {#if lead}<p class="muted">{lead}</p>{/if}
    </header>
    {@render children()}
  </main>
</div>

<style>
  .shell {
    position: relative;
    min-height: 100dvh;
    padding: var(--space-7) var(--space-4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-lg);
    font-weight: var(--weight-heading);
    color: var(--color-heading);
    text-decoration: none;
  }

  .mode {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
  }

  .auth-card {
    width: 100%;
    max-width: 26rem;
    gap: var(--space-5);
    padding: var(--space-6);
    background: var(--color-base-100);
    border: var(--border) solid var(--color-base-300);
    border-radius: var(--radius-box);
  }

  header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  h1 {
    font-size: var(--text-xl);
  }

  @media (max-width: 30rem) {
    .shell {
      padding-top: var(--space-5);
    }

    .auth-card {
      padding: var(--space-5) var(--space-4);
    }
  }
</style>
