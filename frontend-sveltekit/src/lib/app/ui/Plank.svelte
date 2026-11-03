<!--
  A wooden wall shelf: the board's lit top, its front edge with a faint grain, the shadow it
  casts on the wall, and two brackets under it. It fills the width of its box; put pots on it
  by placing it right below them.
  `--pk-inset` moves the brackets in from the ends (12% by default).

    <Plank />            (with brackets)
    <Plank brackets={false} />
-->
<script lang="ts">
  let { brackets = true }: { brackets?: boolean } = $props();
</script>

<div class="pk" aria-hidden="true">
  <span class="pk-top"></span>
  <span class="pk-face"></span>
  {#if brackets}
    {#each ['pk-left', 'pk-right'] as side (side)}
      <svg class="pk-bracket {side}" width="22" height="26" viewBox="0 0 22 26">
        <path d="M2 0h18v3.2C12.6 4.4 8.2 9.6 6 25.4L2 26z" class="pk-bracket-wood" />
        <path d="M4.6 3.4h9.2C9.4 6 6.6 11 5.2 19.6l-.6.2z" class="pk-bracket-cut" />
      </svg>
    {/each}
  {/if}
</div>

<style>
  .pk {
    --pk-wood: light-dark(#e2cfa9, #5b4a33);
    --pk-wood-top: light-dark(#f1e5cc, #6d5a3f);
    --pk-wood-edge: light-dark(#c4a97c, #3f3324);
    position: relative;
    display: block;
  }
  .pk-top {
    display: block;
    height: 5px;
    margin: 0 4px;
    border-radius: 3px 3px 0 0;
    background: var(--pk-wood-top);
    box-shadow: inset 0 1px 0 light-dark(rgb(255 255 255 / 0.7), rgb(255 255 255 / 0.08));
  }
  /* The front edge, with a couple of long, quiet grain lines. */
  .pk-face {
    display: block;
    height: 11px;
    border-radius: 2px 2px 4px 4px;
    background:
      linear-gradient(
        to bottom,
        transparent 3px,
        light-dark(rgb(150 112 60 / 0.16), rgb(0 0 0 / 0.22)) 3px 4px,
        transparent 4px 7px,
        light-dark(rgb(150 112 60 / 0.1), rgb(0 0 0 / 0.16)) 7px 8px,
        transparent 8px
      ),
      var(--pk-wood);
    border-bottom: 1.5px solid var(--pk-wood-edge);
    box-shadow:
      0 7px 12px -6px light-dark(rgb(90 64 28 / 0.32), rgb(0 0 0 / 0.6)),
      0 2px 3px -1px light-dark(rgb(90 64 28 / 0.18), rgb(0 0 0 / 0.4));
  }
  .pk-bracket {
    position: absolute;
    top: 100%;
    display: block;
  }
  .pk-left {
    left: var(--pk-inset, 12%);
  }
  .pk-right {
    right: var(--pk-inset, 12%);
    transform: scaleX(-1);
  }
  .pk-bracket-wood {
    fill: var(--pk-wood);
    stroke: var(--pk-wood-edge);
    stroke-width: 1.2;
    stroke-linejoin: round;
  }
  .pk-bracket-cut {
    fill: light-dark(rgb(90 64 28 / 0.1), rgb(0 0 0 / 0.25));
  }
</style>
