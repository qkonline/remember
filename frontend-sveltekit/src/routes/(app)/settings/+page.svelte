<!--
  You: the person, and Remember's settings: the daily reminder (a time the person picks, never a
  default), how many cards a day at most, and how firmly to hold on (the recall to aim for).
  Nothing saves on its own: changes wait for Save, as in Boardo and Elastic. Notifications on
  this device are turned on with the reminder. Then the account, the core's pages, and sign out.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { appName } from '#lib/config.ts';
  import { auth, signOut } from '#lib/session.svelte.ts';
  import Avatar from '#lib/components/Avatar.svelte';
  import FeedbackDialog from '#lib/components/FeedbackDialog.svelte';
  import { msg, t } from '#lib/i18n/index.svelte.ts';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Toggle from '#lib/components/ui/Toggle.svelte';
  import Notice from '#lib/components/ui/Notice.svelte';
  import { toast } from '#lib/components/ui/toast.svelte.ts';
  import { pushOn, pushState, type PushState } from '#lib/push.ts';
  import { memory, saveSettings } from '#lib/app/store.svelte.ts';
  import { RETENTIONS, type Retention } from '#lib/app/schedule/index.ts';
  import Key from '#lib/app/ui/Key.svelte';
  import Glyph from '#lib/app/ui/Glyph.svelte';

  onMount(() => {
    void pushState().then((s) => (push = s));
  });

  let push = $state<PushState>('off');
  const vapid = $derived(auth.features?.push?.vapidPublicKey ?? null);

  // The draft: starts from what's saved, and again whenever what's saved changes elsewhere.
  let remind = $state(false);
  let at = $state('');
  let cap = $state('15');
  let retention = $state<string>('0.9');
  let saving = $state(false);
  let tried = $state(false);

  function fromSaved() {
    remind = memory.settings.reminderAt !== null;
    at = memory.settings.reminderAt ?? '';
    cap = String(memory.settings.dailyCap);
    retention = String(memory.settings.retention);
  }
  let synced = false;
  $effect(() => {
    if (memory.loaded && !synced) {
      fromSaved();
      synced = true;
    }
  });

  const dirty = $derived(
    memory.loaded &&
      (remind !== (memory.settings.reminderAt !== null) ||
        (remind && at !== (memory.settings.reminderAt ?? '')) ||
        cap !== String(memory.settings.dailyCap) ||
        retention !== String(memory.settings.retention)),
  );
  const timeProblem = $derived(
    remind && !/^([01]\d|2[0-3]):[0-5]\d$/.test(at) ? 'Pick a time for the reminder.' : null,
  );

  const intensities: { value: string; label: string; hint: string }[] = [
    { value: '0.8', label: msg('Lightly'), hint: msg('Fewer check-ins. Expect to recall about 8 in 10.') },
    { value: '0.9', label: msg('Steady'), hint: msg('The usual. Expect to recall about 9 in 10.') },
    {
      value: '0.95',
      label: msg('Firmly'),
      hint: msg('More check-ins, for things that must stick. About 19 in 20.'),
    },
  ];
  const intensityHint = $derived(intensities.find((i) => i.value === retention)?.hint ?? '');

  async function save() {
    tried = true;
    if (timeProblem || saving) return;
    saving = true;
    try {
      if (remind && vapid && push !== 'on' && push !== 'install' && push !== 'unsupported') {
        try {
          push = await pushOn(vapid);
        } catch (e) {
          toast(e instanceof Error ? e.message : t('Notifications couldn’t be turned on.'), {
            tone: 'error',
          });
        }
      }
      const r = Number(retention);
      await saveSettings({
        reminderAt: remind ? at : null,
        dailyCap: Number(cap),
        retention: (RETENTIONS as readonly number[]).includes(r) ? (r as Retention) : 0.9,
      });
      tried = false;
      toast(t('Settings saved'), { tone: 'success' });
    } finally {
      saving = false;
    }
  }

  const caps = [5, 10, 15, 20, 30, 50];
  const capAt = $derived(Math.max(0, caps.indexOf(Number(cap))));
  const stepCap = (by: number) => (cap = String(caps[Math.min(caps.length - 1, Math.max(0, capAt + by))]));
  const user = $derived(auth.user);
  const teamsOn = $derived(!!auth.features?.teams);
  const adminOn = $derived(!!auth.features?.admin && !!user?.isAdmin && !auth.support);
  let feedback = $state<ReturnType<typeof FeedbackDialog>>();
</script>

<svelte:head><title>{t('You')} · {appName}</title></svelte:head>

<div class="st">
  {#if user}
    <header class="st-me">
      <Avatar {user} size={48} />
      <span class="st-me-text">
        <h1>{user.name || t('You')}</h1>
        <span>{user.email}</span>
      </span>
    </header>
  {/if}

  <section class="st-card" aria-labelledby="remind-title">
    <div class="st-row">
      <Glyph name="bell" />
      <span class="st-row-text">
        <h2 id="remind-title">{t('Daily reminder')}</h2>
        <span>{t('One notification a day, only when something is waiting.')}</span>
      </span>
    </div>
    <div class="st-inner">
      <Toggle label={t('Remind me each day')} bind:checked={remind} />
      {#if remind}
        <div class="st-time">
          <Field
            label={t('At')}
            invalid={tried && !!timeProblem}
            hint={tried && timeProblem ? t(timeProblem) : undefined}
          >
            <Input type="time" bind:value={at} required />
          </Field>
        </div>
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
        {:else if push === 'off'}
          <p class="st-hint">{t('Saving asks this device for permission to show notifications.')}</p>
        {/if}
      {/if}
    </div>
  </section>

  <section class="st-card" aria-labelledby="cap-title">
    <div class="st-row">
      <Glyph name="cards" />
      <span class="st-row-text">
        <h2 id="cap-title">{t('Cards a day, at most')}</h2>
        <span>{t('Busier days wait for the next ones, so a day never gets long.')}</span>
      </span>
      <span class="st-step" role="group" aria-label={t('Cards a day, at most')}>
        <button type="button" onclick={() => stepCap(-1)} disabled={capAt === 0} aria-label={t('Fewer')}
          >−</button
        >
        <output aria-live="polite" aria-label={t('Cards a day')}>{cap}</output>
        <button
          type="button"
          onclick={() => stepCap(1)}
          disabled={capAt === caps.length - 1}
          aria-label={t('More')}>+</button
        >
      </span>
    </div>
  </section>

  <section class="st-card" aria-labelledby="intensity-title">
    <div class="st-row">
      <Glyph name="sprout" />
      <span class="st-row-text">
        <h2 id="intensity-title">{t('How firmly to hold on')}</h2>
        <span>{t(intensityHint)}</span>
      </span>
    </div>
    <div class="st-seg" role="radiogroup" aria-labelledby="intensity-title">
      {#each intensities as i (i.value)}
        <button
          type="button"
          role="radio"
          aria-checked={retention === i.value}
          onclick={() => (retention = i.value)}>{t(i.label)}</button
        >
      {/each}
    </div>
  </section>

  <div class="st-bar" class:st-bar-on={dirty}>
    <Key tone="leaf" leaves={false} onclick={save} disabled={!dirty || saving}>{t('Save')}</Key>
    {#if dirty}<button type="button" class="st-discard" onclick={fromSaved}>{t('Discard changes')}</button
      >{/if}
  </div>

  <nav class="st-links" aria-label={t('More')}>
    <a href={resolve('/(app)/account')}
      ><span>{t('Account, appearance and your data')}</span><span aria-hidden="true">›</span></a
    >
    {#if teamsOn}<a href={resolve('/(app)/teams')}
        ><span>{t('Teams')}</span><span aria-hidden="true">›</span></a
      >{/if}
    {#if adminOn}<a href={resolve('/(app)/admin')}
        ><span>{t('Admin')}</span><span aria-hidden="true">›</span></a
      >{/if}
    <button type="button" onclick={() => feedback?.show()}
      ><span>{t('Send feedback')}</span><span aria-hidden="true">›</span></button
    >
    <a href={resolve('contact')}><span>{t('Contact')}</span><span aria-hidden="true">›</span></a>
    <a href={resolve('privacy')}><span>{t('Privacy')}</span><span aria-hidden="true">›</span></a>
  </nav>

  <button type="button" class="st-out" onclick={() => signOut()}>{t('Sign out')}</button>
</div>

<FeedbackDialog bind:this={feedback} />

<style>
  .st {
    max-width: 40rem;
    display: grid;
    gap: 0.875rem;
  }
  .st-me {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    margin: 0.25rem 0 0.5rem;
  }
  .st-me-text {
    display: grid;
    min-width: 0;
  }
  .st-me h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-heading);
  }
  .st-me-text span {
    color: var(--color-muted);
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .st-card {
    border: 1px solid var(--color-base-300);
    border-radius: 20px;
    padding: 1rem;
  }
  .st-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .st-row-text {
    flex: 1;
    display: grid;
    gap: 0.125rem;
    min-width: 0;
  }
  .st-row-text h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-heading);
  }
  .st-row-text span {
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
  .st-inner {
    display: grid;
    gap: 0.75rem;
    margin-top: 0.875rem;
    padding-top: 0.875rem;
    border-top: 1px solid var(--color-base-300);
  }
  .st-time {
    max-width: 12rem;
  }
  .st-hint {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.875rem;
  }
  .st-step {
    flex: none;
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--color-base-300);
    border-radius: 12px;
  }
  .st-step button {
    width: 2.75rem;
    height: 2.75rem;
    border: 0;
    background: none;
    color: var(--color-leaf-line);
    font: inherit;
    font-size: 1.25rem;
    cursor: pointer;
  }
  .st-step button:disabled {
    color: var(--color-base-300);
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
    margin-top: 0.875rem;
    padding: 4px;
    border-radius: 12px;
    background: var(--color-base-200);
    border: 1px solid var(--color-base-300);
  }
  .st-seg button {
    flex: 1;
    min-height: 2.5rem;
    border: 0;
    border-radius: 9px;
    background: none;
    color: var(--color-muted);
    font: inherit;
    font-size: 0.9375rem;
    cursor: pointer;
  }
  .st-seg button[aria-checked='true'] {
    background: var(--color-base-100);
    box-shadow: 0 1px 0 var(--color-base-300);
    color: var(--color-leaf-deep);
    font-weight: 500;
  }
  .st-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .st-discard,
  .st-out {
    background: none;
    border: 0;
    color: var(--color-link);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    min-height: 2.75rem;
  }
  .st-out {
    justify-self: center;
    color: var(--color-muted);
  }
  .st-links {
    display: grid;
    border: 1px solid var(--color-base-300);
    border-radius: 20px;
    overflow: hidden;
  }
  .st-links a,
  .st-links button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 3.25rem;
    padding: 0 1rem;
    border: 0;
    border-bottom: 1px solid var(--color-base-300);
    background: none;
    color: var(--color-base-content);
    font: inherit;
    text-align: start;
    text-decoration: none;
    cursor: pointer;
  }
  .st-links > :last-child {
    border-bottom: 0;
  }
  .st-links a:hover,
  .st-links button:hover {
    background: var(--color-base-200);
  }
  .st-links span:last-child {
    color: var(--color-muted);
  }
  .st-discard:focus-visible,
  .st-out:focus-visible,
  .st-step button:focus-visible,
  .st-seg button:focus-visible,
  .st-links a:focus-visible,
  .st-links button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
  @media (min-width: 64rem) {
    .st-links button,
    .st-links a[href$='contact'],
    .st-links a[href$='privacy'] {
      display: none;
    }
  }
</style>
