<!--
  A six-digit code from an email, drawn as one box per digit. Underneath it's one real input,
  laid transparently over the boxes, so pasting the whole code, the phone's "from Messages/Mail"
  autofill, screen readers and form tests all work as with a plain field. The box for the next
  digit is highlighted while the field has focus. (Remember: changed from the template's single
  wide field; merge by hand on template upgrades.)
-->
<script lang="ts">
  import Field from './ui/Field.svelte';
  import { t } from '#lib/i18n/index.svelte.ts';

  const LENGTH = 6;

  let {
    value = $bindable(''),
    id,
    label,
    hint,
  }: { value?: string; id: string; label?: string; hint?: string } = $props();

  let focused = $state(false);

  // Only digits, at most six: what's typed, pasted or filled in is cleaned as it arrives.
  function clean(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, LENGTH);
    if (digits !== input.value) input.value = digits;
    value = digits;
  }

  const digits = $derived(Array.from({ length: LENGTH }, (_, i) => value[i] ?? ''));
  const active = $derived(Math.min(value.length, LENGTH - 1));
</script>

<Field label={label ?? t('Code')} {id} {hint}>
  <div class="ci">
    <div class="ci-boxes" aria-hidden="true">
      {#each digits as d, i (i)}
        <span class="ci-box" class:ci-filled={!!d} class:ci-active={focused && i === active}>{d}</span>
      {/each}
    </div>
    <input
      class="ci-input"
      {id}
      {value}
      oninput={clean}
      onfocus={() => (focused = true)}
      onblur={() => (focused = false)}
      inputmode="numeric"
      pattern="[0-9]*"
      autocomplete="one-time-code"
      maxlength={LENGTH}
      spellcheck="false"
      aria-describedby={hint ? `${id}-hint` : undefined}
      required
    />
  </div>
</Field>

<style>
  .ci {
    position: relative;
    width: min(100%, 22rem);
  }
  .ci-boxes {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.5rem;
  }
  .ci-box {
    display: grid;
    place-items: center;
    height: 3.5rem;
    border: 1px solid var(--color-base-300);
    border-radius: 12px;
    background: var(--color-base-100);
    color: var(--color-heading);
    font-size: 1.5rem;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease;
  }
  .ci-filled {
    border-color: var(--color-border-strong);
  }
  .ci-active {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 22%, transparent);
  }
  /* The real field: over the boxes, its own text and caret invisible, still focusable and
     selectable (so a long-press paste works on phones). */
  .ci-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: transparent;
    caret-color: transparent;
    font-size: 1rem;
    letter-spacing: 2.5rem;
    -webkit-text-fill-color: transparent;
  }
  .ci-input::selection {
    background: transparent;
  }
  @media (prefers-reduced-motion: reduce) {
    .ci-box {
      transition: none;
    }
  }
</style>
