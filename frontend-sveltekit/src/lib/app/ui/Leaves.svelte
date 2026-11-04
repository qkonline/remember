<!--
  The cluster of pale leaves in the bottom-right corner of Remember's green keys: drawn in the
  key's text colour, faint, never in the way of the label.
-->
<script lang="ts">
  let { size = 90 }: { size?: number } = $props();

  // x, y, angle, scale, for a 150 px square
  const leaves = [
    [118, 142, -28, 1],
    [92, 146, -58, 0.8],
    [142, 104, -8, 0.9],
    [66, 150, -80, 0.6],
    [138, 62, 6, 0.6],
    [112, 96, -40, 0.5],
  ] as const;
</script>

<svg class="lv" width={size} height={size} viewBox="0 0 150 150" aria-hidden="true">
  {#each leaves as [x, y, a, k], i (i)}
    <g transform="translate({x} {y}) rotate({a}) scale({k})">
      <path d="M0 0C-11 -14 -11 -36 0 -50C11 -36 11 -14 0 0Z" class="lv-leaf" />
      <path d="M0 -2V-46" class="lv-rib" />
    </g>
  {/each}
</svg>

<style>
  .lv {
    position: absolute;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }
  .lv-leaf {
    fill: currentColor;
    fill-opacity: 0.065;
    stroke: currentColor;
    stroke-opacity: 0.1;
    stroke-width: 1.2;
  }
  .lv-rib {
    stroke: currentColor;
    stroke-opacity: 0.1;
    stroke-width: 1.2;
  }
</style>
