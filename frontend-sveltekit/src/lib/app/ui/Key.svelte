<!--
  Remember's raised key: a button that stands proud of the page and presses down when tapped.
  `tone`: leaf (the light green main key, with leaves in its corner), plain (white), forgot
  (rose), hazy (yellow). `primary` and `go` are leaf.

    <Key tone="leaf" onclick={…}>Start refreshing</Key>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Leaves from './Leaves.svelte';

  let {
    tone = 'plain',
    wide = false,
    big = false,
    leaves = true,
    children,
    ...rest
  }: HTMLButtonAttributes & {
    tone?: 'plain' | 'leaf' | 'go' | 'primary' | 'forgot' | 'hazy';
    wide?: boolean;
    /** The taller key of a page's main action (56 px). */
    big?: boolean;
    /** The leaf texture on a leaf key (off for small keys). */
    leaves?: boolean;
    children: Snippet;
  } = $props();

  const toneClass = {
    plain: 'rk-plain',
    leaf: 'rk-leaf',
    go: 'rk-leaf',
    primary: 'rk-leaf',
    forgot: 'rk-forgot',
    hazy: 'rk-hazy',
  } as const;
  const isLeaf = $derived(tone === 'leaf' || tone === 'go' || tone === 'primary');
</script>

<button type="button" class="rk {toneClass[tone]}" class:rk-wide={wide} class:rk-big={big} {...rest}
  >{#if isLeaf && leaves}<Leaves size={big ? 96 : 76} />{/if}<span class="rk-in">{@render children()}</span
  ></button
>

<style>
  .rk {
    --rk-face: var(--color-base-100);
    --rk-ink: var(--color-base-content);
    --rk-line: var(--color-base-300);
    --rk-edge: var(--color-base-300);
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    padding: 0 1.25rem;
    border: 1px solid var(--rk-line);
    border-radius: 14px;
    background: var(--rk-face);
    color: var(--rk-ink);
    font: inherit;
    font-weight: 500;
    font-size: 1rem;
    line-height: 1.1;
    box-shadow: 0 3px 0 var(--rk-edge);
    transform: translateY(0);
    transition:
      transform 80ms ease,
      box-shadow 80ms ease;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .rk-in {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .rk-wide {
    width: 100%;
  }
  .rk-big {
    min-height: 3.5rem;
    border-radius: 16px;
    font-size: 1.0625rem;
  }
  .rk-leaf {
    --rk-face: var(--color-leaf);
    --rk-ink: var(--color-leaf-ink);
    --rk-line: var(--color-leaf);
    --rk-edge: var(--color-leaf-edge);
    box-shadow: 0 4px 0 var(--rk-edge);
  }
  .rk-forgot {
    --rk-face: light-dark(#ffe4e6, #3a1a20);
    --rk-ink: light-dark(#9f1239, #fda4af);
    --rk-line: var(--rk-face);
    --rk-edge: light-dark(#fda4af, #6b2633);
    box-shadow: 0 4px 0 var(--rk-edge);
  }
  .rk-hazy {
    --rk-face: light-dark(#fef9c3, #332c10);
    --rk-ink: light-dark(#854d0e, #fde68a);
    --rk-line: var(--rk-face);
    --rk-edge: light-dark(#fde047, #5c4f17);
    box-shadow: 0 4px 0 var(--rk-edge);
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
