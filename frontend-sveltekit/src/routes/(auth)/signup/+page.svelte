<!-- Make an account with email and password, signed in at once (PRD R1.1, R1.2). -->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { api } from '#lib/api/index.ts';
  import { emailProblem, makeKey, passwordProblem } from '#lib/password.ts';
  import { auth, signedIn } from '#lib/session.svelte.ts';
  import { t, tn } from '#lib/i18n/index.svelte.ts';
  import { Task } from '#lib/task.svelte.ts';
  import AuthShell from '#lib/components/AuthShell.svelte';
  import Captcha from '#lib/components/Captcha.svelte';
  import FormError from '#lib/components/FormError.svelte';
  import PasswordInput from '#lib/components/PasswordInput.svelte';
  import SubmitButton from '#lib/components/SubmitButton.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import Input from '#lib/components/ui/Input.svelte';
  import Trans from '#lib/components/Trans.svelte';
  import Leaves from '#lib/app/ui/Leaves.svelte';

  const methods = $derived(auth.methods!);
  // Derived, so a link to this page with another `next` is followed.
  const next = $derived(page.url.searchParams.get('next'));

  let email = $state('');
  let password = $state('');
  let captcha = $state<ReturnType<typeof Captcha>>();
  const task = new Task();

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const problem = emailProblem(email) ?? passwordProblem(password, methods.password.minLength);
    if (problem) {
      task.error = problem;
      return;
    }
    task.run(async () => {
      const [key, token] = await Promise.all([makeKey(password, email, methods.password), captcha?.token()]);
      await signedIn(await api.signUp(email.trim(), key, token), next);
    });
  }
</script>

<AuthShell title={t('Create your account')}>
  <form class="stack" onsubmit={submit} novalidate>
    <Field label={t('Email')} id="email">
      <Input
        type="email"
        bind:value={email}
        autocomplete="email"
        autocapitalize="off"
        spellcheck="false"
        required
      />
    </Field>
    <PasswordInput
      id="password"
      bind:value={password}
      autocomplete="new-password"
      hint={tn(methods.password.minLength, 'At least 1 character.', 'At least {count} characters.')}
    />
    {#if methods.captcha}<Captcha
        bind:this={captcha}
        siteKey={methods.captcha.siteKey}
        action="signup"
      />{/if}
    <FormError message={task.error} />
    {#if task.code === 'email_taken'}
      <p class="small">
        <Trans text="<signin>Sign in instead</signin> or <reset>reset your password</reset>.">
          {#snippet signin(s: string)}<a href="{resolve('signin')}?email={encodeURIComponent(email.trim())}"
              >{s}</a
            >{/snippet}
          {#snippet reset(s: string)}<a href="{resolve('forgot')}?email={encodeURIComponent(email.trim())}"
              >{s}</a
            >{/snippet}
        </Trans>
      </p>
    {/if}
    <SubmitButton {task} busyLabel={t('Creating your account…')}
      ><span class="key-leaves"><Leaves size={96} /></span>{t('Create account')}</SubmitButton
    >
  </form>

  <p class="muted other-way">
    {t('Already have an account?')}
    <a href="{resolve('signin')}{next ? `?next=${encodeURIComponent(next)}` : ''}">{t('Sign in')}</a>
  </p>
  <!-- Remember: the line agreeing to the terms and privacy policy is hidden until those pages are
       written (put it back from the template then). -->
</AuthShell>

<style>
  .key-leaves {
    display: none;
  }

  /* Phones and small tablets only, until the desktop pass: the home page's raised leaf key. */
  @media (max-width: 47.99rem) {
    form :global(.btn-primary) {
      --btn-color: var(--color-leaf-key);
      --btn-fg: var(--color-leaf-ink);
      position: relative;
      overflow: hidden;
      min-height: 3.5rem;
      border: 1px solid var(--color-leaf-key);
      border-radius: 16px;
      background: var(--color-leaf-key);
      box-shadow: 0 4px 0 var(--color-leaf-edge);
      color: var(--color-leaf-ink);
      font-size: 1.0625rem;
      font-weight: 500;
      transition:
        transform 80ms ease,
        box-shadow 80ms ease;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    form :global(.btn-primary:active) {
      transform: translateY(3px);
      box-shadow: 0 0 0 var(--color-leaf-edge);
    }
    .key-leaves {
      display: contents;
    }
    .other-way {
      text-align: center;
    }
  }
</style>
