<!-- The watering can beside a seed pot. -->
<script lang="ts">
  let { size = 78 }: { size?: number } = $props();
</script>

<svg width={size} height={Math.round((size * 62) / 78)} viewBox="0 0 78 62" aria-hidden="true">
  <path d="M14 22h34l-3 34H17z" class="wc-body" />
  <path d="M48 30l22-14" class="wc-line" />
  <path d="M66 12l8 6-4 4-8-6z" class="wc-rose" />
  <path d="M20 22c0-10 22-10 22 0" class="wc-line" />
  <circle cx="72" cy="28" r="1.6" class="wc-drop" />
  <circle cx="68" cy="33" r="1.3" class="wc-drop" />
</svg>

<style>
  svg {
    flex: none;
    display: block;
  }
  .wc-body,
  .wc-rose {
    fill: light-dark(#e7e2d8, #3d3a33);
    stroke: light-dark(#57534e, #d6d3d1);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .wc-line {
    fill: none;
    stroke: light-dark(#57534e, #d6d3d1);
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  .wc-drop {
    fill: var(--color-leaf-line);
    opacity: 0.6;
  }
</style>
