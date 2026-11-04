<!--
  A card on a fanned stack of two more, rose and yellow behind it: the look of a topic to review.
  TopicCard fills it with a topic; the home page shows one without any data behind it.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { big = false, children }: { big?: boolean; children: Snippet } = $props();
</script>

<div class="tk" class:tk-big={big}>
  <span class="tk-back tk-b2" aria-hidden="true"></span>
  <span class="tk-back tk-b1" aria-hidden="true"></span>
  <article class="tk-card">{@render children()}</article>
</div>

<style>
  .tk {
    position: relative;
    padding-bottom: 1rem;
  }
  .tk-back {
    position: absolute;
    inset: 0.75rem 1.375rem 0.25rem;
    border-radius: 20px;
  }
  .tk-b2 {
    background: light-dark(#fef9c3, #2c2712);
    transform: rotate(3.5deg);
  }
  .tk-b1 {
    inset: 0.5rem 0.75rem 0.5rem;
    background: light-dark(#ffe4e6, #2e171b);
    transform: rotate(-2.5deg);
  }
  .tk-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    min-height: 9.5rem;
    box-sizing: border-box;
    padding: 1rem 1.125rem;
    border-radius: 20px;
    background: var(--color-base-100);
    border: 1px solid var(--color-base-300);
    box-shadow: var(--shadow-pop);
  }
  .tk-big .tk-card {
    min-height: 11rem;
    padding: 1.25rem 1.375rem;
  }
</style>
