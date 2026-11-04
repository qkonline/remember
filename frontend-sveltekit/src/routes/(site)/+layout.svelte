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
      <a class="brand" href={resolve('')} aria-label={appName}
        ><Logo size={28} /><span class="brand-name">{appName}</span></a
      >
      <nav aria-label={t('Account')}>
        <ModeSwitch />
        <a class="auth" href={resolve('signin')}>{t('Sign in')}</a>
        <a class="auth auth-phone" href={resolve('signup')}>{t('Create account')}</a>
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

  .auth-phone {
    display: none;
  }

  /* Phones and small tablets only, until the desktop pass. */
  @media (max-width: 47.99rem) {
    .top .bar {
      gap: var(--space-2);
    }
    nav {
      gap: 0.375rem;
    }
    /* The switch keeps its tap area; only its spare width overlaps the gaps. */
    nav :global(.ms) {
      margin-inline: -0.375rem;
    }
    /* Links shaped as the app's raised keys: plain for Sign in, leaf for Create account. */
    nav a.auth {
      display: inline-flex;
      align-items: center;
      min-height: 2.5rem;
      padding-inline: 0.5rem;
      border: 1px solid var(--color-base-300);
      border-radius: 12px;
      background: var(--color-base-100);
      box-shadow: 0 3px 0 var(--color-base-300);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-leaf-deep);
      text-decoration: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    nav a.auth-phone {
      border-color: var(--color-leaf-key);
      background: var(--color-leaf-key);
      box-shadow: 0 3px 0 var(--color-leaf-edge);
      color: var(--color-leaf-ink);
    }
    nav a.auth:active {
      transform: translateY(3px);
      box-shadow: none;
    }
    nav a.auth:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
    footer.bar {
      justify-content: center;
    }
  }

  /* Both links and the theme switch fit beside the logo only without its name. */
  @media (max-width: 24.35rem) {
    .brand-name {
      display: none;
    }
  }
</style>
