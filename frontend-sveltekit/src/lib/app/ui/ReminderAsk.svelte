<!--
  Asked on Today once there is something to come back to, because a memory app can't rely on
  people remembering to open it. One tap sets the reminder; "Not now" stays gone on this device.
  An iPhone needs the app on the Home Screen first, so the prompt says so there and then.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Notice from '#lib/components/ui/Notice.svelte';
  import { t } from '#lib/i18n/index.svelte.ts';
  import { pushState, type PushState } from '#lib/push.ts';
  import { auth } from '#lib/session.svelte.ts';
  import { setReminder } from '#lib/app/reminder.ts';
  import { say } from '#lib/app/ui.svelte.ts';
  import Glyph from './Glyph.svelte';
  import Key from './Key.svelte';

  const ASKED_KEY = 'remember:reminder-asked';

  let at = $state('08:00');
  let push = $state<PushState>('off');
  let closed = $state(false);
  let saving = $state(false);
  let needs = $state<'install' | 'blocked' | null>(null);

  onMount(() => {
    void pushState().then((s) => (push = s));
    try {
      closed = localStorage.getItem(ASKED_KEY) !== null;
    } catch {
      // Private mode: it asks again next time.
    }
  });

  function notNow() {
    closed = true;
    try {
      localStorage.setItem(ASKED_KEY, '1');
    } catch {
      // Private mode: it asks again next time.
    }
  }

  async function remind() {
    if (!at || saving) return;
    saving = true;
    try {
      push = await setReminder(at, auth.features?.push?.vapidPublicKey ?? null, push);
      if (push === 'install' || push === 'blocked') needs = push;
      else say(t('You’ll get a reminder at {time}.', { time: at }));
    } finally {
      saving = false;
    }
  }
</script>

{#if needs}
  <Notice tone={needs === 'install' ? 'info' : 'warning'}>
    {needs === 'install'
      ? t(
          'Your reminder is saved. On an iPhone or iPad, add Remember to your Home Screen (Share, then Add to Home Screen) to get it.',
        )
      : t(
          'Your reminder is saved, but notifications are blocked for Remember. Allow them in this browser’s settings to get it.',
        )}
  </Notice>
{:else if !closed}
  <section class="ra" aria-labelledby="ask-title">
    <h2 id="ask-title"><Glyph name="bell" />{t('Want a reminder tomorrow?')}</h2>
    <div class="ra-row">
      <span class="ra-time"><Input type="time" bind:value={at} aria-label={t('Reminder time')} /></span>
      <Key tone="leaf" leaves={false} onclick={remind} disabled={saving || !at}>{t('Remind me')}</Key>
      <button type="button" class="ra-no" onclick={notNow}>{t('Not now')}</button>
    </div>
  </section>
{/if}

<style>
  .ra {
    display: grid;
    gap: 0.75rem;
    padding: 1rem 1.25rem 1.125rem;
    border-radius: 20px;
    background: var(--color-leaf-tab);
  }
  .ra h2 {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-heading);
  }
  .ra-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  .ra-time {
    width: 8.5rem;
  }
  .ra-no {
    min-height: 2.75rem;
    padding: 0 0.5rem;
    border: 0;
    background: none;
    color: var(--color-leaf-deep);
    font: inherit;
    cursor: pointer;
  }
  .ra-no:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 8px;
  }
</style>
