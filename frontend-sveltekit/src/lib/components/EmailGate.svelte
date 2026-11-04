<!--
  When the app requires a confirmed email (`requireVerifiedEmail`) and this one isn't: the only
  ways on are confirming it or changing the address (PRD R1.7).
-->
<script lang="ts">
  import { auth } from '#lib/session.svelte.ts';
  import { t } from '#lib/i18n/index.svelte.ts';
  import AuthShell from './AuthShell.svelte';
  import ChangeEmail from './account/ChangeEmail.svelte';
  import ConfirmEmail from './account/ConfirmEmail.svelte';
  import Button from './ui/Button.svelte';

  let changing = $state(false);
</script>

<AuthShell
  title={t('Check your email')}
  lead={t('We sent a 6-digit code to {email}.', { email: auth.user?.email ?? '' })}
>
  {#if !changing}
    <!-- Signing up sent a code already when the app requires confirmation. -->
    <ConfirmEmail sent compact onchangeemail={() => (changing = true)} />
  {:else}
    <ChangeEmail />
    <p class="muted small">
      <Button type="button" variant="link" onclick={() => (changing = false)}
        >{t('Back to confirming')}</Button
      >
    </p>
  {/if}
</AuthShell>
