<!--
  Public pages: built with their content, readable without JavaScript. Remember's mark and a
  light/dark switch in the header; the legal and contact links are hidden for now (the pages
  stay at their addresses).
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { t } from '#lib/i18n/index.svelte.ts';
  import Logo from '#lib/app/ui/Logo.svelte';
  import ModeSwitch from '#lib/app/ui/ModeSwitch.svelte';

  let { children } = $props();
</script>

<div class="site">
  <header class="top">
    <div class="bar">
      <a class="brand" href={resolve('')}><Logo size={28} />{appName}</a>
      <nav aria-label={t('Account')}>
        <ModeSwitch />
        <a href={resolve('signin')}>{t('Sign in')}</a>
      </nav>
    </div>
  </header>

  <main id="main">
    {@render children()}
  </main>

  <footer class="bar muted small">
    <span>© {new Date().getFullYear()} {appName}</span>
  </footer>
</div>

<style>
  .site {
    min-height: 100dvh;
    background: var(--color-base-100);
    display: flex;
    flex-direction: column;
  }

  .top {
    background: var(--color-base-100);
    border-bottom: var(--border) solid var(--color-base-300);
  }

  .top .bar {
    min-height: var(--header-height);
    padding-block: 0;
  }

  .bar {
    width: 100%;
    max-width: calc(var(--page-width) + 2 * var(--space-4));
    margin: 0 auto;
    padding: var(--space-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  nav {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 600;
    font-size: 1.0625rem;
    color: var(--color-heading);
    text-decoration: none;
  }

  nav a:not(:global(.btn)) {
    white-space: nowrap;
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  main {
    flex: 1;
    width: 100%;
    max-width: calc(var(--page-width) + 2 * var(--space-4));
    margin: 0 auto;
    padding: var(--space-6) var(--space-4) var(--space-8);
  }

  footer {
    border-top: 1px solid var(--color-border);
  }
</style>
