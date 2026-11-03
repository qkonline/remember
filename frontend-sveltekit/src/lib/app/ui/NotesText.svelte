<!--
  A topic's notes as written: paragraphs, bold and italic, lists, and clickable links (see
  `#lib/app/notes.ts`, which escapes the text before adding its own tags).

    <NotesText text={topic.notes} />
-->
<script lang="ts">
  import { renderNotes } from '#lib/app/notes.ts';

  let { text }: { text: string } = $props();

  const html = $derived(renderNotes(text));
</script>

<div class="nt">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped in renderNotes before any tag is added -->
  {@html html}
</div>

<style>
  .nt {
    max-width: 65ch;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }
  .nt :global(p),
  .nt :global(ul),
  .nt :global(ol) {
    margin: 0 0 0.625rem;
  }
  .nt :global(:last-child) {
    margin-bottom: 0;
  }
  .nt :global(ul),
  .nt :global(ol) {
    padding-inline-start: 1.375rem;
  }
  .nt :global(ul) {
    list-style: disc;
  }
  .nt :global(ol) {
    list-style: decimal;
  }
  .nt :global(li) {
    margin: 0.125rem 0;
  }
  .nt :global(li::marker) {
    color: var(--color-leaf-line);
  }
  .nt :global(strong) {
    font-weight: 600;
  }
  .nt :global(a) {
    color: var(--color-link);
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }
  .nt :global(a:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 3px;
  }
</style>
