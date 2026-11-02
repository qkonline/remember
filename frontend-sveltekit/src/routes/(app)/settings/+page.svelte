<!--
  Remember's settings: the daily reminder (a time the person picks, never a default), how many
  topics a day at most, and how hard to push recall. Nothing saves on its own: changes wait for
  Save, as in Boardo and Elastic. Notifications on this device are turned on with the reminder.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { appName } from '#lib/config.ts';
  import { auth } from '#lib/session.svelte.ts';
  import { msg, t } from '#lib/i18n/index.svelte.ts';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Select from '#lib/components/ui/Select.svelte';
  import Segmented from '#lib/components/ui/Segmented.svelte';
  import Toggle from '#lib/components/ui/Toggle.svelte';
  import Notice from '#lib/components/ui/Notice.svelte';
  import { toast } from '#lib/components/ui/toast.svelte.ts';
  import { pushOn, pushState, type PushState } from '#lib/push.ts';
  import { memory, saveSettings, watch } from '#lib/app/store.svelte.ts';
  import { RETENTIONS, type Retention } from '#lib/app/schedule/index.ts';
  import Key from '#lib/app/ui/Key.svelte';

  onMount(() => {
    const stop = watch();
    void pushState().then((s) => (push = s));
    return stop;
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
    { value: '0.8', label: msg('Relaxed'), hint: msg('Fewer check-ins. Expect to recall about 8 in 10.') },
    { value: '0.9', label: msg('Balanced'), hint: msg('The usual. Expect to recall about 9 in 10.') },
    {
      value: '0.95',
      label: msg('Intense'),
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
</script>

<svelte:head><title>{t('Settings')} · {appName}</title></svelte:head>

<div class="st">
  <h1>{t('Settings')}</h1>

  <section class="st-sec" aria-labelledby="remind-title">
    <h2 id="remind-title">{t('Daily reminder')}</h2>
    <p class="st-lead">{t('One notification a day, only when something is waiting.')}</p>
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
  </section>

  <section class="st-sec" aria-labelledby="cap-title">
    <h2 id="cap-title">{t('A day at most')}</h2>
    <p class="st-lead">{t('Busier days wait for the next ones, so a day never gets long.')}</p>
    <Field label={t('Topics a day')} hideLabel>
      <Select bind:value={cap}>
        {#each [5, 10, 15, 20, 30, 50] as n (n)}
          <option value={String(n)}>{t('{count} topics', { count: n })}</option>
        {/each}
      </Select>
    </Field>
  </section>

  <section class="st-sec" aria-labelledby="intensity-title">
    <h2 id="intensity-title">{t('How hard to push')}</h2>
    <Segmented
      legend={t('How hard to push')}
      hideLegend
      options={intensities.map((i) => ({ value: i.value, label: t(i.label) }))}
      bind:value={retention}
    />
    <p class="st-hint">{t(intensityHint)}</p>
  </section>

  <div class="st-bar" class:st-bar-on={dirty}>
    <Key tone="primary" onclick={save} disabled={!dirty || saving}>{t('Save')}</Key>
    {#if dirty}<button type="button" class="st-discard" onclick={fromSaved}>{t('Discard changes')}</button
      >{/if}
  </div>
</div>

<style>
  .st {
    max-width: 36rem;
    padding-bottom: 2rem;
  }
  .st h1 {
    margin: 0 0 1.5rem;
  }
  .st-sec {
    padding: 1.25rem 0;
    border-top: 1px solid var(--color-base-300);
  }
  .st-sec h2 {
    font-size: 1.0625rem;
    font-weight: 600;
    margin: 0;
  }
  .st-lead {
    margin: 0.25rem 0 1rem;
    color: var(--color-muted);
  }
  .st-time {
    margin-top: 1rem;
    max-width: 12rem;
  }
  .st-hint {
    margin: 0.75rem 0 0;
    color: var(--color-muted);
    font-size: 0.875rem;
  }
  .st-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--color-base-300);
  }
  .st-discard {
    background: none;
    border: 0;
    color: var(--color-link);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    min-height: 2.75rem;
  }
  .st-discard:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
</style>
