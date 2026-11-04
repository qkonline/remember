<!--
  Settings, in one place: the daily reminder, how many topics a day, the theme, the account (the
  core's page), feedback and sign out, with how often to review tucked under "More". Each change
  saves itself. Notifications on this device are turned on with the reminder.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { auth, signOut } from '#lib/session.svelte.ts';
  import FeedbackDialog from '#lib/components/FeedbackDialog.svelte';
  import { msg, t } from '#lib/i18n/index.svelte.ts';
  import Input from '#lib/components/ui/Input.svelte';
  import Notice from '#lib/components/ui/Notice.svelte';
  import { modes, readPreferences, setPreferences, type Mode } from '#lib/preferences.ts';
  import { pushState, type PushState } from '#lib/push.ts';
  import { setReminder } from '#lib/app/reminder.ts';
  import { memory, saveSettings } from '#lib/app/store.svelte.ts';
  import type { Retention } from '#lib/app/schedule/index.ts';
  import Glyph from '#lib/app/ui/Glyph.svelte';
  import GrowingPot from '#lib/app/ui/GrowingPot.svelte';
  import WateringCan from '#lib/app/ui/WateringCan.svelte';

  let push = $state<PushState>('off');
  let mode = $state<Mode>('system');
  onMount(() => {
    void pushState().then((s) => (push = s));
    mode = readPreferences().mode;
  });
  const vapid = $derived(auth.features?.push?.vapidPublicKey ?? null);

  // The reminder: on with the time last shown here, or 8:00 the first time.
  let at = $state('08:00');
  $effect(() => {
    if (memory.settings.reminderAt) at = memory.settings.reminderAt;
  });
  const remind = $derived(memory.settings.reminderAt !== null);
  const timeOk = $derived(/^([01]\d|2[0-3]):[0-5]\d$/.test(at));

  async function saveReminder(time: string | null) {
    push = await setReminder(time, vapid, push);
  }

  const frequencies: { value: Retention; label: string; hint: string }[] = [
    { value: 0.8, label: msg('Less'), hint: msg('Fewer reviews. Expect to recall about 8 in 10.') },
    { value: 0.9, label: msg('Normal'), hint: msg('The usual. Expect to recall about 9 in 10.') },
    { value: 0.95, label: msg('More'), hint: msg('For things that must stick. About 19 in 20.') },
  ];
  const frequencyHint = $derived(frequencies.find((f) => f.value === memory.settings.retention)?.hint ?? '');

  const caps = [5, 10, 15, 20, 30, 50];
  const capAt = $derived(Math.max(0, caps.indexOf(memory.settings.dailyCap)));
  const stepCap = (by: number) =>
    saveSettings({ dailyCap: caps[Math.min(caps.length - 1, Math.max(0, capAt + by))] });

  function pickMode(value: Mode) {
    mode = value;
    setPreferences({ ...readPreferences(), mode: value });
  }

  const teamsOn = $derived(!!auth.features?.teams);
  const adminOn = $derived(!!auth.features?.admin && !!auth.user?.isAdmin && !auth.support);
  let feedback = $state<ReturnType<typeof FeedbackDialog>>();
</script>

<svelte:head><title>{t('Settings')} · {appName}</title></svelte:head>

<div class="st">
  <header class="st-head">
    <h1>{t('Settings')}</h1>
    <span class="st-art" aria-hidden="true">
      <GrowingPot color="green" leaves={3} size={56} letter={false} />
      <WateringCan size={66} />
    </span>
  </header>

  <section class="st-box" aria-labelledby="remind-title">
    <div class="st-row">
      <span class="st-tile"><Glyph name="bell" /></span>
      <h2 id="remind-title">{t('Daily reminder')}</h2>
      <input
        type="checkbox"
        role="switch"
        class="toggle toggle-primary"
        aria-labelledby="remind-title"
        checked={remind}
        onchange={(e) => saveReminder(e.currentTarget.checked ? at : null)}
      />
    </div>
    {#if remind}
      <div class="st-under">
        <label class="st-time">
          <span>{t('Time')}</span>
          <Input
            type="time"
            bind:value={at}
            onchange={() => {
              if (timeOk) void saveReminder(at);
            }}
          />
        </label>
        {#if push === 'install'}
          <Notice tone="info"
            >{t(
              'On an iPhone or iPad, add Remember to your Home Screen first (Share, then Add to Home Screen), and turn the reminder on there.',
            )}</Notice
          >
        {:else if push === 'blocked'}
          <Notice tone="warning"
            >{t(
              'Notifications are blocked for Remember in this browser’s settings. Allow them there to get the reminder.',
            )}</Notice
          >
        {:else if push === 'unsupported' || !vapid}
          <Notice tone="warning"
            >{t(
              'This browser can’t show notifications. The reminder still reaches your other devices.',
            )}</Notice
          >
        {/if}
      </div>
    {/if}
  </section>

  <section class="st-box">
    <div class="st-row">
      <span class="st-tile"><Glyph name="cards" /></span>
      <h2 id="cap-title">{t('Topics per day')}</h2>
      <span class="st-step" role="group" aria-labelledby="cap-title">
        <button type="button" onclick={() => stepCap(-1)} disabled={capAt === 0} aria-label={t('Fewer')}
          >−</button
        >
        <output aria-live="polite" aria-labelledby="cap-title">{memory.settings.dailyCap}</output>
        <button
          type="button"
          onclick={() => stepCap(1)}
          disabled={capAt === caps.length - 1}
          aria-label={t('More topics')}>+</button
        >
      </span>
    </div>
  </section>

  <section class="st-box">
    <div class="st-row st-row-wrap">
      <span class="st-tile"><Glyph name="sun" /></span>
      <h2 id="theme-title">{t('Theme')}</h2>
      <div class="st-seg" role="radiogroup" aria-labelledby="theme-title">
        {#each modes as m (m.value)}
          <button type="button" role="radio" aria-checked={mode === m.value} onclick={() => pickMode(m.value)}
            >{t(m.label)}</button
          >
        {/each}
      </div>
    </div>
  </section>

  <nav class="st-links" aria-label={t('More')}>
    <a href={resolve('/(app)/account')}>
      <span class="st-tile"><Glyph name="you" /></span>
      <span class="st-link-text"
        >{t('Account')}<small>{auth.user?.email ?? t('Email, password, your data')}</small></span
      >
      <span aria-hidden="true">›</span>
    </a>
    {#if teamsOn}
      <a href={resolve('/(app)/teams')}>
        <span class="st-tile"><Glyph name="cards" /></span>
        <span class="st-link-text">{t('Teams')}</span>
        <span aria-hidden="true">›</span>
      </a>
    {/if}
    {#if adminOn}
      <a href={resolve('/(app)/admin')}>
        <span class="st-tile"><Glyph name="edit" /></span>
        <span class="st-link-text">{t('Admin')}</span>
        <span aria-hidden="true">›</span>
      </a>
    {/if}
    <button type="button" onclick={() => feedback?.show()}>
      <span class="st-tile"><Glyph name="message" /></span>
      <span class="st-link-text">{t('Send feedback')}</span>
      <span aria-hidden="true">›</span>
    </button>
    <button type="button" onclick={() => signOut()}>
      <span class="st-tile"><Glyph name="exit" /></span>
      <span class="st-link-text">{t('Sign out')}</span>
    </button>
  </nav>

  <details class="st-more">
    <summary>{t('More settings')}</summary>
    <div class="st-more-in">
      <h2 id="freq-title">{t('Review frequency')}</h2>
      <p>{t(frequencyHint)}</p>
      <div class="st-seg" role="radiogroup" aria-labelledby="freq-title">
        {#each frequencies as f (f.value)}
          <button
            type="button"
            role="radio"
            aria-checked={memory.settings.retention === f.value}
            onclick={() => saveSettings({ retention: f.value })}>{t(f.label)}</button
          >
        {/each}
      </div>
    </div>
  </details>

  <p class="st-note">{t('Changes save automatically.')}</p>
</div>

<FeedbackDialog bind:this={feedback} />

<style>
  .st {
    max-width: 36rem;
    margin-inline: auto;
    display: grid;
    gap: 0.625rem;
  }
  .st-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    min-height: 6rem;
    margin-bottom: 0.25rem;
    padding: 0.75rem 1.25rem 0;
    border-radius: 22px;
    background: var(--color-leaf-tab);
    overflow: hidden;
  }
  h1 {
    align-self: center;
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-heading);
  }
  .st-art {
    display: flex;
    align-items: flex-end;
    gap: 0.25rem;
  }
  .st-box,
  .st-links {
    border: 1px solid var(--color-base-300);
    border-radius: 18px;
  }
  .st-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 3.5rem;
    padding: 0.5rem 0.875rem;
  }
  .st-row-wrap {
    flex-wrap: wrap;
  }
  .st-row h2 {
    flex: 1;
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-heading);
  }
  .st-tile {
    flex: none;
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 30%;
    background: var(--color-leaf-tab);
  }
  .st-under {
    display: grid;
    gap: 0.75rem;
    padding: 0 0.875rem 0.875rem 3.875rem;
  }
  .st-time {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-muted);
    font-size: 0.9375rem;
  }
  .st-time :global(.input) {
    width: 8.5rem;
  }
  .st-step {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--color-base-300);
    border-radius: 12px;
  }
  .st-step button {
    width: 2.5rem;
    height: 2.5rem;
    border: 0;
    background: none;
    color: var(--color-leaf-deep);
    font: inherit;
    font-size: 1.125rem;
    cursor: pointer;
  }
  .st-step button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .st-step output {
    min-width: 1.75rem;
    text-align: center;
    font-weight: 500;
  }
  .st-seg {
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--color-base-300);
    border-radius: 12px;
    background: var(--color-base-200);
  }
  .st-seg button {
    min-height: 2.25rem;
    padding: 0 0.75rem;
    border: 0;
    border-radius: 9px;
    background: none;
    color: var(--color-muted);
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .st-seg button[aria-checked='true'] {
    background: var(--color-base-100);
    box-shadow: 0 1px 0 var(--color-base-300);
    color: var(--color-leaf-deep);
    font-weight: 500;
  }
  .st-links {
    display: grid;
    overflow: hidden;
  }
  .st-links a,
  .st-links button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 3.5rem;
    padding: 0.5rem 0.875rem;
    border: 0;
    background: none;
    color: var(--color-muted);
    font: inherit;
    text-align: start;
    text-decoration: none;
    cursor: pointer;
  }
  .st-links :is(a, button) + :is(a, button) {
    border-top: 1px solid var(--color-base-300);
  }
  .st-links a:hover,
  .st-links button:hover {
    background: var(--color-base-200);
  }
  .st-link-text {
    flex: 1;
    min-width: 0;
    color: var(--color-heading);
    font-weight: 500;
  }
  .st-link-text small {
    display: block;
    font-size: 0.8125rem;
    font-weight: 400;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .st-more {
    margin-top: 0.25rem;
  }
  .st-more summary {
    width: fit-content;
    min-height: 2.75rem;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--color-primary);
    font-weight: 500;
    cursor: pointer;
    list-style-position: inside;
  }
  .st-more-in {
    display: grid;
    gap: 0.5rem;
    padding: 0.875rem;
    border: 1px solid var(--color-base-300);
    border-radius: 18px;
  }
  .st-more-in h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-heading);
  }
  .st-more-in p {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.875rem;
  }
  .st-more-in .st-seg button {
    flex: 1;
  }
  .st-note {
    margin: 0 0.25rem;
    color: var(--color-muted);
    font-size: 0.8125rem;
  }
  .st-seg button:focus-visible,
  .st-step button:focus-visible,
  .st-more summary:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 8px;
  }
  .st-links a:focus-visible,
  .st-links button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
</style>
