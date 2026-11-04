<!--
  Today's window: a pale pane with its frame, and pots standing on the sill. Pots due today wait
  for water (a drop above each); a calm day has a sun in the pane; a new person's sill holds one
  seed pot beside a watering can. Up to five pots; more show as "+N".

    <Windowsill pots={[{ key, shelf, leaves, label, thirsty }]} sun />
-->
<script lang="ts">
  import { tn } from '#lib/i18n/index.svelte.ts';
  import type { Shelf } from '#lib/app/store.svelte.ts';
  import GrowingPot from './GrowingPot.svelte';
  import WateringCan from './WateringCan.svelte';

  export interface SillPot {
    key: string;
    shelf: Shelf | null;
    leaves: number;
    label?: string;
    thirsty?: boolean;
  }

  let {
    pots = [],
    more = 0,
    sun = false,
    seed = false,
  }: { pots?: SillPot[]; more?: number; sun?: boolean; seed?: boolean } = $props();
</script>

<div class="ws" class:ws-seed={seed}>
  <div class="ws-pane" aria-hidden="true">
    <span class="ws-bar ws-bar-v"></span>
    <span class="ws-bar ws-bar-h"></span>
    {#if sun}<span class="ws-sun"></span>{/if}
  </div>
  <ul class="ws-pots">
    {#if seed}
      <li class="ws-pot" aria-hidden="true">
        <GrowingPot color="green" leaves={0} size={66} letter={false} />
      </li>
      <li class="ws-can" aria-hidden="true">
        <WateringCan />
      </li>
    {/if}
    {#each pots as p (p.key)}
      <li class="ws-pot">
        {#if p.thirsty}
          <svg class="ws-drop" width="14" height="18" viewBox="0 0 14 18" aria-hidden="true">
            <path d="M7 1.5C7 1.5 1.5 8.5 1.5 11.7a5.5 5.5 0 0011 0C12.5 8.5 7 1.5 7 1.5z" />
          </svg>
        {/if}
        <GrowingPot shelf={p.shelf} leaves={p.leaves} size={58} />
        {#if p.label}<span class="ws-label">{p.label}</span>{/if}
      </li>
    {/each}
    {#if more > 0}
      <li class="ws-more"><span>{tn(more, '+1 more', '+{count} more')}</span></li>
    {/if}
  </ul>
  <span class="ws-sill" aria-hidden="true"></span>
</div>

<style>
  .ws {
    /* Sized by the page, never by its pots, so a full sill shrinks them instead of pushing the
       page wider than a phone. */
    contain: inline-size;
    position: relative;
    padding: 1rem 0.75rem 0;
    border-radius: 22px 22px 6px 6px;
    overflow: hidden;
    isolation: isolate;
  }
  /* The window behind the pots: a pale pane, its frame and glazing bars. */
  .ws-pane {
    position: absolute;
    inset: 0 0.5rem 0.75rem;
    z-index: -1;
    border-radius: 18px 18px 0 0;
    border: 3px solid light-dark(#e8efe4, #2c3a2c);
    border-bottom: 0;
    background: linear-gradient(to bottom, var(--color-leaf-tab), light-dark(#ffffff, #161c16) 85%);
  }
  .ws-bar {
    position: absolute;
    background: light-dark(#e8efe4, #2c3a2c);
  }
  .ws-bar-v {
    left: 50%;
    top: 0;
    bottom: 0;
    width: 3px;
    transform: translateX(-50%);
  }
  .ws-bar-h {
    left: 0;
    right: 0;
    top: 42%;
    height: 3px;
  }
  .ws-sun {
    position: absolute;
    top: 0.875rem;
    right: 1rem;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    background: light-dark(#fef08a, #ca8a04);
    box-shadow: 0 0 0 6px light-dark(#fef9c3, #3a3112);
  }
  .ws-pots {
    list-style: none;
    margin: 0;
    padding: 0.75rem 0 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 0.5rem;
    min-height: 7.5rem;
  }
  .ws-pot {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 0.125rem;
    flex: 0 1 5rem;
    min-width: 0;
  }
  /* On a narrow phone the pots shrink to fit the window rather than spill past it. */
  .ws-pot :global(.gp) {
    max-width: 100%;
    height: auto;
  }
  .ws-label {
    max-width: 100%;
    margin-bottom: 0.375rem;
    min-height: 2.3em;
    font-size: 0.6875rem;
    line-height: 1.15;
    color: var(--color-muted);
    text-align: center;
    overflow-wrap: break-word;
    hyphens: auto;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
  .ws-drop {
    position: absolute;
    top: -0.25rem;
    right: 0.5rem;
  }
  .ws-drop path {
    fill: var(--color-leaf-tint);
    stroke: var(--color-leaf-line);
    stroke-width: 1.3;
  }
  .ws-more {
    flex: none;
    align-self: center;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-leaf-deep);
  }
  .ws-more span {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    background: var(--color-base-100);
    border: 1px solid var(--color-base-300);
  }
  .ws-can {
    align-self: flex-end;
    margin-bottom: 0.25rem;
  }
  .ws-sill {
    display: block;
    height: 0.75rem;
    margin: 0 -0.75rem;
    border-radius: 4px;
    background: light-dark(#e3d5bc, #4a4234);
    box-shadow: inset 0 3px 0 light-dark(#efe5d3, #5a5141);
  }
</style>
