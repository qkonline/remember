<!--
  Remember's landing page: what it is in one plain sentence, where the idea comes from (Hermann
  Ebbinghaus's forgetting curve), how it works in three steps, and the way in. Built ahead of
  time, so it loads fast and search engines can read it.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { t } from '#lib/i18n/index.svelte.ts';
  import Key from '#lib/app/ui/Key.svelte';

  // A backend that can't tell where a social sign-in started sends the browser to the site's
  // root with `error=oauth_…` (contract: /auth/oauth/{provider}/callback); show it there.
  onMount(() => {
    const error = new URLSearchParams(location.search).get('error');
    if (error?.startsWith('oauth_'))
      goto(`${resolve('auth/callback')}?error=${encodeURIComponent(error)}`, { replace: true });
  });

  const steps = [
    {
      title: 'Add what you studied',
      text: 'Type the topic, put it in a category like Biology or Law, and choose how long you need it: a week, until your exam, or for good.',
    },
    {
      title: 'Check yourself for a few minutes a day',
      text: 'Each day Remember shows the few topics you’re about to forget. Try to recall each one, then tap Forgot, Hazy or Got it.',
    },
    {
      title: 'Keep it for as long as you need',
      text: 'The more it sticks, the less often it comes back. The last check lands just before your exam.',
    },
  ];
</script>

<svelte:head>
  <title>{appName}: {t('remember what you study')}</title>
  <meta
    name="description"
    content={t(
      'Remember brings back what you studied on the days you’re about to forget it, so it sticks for as long as you need it.',
    )}
  />
</svelte:head>

<section class="lp-hero">
  <div class="lp-hero-text">
    <h1>{t('Remember what you study, for as long as you need it.')}</h1>
    <p class="lp-lead">
      {t(
        'Remember is a simple study app. After you study something, add it and choose how long you need to keep it. Remember brings it back on the right days for a quick check, so it sticks without cramming.',
      )}
    </p>
    <div class="lp-row">
      <Key tone="leaf" big onclick={() => goto(resolve('signup'))}>{t('Create a free account')}</Key>
      <a class="lp-signin" href={resolve('signin')}>{t('Sign in')}</a>
    </div>
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

<section class="lp-why" aria-labelledby="why-title">
  <h2 id="why-title">{t('Why it works')}</h2>
  <p>
    {t(
      'In the 1880s the psychologist Hermann Ebbinghaus found that we forget most of what we learn within days, but each time we recall it at the right moment, we forget it more slowly. Remember plans those moments for you, for each topic.',
    )}
  </p>
</section>

<section class="lp-how" aria-labelledby="how-title">
  <h2 id="how-title">{t('How it works')}</h2>
  <ol>
    {#each steps as s, i (s.title)}
      <li>
        <span class="lp-num" aria-hidden="true">{i + 1}</span>
        <h3>{t(s.title)}</h3>
        <p>{t(s.text)}</p>
      </li>
    {/each}
  </ol>
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
  .lp-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.25rem;
    margin-top: 0.5rem;
  }
  .lp-signin {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    font-weight: 500;
    color: var(--color-link);
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

  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--color-heading);
  }
  .lp-why {
    margin-top: 3.5rem;
    padding: 1.5rem;
    border-radius: 24px;
    background: var(--color-leaf-tab);
    max-width: 48rem;
  }
  .lp-why p {
    margin: 0;
    font-size: 1.0625rem;
    line-height: 1.6;
    color: var(--color-base-content);
  }
  .lp-how {
    margin-top: 3rem;
    padding-bottom: 2rem;
  }
  .lp-how ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 1rem;
  }
  .lp-how li {
    padding: 1.25rem;
    border: 1px solid var(--color-base-300);
    border-radius: 20px;
  }
  .lp-num {
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 10px;
    background: var(--color-leaf);
    color: var(--color-leaf-ink);
    font-weight: 600;
  }
  .lp-how h3 {
    margin: 0.75rem 0 0.375rem;
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--color-heading);
  }
  .lp-how p {
    margin: 0;
    color: var(--color-muted);
    line-height: 1.55;
  }

  @media (min-width: 48rem) {
    .lp-hero {
      grid-template-columns: minmax(0, 1fr) auto;
      padding-top: 3.5rem;
    }
    .lp-art {
      width: 17.5rem;
    }
    .lp-how ol {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
