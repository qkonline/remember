<!--
  Remember's landing page: the problem and how it works in two lines, the way in, the plant, and
  a picture of the product: reviews spreading out towards an exam, and a card to rate. Built ahead
  of time, so it loads fast and search engines can read it.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { t } from '#lib/i18n/index.svelte.ts';
  import type { Shelf } from '#lib/app/store.svelte.ts';
  import CardDeck from '#lib/app/ui/CardDeck.svelte';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import Key from '#lib/app/ui/Key.svelte';
  import PlanLine from '#lib/app/ui/PlanLine.svelte';
  import ShelfMark from '#lib/app/ui/ShelfMark.svelte';

  // A backend that can't tell where a social sign-in started sends the browser to the site's
  // root with `error=oauth_…` (contract: /auth/oauth/{provider}/callback); show it there.
  onMount(() => {
    const error = new URLSearchParams(location.search).get('error');
    if (error?.startsWith('oauth_'))
      goto(`${resolve('auth/callback')}?error=${encodeURIComponent(error)}`, { replace: true });
  });

  // The picture of how it works: dates that never show, on a row like the one in the Add form.
  const DEMO_START = '2026-01-01';
  const DEMO_END = '2026-04-01';
  const demoPlan = ['2026-01-02', '2026-01-08', '2026-01-24', '2026-03-28'];
  const demoShelf = { id: 'demo', name: 'B', color: 'green' } as Shelf;
</script>

<svelte:head>
  <title>{appName}: {t('stop forgetting what you study')}</title>
  <meta
    name="description"
    content={t(
      'Remember brings back what you studied on the days you’re about to forget it, so it sticks for as long as you need it.',
    )}
  />
</svelte:head>

<section class="lp-hero">
  <div class="lp-hero-text">
    <h1>{t('Stop forgetting what you study.')}</h1>
    <p class="lp-lead">
      {t(
        'Add a topic and your notes. No flashcards to write. We bring it back on the right days, until your exam or for good.',
      )}
    </p>
    <Key tone="leaf" big onclick={() => goto(resolve('signup'))}>{t('Get started free')}</Key>
  </div>

  <svg class="lp-art" width="280" height="290" viewBox="0 0 240 250" aria-hidden="true">
    <circle cx="120" cy="120" r="104" class="lp-art-sun" />
    <path d="M120 200V80" class="lp-art-stem" />
    <path d="M120 104c0-30 20-48 54-48 0 30-20 48-54 48z" class="lp-art-leaf-a" />
    <path d="M120 134c0-24-17-40-44-40 0 24 17 40 44 40z" class="lp-art-leaf-b" />
    <path d="M120 82c0-16 10-26 26-26" class="lp-art-stem" fill="none" />
    <circle cx="146" cy="56" r="9" class="lp-art-bud" />
    <path d="M88 200h64l-8 34H96z" class="lp-art-pot" />
  </svg>
</section>

<section class="lp-demo" aria-label={t('How it looks')}>
  <PlanLine
    plan={demoPlan}
    start={DEMO_START}
    end={DEMO_END}
    today={DEMO_START}
    name={(d) => (d === demoPlan[1] ? t('Next week') : d === demoPlan.at(-1) ? t('Your exam') : '')}
  />
  <div class="lp-card" inert>
    <CardDeck>
      <div class="lp-card-top">
        <ShelfMark shelf={demoShelf} size={30} />
        <span>{t('Biology')}</span>
      </div>
      <p class="lp-card-title">{t('Photosynthesis')}</p>
      <div class="lp-rate">
        <Key tone="forgot"><Glyph name="cross" size={16} />{t('Forgot')}</Key>
        <Key tone="hazy"><Glyph name="wave" size={16} />{t('Partly')}</Key>
        <Key tone="leaf"><Glyph name="check" size={16} />{t('Remembered')}</Key>
      </div>
    </CardDeck>
  </div>
</section>

<style>
  .lp-hero {
    display: grid;
    gap: 2rem;
    align-items: center;
    padding-top: 2rem;
  }
  .lp-hero-text {
    display: grid;
    gap: 1.25rem;
    max-width: 38rem;
  }
  h1 {
    margin: 0;
    font-size: clamp(2.125rem, 6vw, 3.25rem);
    line-height: 1.08;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--color-heading);
  }
  .lp-lead {
    margin: 0;
    font-size: 1.1875rem;
    line-height: 1.55;
    color: var(--color-muted);
    max-width: 36rem;
  }
  .lp-hero-text :global(.rk) {
    justify-self: start;
  }
  .lp-art {
    justify-self: center;
    width: 12rem;
    max-width: 100%;
    height: auto;
  }
  .lp-art-sun {
    fill: var(--color-leaf-tab);
  }
  .lp-art-stem {
    stroke: var(--color-leaf-line);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .lp-art-leaf-a,
  .lp-art-leaf-b {
    stroke: var(--color-leaf-line);
    stroke-width: 2.2;
  }
  .lp-art-leaf-a {
    fill: var(--color-leaf-soft);
  }
  .lp-art-leaf-b {
    fill: var(--color-leaf-bright);
  }
  .lp-art-bud {
    fill: light-dark(#fecdd3, #4a1f27);
    stroke: light-dark(#9f1239, #fda4af);
    stroke-width: 1.8;
  }
  .lp-art-pot {
    fill: light-dark(#fde68a, #4a3d12);
    stroke: light-dark(#854d0e, #fde68a);
    stroke-width: 2;
    stroke-linejoin: round;
  }

  .lp-demo {
    display: grid;
    gap: 1.5rem;
    margin: 3rem 0 2.5rem;
    padding: 1.5rem 1.25rem 1.25rem;
    border-radius: 24px;
    background: var(--color-base-200);
  }
  .lp-card {
    width: min(100%, 30rem);
    margin-inline: auto;
  }
  .lp-card-top {
    --sh-card: var(--color-leaf-tint);
    --sh-ink: var(--color-leaf-deep);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-leaf-deep);
  }
  .lp-card-title {
    margin: auto 0 0;
    font-size: 1.5rem;
    line-height: 1.15;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-heading);
  }
  .lp-rate {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.3fr);
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  .lp-rate :global(.rk) {
    padding: 0 0.25rem;
    font-size: 0.875rem;
  }
  .lp-rate :global(.rk-in) {
    gap: 0.25rem;
  }

  @media (min-width: 48rem) {
    .lp-hero {
      grid-template-columns: minmax(0, 1fr) auto;
      padding-top: 3.5rem;
    }
    .lp-art {
      width: 17.5rem;
    }
  }
</style>
