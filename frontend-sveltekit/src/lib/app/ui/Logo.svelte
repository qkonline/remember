<!-- Remember's mark: a sprout on a soft green tile. -->
<script lang="ts">
  let { size = 26 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
  <rect x="1" y="1" width="24" height="24" rx="7" class="lg-tile" />
  <path d="M13 20v-7" class="lg-stem" />
  <path d="M13 13c0-4 3-6 7-6 0 4-3 6-7 6zM13 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" class="lg-leaf" />
</svg>

<style>
  svg {
    flex: none;
  }
  .lg-tile {
    fill: var(--color-leaf-tint);
  }
  .lg-stem {
    stroke: var(--color-leaf-line);
    stroke-width: 1.6;
    stroke-linecap: round;
    fill: none;
  }
  .lg-leaf {
    fill: var(--color-leaf-bright);
    stroke: var(--color-leaf-line);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
</style>
