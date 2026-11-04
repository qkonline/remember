<!--
  Remember's two-tone line icons: strokes in the leaf green, fills in its tint. Decorative
  (aria-hidden): the text beside one says what it is.

    <Glyph name="shelves" />
-->
<script lang="ts">
  export type GlyphName =
    | 'today'
    | 'shelves'
    | 'growth'
    | 'you'
    | 'plus'
    | 'play'
    | 'close'
    | 'back'
    | 'search'
    | 'link'
    | 'bell'
    | 'cards'
    | 'sun'
    | 'exit'
    | 'sprout'
    | 'calendar'
    | 'check'
    | 'cross'
    | 'wave'
    | 'down'
    | 'edit'
    | 'message'
    | 'bold'
    | 'italic'
    | 'bullets'
    | 'numbers';

  let { name, size = 22 }: { name: GlyphName; size?: number } = $props();
</script>

<svg class="gl" width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
  {#if name === 'today'}
    <rect x="5" y="4" width="12" height="15" rx="2.5" class="gl-fill-soft" /><path
      d="M8 8.5h6M8 12h4"
      class="gl-line"
    />
  {:else if name === 'shelves'}
    <path d="M5 12h12l-1.5 7h-9z" class="gl-fill" stroke-linejoin="round" /><path
      d="M11 12V6M11 8c0-2.5 2-4 4.5-4 0 2.5-2 4-4.5 4z"
      class="gl-line gl-none"
    />
  {:else if name === 'growth'}
    <path d="M4 18V10M11 18V5M18 18v-6" class="gl-line gl-thick" /><circle
      cx="11"
      cy="4"
      r="2"
      class="gl-dot"
    />
  {:else if name === 'you'}
    <circle cx="11" cy="8" r="3.5" class="gl-fill" /><path
      d="M4 19c1-4 4-5.5 7-5.5s6 1.5 7 5.5"
      class="gl-line gl-none"
    />
  {:else if name === 'exit'}
    <path d="M9 4H5v14h4M10 11h8M15 8l3 3-3 3" class="gl-line gl-none" />
  {:else if name === 'sun'}
    <circle cx="11" cy="11" r="4" class="gl-fill" /><path
      d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M5 17l1.4-1.4M15.6 6.4L17 5"
      class="gl-line gl-none"
    />
  {:else if name === 'plus'}
    <path d="M11 4v14M4 11h14" class="gl-ink" />
  {:else if name === 'play'}
    <path d="M7 4.5l10 6.5-10 6.5z" class="gl-solid" />
  {:else if name === 'close'}
    <path d="M5.5 5.5l11 11M16.5 5.5l-11 11" class="gl-ink" />
  {:else if name === 'back'}
    <path d="M13.5 4.5L7 11l6.5 6.5" class="gl-ink gl-none" />
  {:else if name === 'down'}
    <path d="M6 8.5l5 5 5-5" class="gl-ink gl-none" />
  {:else if name === 'bold'}
    <path
      d="M7 4.5h4.8a3.2 3.2 0 010 6.4H7zM7 10.9h5.6a3.3 3.3 0 010 6.6H7z"
      class="gl-ink gl-none"
      stroke-linejoin="round"
    />
  {:else if name === 'italic'}
    <path d="M10 4.5h6.5M5.5 17.5H12M13.25 4.5l-4.5 13" class="gl-ink" />
  {:else if name === 'bullets'}
    <circle cx="5" cy="6" r="1.4" class="gl-solid" /><circle cx="5" cy="11" r="1.4" class="gl-solid" /><circle
      cx="5"
      cy="16"
      r="1.4"
      class="gl-solid"
    /><path d="M9 6h9M9 11h9M9 16h9" class="gl-ink" />
  {:else if name === 'numbers'}
    <path
      d="M4.2 4.6l1.5-.8v4.6M3.8 13.4a1.4 1.4 0 012.6.7c0 1-2.6 1.9-2.6 3.2h2.8"
      class="gl-ink gl-none gl-thin"
    /><path d="M10 6h8M10 11h8M10 16h8" class="gl-ink" />
  {:else if name === 'search'}
    <circle cx="9.5" cy="9.5" r="5.5" class="gl-ink gl-none" /><path d="M14 14l4.5 4.5" class="gl-ink" />
  {:else if name === 'link'}
    <path
      d="M9.5 12.5l3-3M8 7l1.5-1.5a3.5 3.5 0 015 5L13 12M14 15l-1.5 1.5a3.5 3.5 0 01-5-5L9 10"
      class="gl-line gl-none"
    />
  {:else if name === 'bell'}
    <path d="M5 15v-4.5a6 6 0 0112 0V15l1.5 2h-15z" class="gl-fill" stroke-linejoin="round" /><path
      d="M9 19.5h4"
      class="gl-line"
    />
  {:else if name === 'cards'}
    <rect x="3.5" y="6" width="11" height="13" rx="2.5" class="gl-fill" /><rect
      x="7.5"
      y="3"
      width="11"
      height="13"
      rx="2.5"
      class="gl-fill-base"
    />
  {:else if name === 'sprout'}
    <path d="M11 19V10" class="gl-line" /><path
      d="M11 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5zM11 14c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z"
      class="gl-fill-soft"
      stroke-linejoin="round"
    />
  {:else if name === 'calendar'}
    <rect x="2.5" y="4" width="17" height="15" rx="4" class="gl-fill" /><path
      d="M2.5 8.5h17"
      class="gl-line"
    /><rect x="12" y="11.5" width="4.5" height="4.5" rx="1.2" class="gl-dot" />
  {:else if name === 'check'}
    <path d="M5.5 11.5l3.5 3.5 7.5-8" class="gl-ink gl-none gl-thick" />
  {:else if name === 'cross'}
    <path d="M6.5 6.5l9 9M15.5 6.5l-9 9" class="gl-ink gl-thick" />
  {:else if name === 'wave'}
    <path d="M4 12c2-2.6 3.8-2.6 5.8 0s3.8 2.6 5.8 0 3.2-2 3.2-2" class="gl-ink gl-none gl-thick" />
  {:else if name === 'message'}
    <path d="M4 5.5h14v9.5H9l-4 3.5V15H4z" class="gl-fill" stroke-linejoin="round" /><path
      d="M7.5 9h7M7.5 11.5h4.5"
      class="gl-line"
    />
  {:else if name === 'edit'}
    <path d="M4.5 17.5l1-4L14 5l3 3-8.5 8.5z" class="gl-fill" stroke-linejoin="round" />
  {/if}
</svg>

<style>
  .gl {
    flex: none;
  }
  .gl path,
  .gl rect,
  .gl circle {
    stroke-linecap: round;
  }
  .gl-line {
    stroke: var(--color-leaf-line);
    stroke-width: 1.5;
    fill: none;
  }
  .gl-thick {
    stroke-width: 2;
  }
  .gl-none {
    fill: none;
  }
  .gl-fill {
    fill: var(--color-leaf-tint);
    stroke: var(--color-leaf-line);
    stroke-width: 1.4;
  }
  .gl-fill-soft {
    fill: var(--color-leaf-soft);
    stroke: var(--color-leaf-line);
    stroke-width: 1.4;
  }
  .gl-fill-base {
    fill: var(--color-base-100);
    stroke: var(--color-leaf-line);
    stroke-width: 1.4;
  }
  .gl-dot {
    fill: var(--color-leaf-bright);
  }
  .gl-ink {
    stroke: currentColor;
    stroke-width: 1.8;
    fill: none;
  }
  .gl-ink.gl-thick {
    stroke-width: 2.2;
  }
  .gl-ink.gl-thin {
    stroke-width: 1.5;
  }
  .gl-solid {
    fill: currentColor;
  }
</style>
