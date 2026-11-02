<!--
  The family's raised key (Boardo, Elastic): a button that stands 3 px proud of the page and
  presses down when tapped. `tone`: plain, go (green, for "Got it" and finishing), primary.

    <Key tone="go" onclick={…}>Got it</Key>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    tone = 'plain',
    wide = false,
    children,
    ...rest
  }: HTMLButtonAttributes & {
    tone?: 'plain' | 'go' | 'primary';
    wide?: boolean;
    children: Snippet;
  } = $props();

  const toneClass = { plain: 'rk-plain', go: 'rk-go', primary: 'rk-primary' } as const;
</script>

<button type="button" class="rk {toneClass[tone]}" class:rk-wide={wide} {...rest}>{@render children()}</button
>

<style>
  .rk {
    --rk-face: var(--color-base-100);
    --rk-ink: var(--color-base-content);
    --rk-line: var(--color-base-300);
    --rk-edge: color-mix(in oklab, var(--color-base-300) 62%, black);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding: 0 1.125rem;
    border: 1px solid var(--rk-line);
    border-radius: var(--radius-field);
    background: var(--rk-face);
    color: var(--rk-ink);
    font: inherit;
    font-weight: 600;
    font-size: 0.9375rem;
    line-height: 1;
    box-shadow: 0 3px 0 var(--rk-edge);
    transform: translateY(0);
    transition:
      transform 80ms ease,
      box-shadow 80ms ease;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .rk-wide {
    width: 100%;
  }
  .rk-go {
    --rk-face: var(--color-success);
    --rk-ink: var(--color-success-content);
    --rk-line: var(--color-success);
    --rk-edge: color-mix(in oklab, var(--color-success) 60%, black);
  }
  .rk-primary {
    --rk-face: var(--color-primary);
    --rk-ink: var(--color-primary-content);
    --rk-line: var(--color-primary);
    --rk-edge: color-mix(in oklab, var(--color-primary) 60%, black);
  }
  .rk:active:not(:disabled) {
    transform: translateY(3px);
    box-shadow: 0 0 0 var(--rk-edge);
  }
  .rk:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 3px;
  }
  .rk:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (prefers-reduced-motion: reduce) {
    .rk {
      transition: none;
    }
  }
</style>
