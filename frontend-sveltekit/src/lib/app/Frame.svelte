<!--
  Remember's frame around every signed-in page (the core layout draws it in place of its own
  header and footer, see `appFrame` in frame.ts). On a phone: a slim top bar and a tab bar with
  the raised + key in the middle. From 64rem: a sidebar with the Add key, the pages, and the
  person at the bottom. The review screen (/review) gets no frame, to stay on one card.
  It also keeps the device's records loaded (`watch`), hosts the Add sheet and the note at the
  bottom, and holds the shelf colours every page uses (`.shelf-<colour>`).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { appName } from '#lib/config.ts';
  import type { User } from '#lib/api/index.ts';
  import { auth } from '#lib/session.svelte.ts';
  import { msg, t } from '#lib/i18n/index.svelte.ts';
  import Avatar from '#lib/components/Avatar.svelte';
  import Bell from '#lib/components/Bell.svelte';
  import FeedbackDialog from '#lib/components/FeedbackDialog.svelte';
  import SyncRefused from '#lib/components/shell/SyncRefused.svelte';
  import SyncStatus from '#lib/components/shell/SyncStatus.svelte';
  import Trans from '#lib/components/Trans.svelte';
  import { memory, watch } from '#lib/app/store.svelte.ts';
  import { todayList } from '#lib/app/schedule/index.ts';
  import { startAdding, ui } from '#lib/app/ui.svelte.ts';
  import AddSheet from '#lib/app/ui/AddSheet.svelte';
  import Glyph, { type GlyphName } from '#lib/app/ui/Glyph.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import Leaves from '#lib/app/ui/Leaves.svelte';
  import Logo from '#lib/app/ui/Logo.svelte';
  import ModeSwitch from '#lib/app/ui/ModeSwitch.svelte';
  import UndoBar from '#lib/app/ui/UndoBar.svelte';

  let { user, children }: { user: User; children: Snippet } = $props();

  onMount(() => watch());

  type Tab =
    '/(app)/app' | '/(app)/topics' | '/(app)/topic' | '/(app)/growth' | '/(app)/settings' | '/(app)/account';
  const tabs: { path: Tab; label: string; glyph: GlyphName; also?: Tab[] }[] = [
    { path: '/(app)/app', label: msg('Today'), glyph: 'today' },
    { path: '/(app)/topics', label: msg('Shelves'), glyph: 'shelves', also: ['/(app)/topic'] },
    { path: '/(app)/growth', label: msg('Growth'), glyph: 'growth' },
    { path: '/(app)/settings', label: msg('You'), glyph: 'you', also: ['/(app)/account'] },
  ];

  const here = $derived(page.url.pathname.replace(/\/$/, '') || '/');
  const isCurrent = (tab: (typeof tabs)[number]) =>
    [tab.path, ...(tab.also ?? [])].some((p) => here === resolve(p)) ? 'page' : undefined;
  const bare = $derived(here === resolve('/(app)/review'));

  const due = $derived(
    memory.loaded
      ? todayList(
          memory.topics.filter((x) => x.state === 'active'),
          memory.today,
          memory.settings.dailyCap,
          memory.settings.retention,
        ).now.length
      : 0,
  );
  const teamsOn = $derived(!!auth.features?.teams);
  const adminOn = $derived(!!auth.features?.admin && !!user.isAdmin && !auth.support);
  let feedback = $state<ReturnType<typeof FeedbackDialog>>();
</script>

<div class="rf" class:rf-bare={bare}>
  {#if !bare}
    <header class="rf-top">
      <a class="rf-brand" href={resolve('/(app)/app')}><Logo />{appName}</a>
      <div class="rf-tools">
        {#if auth.features?.sync}<SyncStatus />{/if}
        <ModeSwitch />
        <Bell />
      </div>
    </header>

    <aside class="rf-side" aria-label={t('Remember')}>
      <a class="rf-brand rf-brand-side" href={resolve('/(app)/app')}><Logo size={28} />{appName}</a>
      <Key tone="leaf" wide onclick={() => startAdding()}>
        <Glyph name="plus" size={18} />{t('Add what you studied')}
      </Key>
      <nav class="rf-nav" aria-label={t('Main')}>
        {#each tabs as tab (tab.path)}
          <a href={resolve(tab.path)} aria-current={isCurrent(tab)}>
            <Glyph name={tab.glyph} />
            <span>{t(tab.label)}</span>
            {#if tab.path === '/(app)/app' && due}<span class="rf-count">{due}</span>{/if}
          </a>
        {/each}
        {#if teamsOn}
          <a
            href={resolve('/(app)/teams')}
            aria-current={here.startsWith(resolve('/(app)/team')) ? 'page' : undefined}
            ><Glyph name="cards" /><span>{t('Teams')}</span></a
          >
        {/if}
        {#if adminOn}
          <a
            href={resolve('/(app)/admin')}
            aria-current={here.startsWith(resolve('/(app)/admin')) ? 'page' : undefined}
            ><Glyph name="edit" /><span>{t('Admin')}</span></a
          >
        {/if}
      </nav>
      <div class="rf-me">
        <div class="rf-tools">
          {#if auth.features?.sync}<SyncStatus />{/if}
          <ModeSwitch />
          <Bell />
        </div>
        <a class="rf-person" href={resolve('/(app)/account')}>
          <Avatar {user} size={34} />
          <span>{user.name || user.email}</span>
        </a>
        <p class="rf-small">
          <button type="button" onclick={() => feedback?.show()}>{t('Send feedback')}</button>
        </p>
      </div>
    </aside>
  {/if}

  <div class="rf-page">
    {#if auth.features?.sync}<SyncRefused />{/if}
    {#if !user.emailVerified}
      <div class="rf-banner" role="region" aria-label={t('Email not confirmed')}>
        <p>
          <Trans
            text={msg(
              'Confirm your email address, <b>{email}</b>, so you can always get back into your account.',
            )}
            vars={{ email: user.email }}
          >
            {#snippet b(s: string)}<strong>{s}</strong>{/snippet}
          </Trans>
          <a href="{resolve('/(app)/account')}#email">{t('Confirm it')}</a>
        </p>
      </div>
    {/if}
    <main id="main" class="rf-main">
      {@render children()}
    </main>
  </div>

  {#if !bare}
    <nav class="rf-tabs" aria-label={t('Main')}>
      {#each tabs.slice(0, 2) as tab (tab.path)}
        <a href={resolve(tab.path)} aria-current={isCurrent(tab)}><Glyph name={tab.glyph} />{t(tab.label)}</a>
      {/each}
      <button
        type="button"
        class="rf-add"
        aria-label={t('Add what you studied')}
        onclick={() => startAdding()}
      >
        <Leaves size={52} /><Glyph name="plus" size={24} />
      </button>
      {#each tabs.slice(2) as tab (tab.path)}
        <a href={resolve(tab.path)} aria-current={isCurrent(tab)}><Glyph name={tab.glyph} />{t(tab.label)}</a>
      {/each}
    </nav>
  {/if}
</div>

<AddSheet bind:open={ui.adding} />
{#if ui.note}
  {#key ui.note}
    <UndoBar message={ui.note.message} onundo={ui.note.undo} ondone={() => (ui.note = null)} />
  {/key}
{/if}
<FeedbackDialog bind:this={feedback} />

<style>
  /* Shelf colours, light and dark: the pot, the card and the text or letter on them. */
  :global(.shelf-green) {
    --sh-pot: light-dark(#c6eab0, #2c4a22);
    --sh-card: light-dark(#e6f6dc, #1d2e19);
    --sh-ink: light-dark(#1f4a14, #c3eaab);
  }
  :global(.shelf-rose) {
    --sh-pot: light-dark(#fecdd3, #4a1f27);
    --sh-card: light-dark(#ffe4e6, #2e171b);
    --sh-ink: light-dark(#9f1239, #fda4af);
  }
  :global(.shelf-yellow) {
    --sh-pot: light-dark(#fde68a, #4a3d12);
    --sh-card: light-dark(#fef9c3, #2c2712);
    --sh-ink: light-dark(#854d0e, #fde68a);
  }
  :global(.shelf-fuchsia) {
    --sh-pot: light-dark(#f5d0fe, #45204c);
    --sh-card: light-dark(#fae8ff, #2a172e);
    --sh-ink: light-dark(#86198f, #f0abfc);
  }
  :global(.shelf-lime) {
    --sh-pot: light-dark(#d9f99d, #3a4a14);
    --sh-card: light-dark(#ecfccb, #232c10);
    --sh-ink: light-dark(#3f6212, #d9f99d);
  }
  :global(.shelf-sand),
  :global(.shelf-none) {
    --sh-pot: light-dark(#e7e2d8, #3d3a33);
    --sh-card: light-dark(#f3f0ea, #26241f);
    --sh-ink: light-dark(#57534e, #d6d3d1);
  }

  .rf {
    min-height: 100dvh;
    background: var(--color-base-100);
  }
  /* The note at the bottom stands above the tab bar (UndoBar reads --ub-lift). */
  :global(body:has(.rf-tabs)) {
    --ub-lift: 5.25rem;
  }
  @media (min-width: 64rem) {
    :global(body:has(.rf-tabs)) {
      --ub-lift: 0px;
    }
  }

  .rf-top {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 3.5rem;
    padding: env(safe-area-inset-top) 1rem 0;
    background: var(--color-base-100);
  }
  .rf-brand {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    min-height: 2.75rem;
    color: var(--color-heading);
    font-weight: 600;
    font-size: 1.0625rem;
    text-decoration: none;
  }
  .rf-tools {
    margin-inline-start: auto;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .rf-side {
    display: none;
  }

  .rf-page {
    padding-bottom: calc(6.5rem + env(safe-area-inset-bottom));
  }
  .rf-main {
    width: 100%;
    max-width: 75rem;
    margin: 0 auto;
    padding: 0.5rem 1rem 1.5rem;
    box-sizing: border-box;
  }
  .rf-bare .rf-page {
    padding-bottom: 0;
  }
  .rf-bare .rf-main {
    max-width: none;
    padding: 0;
  }

  .rf-banner {
    background: var(--color-notice);
    border-bottom: 1px solid var(--color-notice-border);
    color: var(--color-heading);
  }
  .rf-banner p {
    max-width: 75rem;
    margin: 0 auto;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }

  /* The tab bar: the current tab joins the page; the + key stands up out of the bar. */
  .rf-tabs {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    display: flex;
    align-items: flex-start;
    justify-content: space-around;
    height: calc(5.25rem + env(safe-area-inset-bottom));
    padding: 0 0.5rem env(safe-area-inset-bottom);
    background: var(--color-base-100);
    border-top: 1px solid var(--color-base-300);
  }
  .rf-tabs a {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 0.1875rem;
    width: 4.25rem;
    height: 3.75rem;
    margin-top: -1px;
    border-radius: 0 0 14px 14px;
    color: var(--color-muted);
    font-size: 0.75rem;
    text-decoration: none;
  }
  .rf-tabs a[aria-current='page'] {
    background: var(--color-leaf-tab);
    color: var(--color-leaf-deep);
    font-weight: 500;
  }
  .rf-tabs a:focus-visible,
  .rf-nav a:focus-visible,
  .rf-add:focus-visible,
  .rf-brand:focus-visible,
  .rf-person:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .rf-add {
    position: relative;
    overflow: hidden;
    margin-top: -1.125rem;
    width: 3.75rem;
    height: 3.75rem;
    border: 0;
    border-radius: 16px;
    background: var(--color-leaf);
    color: var(--color-leaf-ink);
    display: grid;
    place-items: center;
    box-shadow:
      0 4px 0 var(--color-leaf-edge),
      0 10px 18px rgb(23 33 25 / 0.18);
    cursor: pointer;
    transition:
      transform 80ms ease,
      box-shadow 80ms ease;
  }
  .rf-add :global(.gl) {
    position: relative;
  }
  .rf-add:active {
    transform: translateY(3px);
    box-shadow:
      0 1px 0 var(--color-leaf-edge),
      0 6px 12px rgb(23 33 25 / 0.14);
  }

  @media (min-width: 64rem) {
    .rf {
      display: grid;
      grid-template-columns: 16rem minmax(0, 1fr);
    }
    .rf-bare {
      display: block;
    }
    .rf-top,
    .rf-tabs {
      display: none;
    }
    .rf-side {
      position: sticky;
      top: 0;
      height: 100dvh;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 1.375rem;
      padding: 1.5rem 1.125rem;
      border-right: 1px solid var(--color-base-300);
    }
    .rf-brand-side {
      padding: 0 0.375rem;
      font-size: 1.125rem;
    }
    .rf-side :global(.rk) {
      white-space: nowrap;
      font-size: 0.9375rem;
      padding: 0 0.875rem;
    }
    .rf-nav {
      display: grid;
      gap: 0.25rem;
    }
    .rf-nav a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 2.75rem;
      padding: 0 0.75rem;
      border-radius: 12px;
      color: var(--color-muted);
      text-decoration: none;
    }
    .rf-nav a:hover {
      background: var(--color-base-200);
      color: var(--color-heading);
    }
    .rf-nav a[aria-current='page'] {
      background: var(--color-leaf-tab);
      color: var(--color-leaf-deep);
      font-weight: 500;
    }
    .rf-count {
      margin-inline-start: auto;
      min-width: 1.5rem;
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
      background: var(--color-leaf-soft);
      color: var(--color-leaf-deep);
      font-size: 0.8125rem;
      font-weight: 500;
      text-align: center;
    }
    .rf-me {
      margin-top: auto;
      display: grid;
      gap: 0.75rem;
    }
    .rf-me .rf-tools {
      margin: 0;
    }
    .rf-person {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-height: 2.75rem;
      padding: 0 0.375rem;
      border-radius: 12px;
      color: var(--color-heading);
      font-size: 0.875rem;
      text-decoration: none;
      overflow: hidden;
    }
    .rf-person span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rf-person:hover {
      background: var(--color-base-200);
    }
    .rf-small {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.875rem;
      margin: 0;
      padding: 0 0.375rem;
      font-size: 0.8125rem;
    }
    .rf-small button {
      color: var(--color-muted);
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      text-decoration: none;
      cursor: pointer;
    }
    .rf-small button:hover {
      text-decoration: underline;
    }
    .rf-page {
      padding-bottom: 0;
      min-width: 0;
    }
    .rf-main {
      padding: 2rem 2.5rem 3rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rf-add {
      transition: none;
    }
  }
</style>
