<!--
  Pull down to refresh, on touch screens below 64rem: pull from the top of a page and a sprout
  grows out of the top bar (its stem lengthens, its leaves open); let go once it's grown and it
  turns slowly while Remember syncs with the backend and reloads the device's copy. Pulls only
  start at the very top of the page and never inside an open sheet or dialog. The browser's own
  pull-to-refresh (Chrome on Android) is switched off while this is on, so only one shows.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '#lib/i18n/index.svelte.ts';

  let { onrefresh }: { onrefresh: () => Promise<void> } = $props();

  /** How far the finger must pull (px, after resistance) to refresh. */
  const THRESHOLD = 72;
  const MAX = 110;

  let pull = $state(0);
  let refreshing = $state(false);
  let settling = $state(false);
  const progress = $derived(Math.min(1, pull / THRESHOLD));
  const ready = $derived(pull >= THRESHOLD);

  onMount(() => {
    const phone = matchMedia('(max-width: 63.99rem) and (pointer: coarse)');
    let startY: number | null = null;
    let active = false;

    const blocked = () => !!document.querySelector('dialog[open]') || refreshing;

    const down = (e: TouchEvent) => {
      if (!phone.matches || blocked() || window.scrollY > 0 || e.touches.length !== 1) return;
      startY = e.touches[0]!.clientY;
      active = false;
    };
    const move = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.touches[0]!.clientY - startY;
      if (dy <= 0 || window.scrollY > 0) {
        if (active) pull = 0;
        startY = active ? startY : null;
        return;
      }
      active = true;
      settling = false;
      // Resistance: the further it goes, the harder it pulls.
      pull = Math.min(MAX, dy * 0.5);
      if (e.cancelable) e.preventDefault();
    };
    const up = async () => {
      if (startY === null) return;
      startY = null;
      if (!active) return;
      active = false;
      settling = true;
      if (pull >= THRESHOLD) {
        refreshing = true;
        pull = THRESHOLD;
        try {
          await Promise.all([onrefresh(), new Promise((r) => setTimeout(r, 600))]);
        } finally {
          refreshing = false;
          pull = 0;
        }
      } else pull = 0;
    };

    // Only one pull-to-refresh: the browser's own is off while ours is on.
    const html = document.documentElement;
    const sync = () => html.classList.toggle('rp-own-pull', phone.matches);
    sync();
    phone.addEventListener('change', sync);
    addEventListener('touchstart', down, { passive: true });
    addEventListener('touchmove', move, { passive: false });
    addEventListener('touchend', up);
    addEventListener('touchcancel', up);
    return () => {
      phone.removeEventListener('change', sync);
      html.classList.remove('rp-own-pull');
      removeEventListener('touchstart', down);
      removeEventListener('touchmove', move);
      removeEventListener('touchend', up);
      removeEventListener('touchcancel', up);
    };
  });
</script>

<div
  class="ptr"
  class:ptr-settle={settling}
  class:ptr-busy={refreshing}
  style:--pull="{pull}px"
  style:--grow={progress}
  aria-hidden={!refreshing}
>
  <span class="ptr-bud" class:ptr-ready={ready || refreshing}>
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <path d="M17 30V16" class="ptr-stem" />
      <path d="M17 18c0-6 4.5-9.5 11-9.5 0 6-4.5 9.5-11 9.5z" class="ptr-leaf ptr-leaf-r" />
      <path d="M17 21c0-5-3.8-8-9-8 0 5 3.8 8 9 8z" class="ptr-leaf ptr-leaf-l" />
    </svg>
  </span>
  {#if refreshing}<span class="sr-only" role="status">{t('Refreshing')}</span>{/if}
</div>

<style>
  :global(html.rp-own-pull),
  :global(html.rp-own-pull body) {
    overscroll-behavior-y: none;
  }
  .ptr {
    position: fixed;
    left: 0;
    right: 0;
    top: calc(3.5rem + env(safe-area-inset-top));
    z-index: 19;
    height: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }
  .ptr-bud {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    background: var(--color-base-100);
    box-shadow: var(--shadow-pop);
    border: 1px solid var(--color-base-300);
    opacity: var(--grow);
    transform: translateY(calc(var(--pull) - 2.75rem)) scale(calc(0.6 + var(--grow) * 0.4));
  }
  .ptr-settle .ptr-bud {
    transition:
      transform 220ms cubic-bezier(0.2, 0, 0, 1),
      opacity 220ms ease;
  }
  .ptr-ready {
    background: var(--color-leaf-tint);
    border-color: var(--color-leaf-soft);
  }
  .ptr-stem {
    stroke: var(--color-leaf-line);
    stroke-width: 2;
    stroke-linecap: round;
    transform-origin: 17px 30px;
    transform: scaleY(calc(0.25 + var(--grow) * 0.75));
  }
  .ptr-leaf {
    stroke: var(--color-leaf-line);
    stroke-width: 1.5;
    stroke-linejoin: round;
    transform: scale(var(--grow));
  }
  .ptr-leaf-r {
    fill: var(--color-leaf-soft);
    transform-origin: 17px 18px;
  }
  .ptr-leaf-l {
    fill: var(--color-leaf-bright);
    transform-origin: 17px 21px;
  }
  .ptr-busy svg {
    animation: ptr-turn 1.1s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  }
  @keyframes ptr-turn {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ptr-settle .ptr-bud {
      transition: none;
    }
    .ptr-busy svg {
      animation: none;
    }
  }
</style>
