<!--
  Notes with a little formatting: a toolbar (bold, italic, a list, a numbered list) over a text
  field, with Cmd/Ctrl+B and Cmd/Ctrl+I. The notes stay plain text with light marks (see
  `#lib/app/notes.ts`); links pasted in are made clickable where the notes are shown.

    <NotesEditor bind:value={notes} rows={6} />
-->
<script lang="ts">
  import Field from '#lib/components/ui/Field.svelte';
  import Textarea from '#lib/components/ui/Textarea.svelte';
  import { t } from '#lib/i18n/index.svelte.ts';
  import { formatNotes } from '#lib/app/notes.ts';
  import Glyph from './Glyph.svelte';

  let {
    value = $bindable(''),
    rows = 6,
    label = t('Notes'),
    hint = t('Shown when you check yourself. Paste links straight in.'),
  }: { value?: string; rows?: number; label?: string; hint?: string } = $props();

  let area = $state<HTMLTextAreaElement>();

  const tools = [
    { kind: 'bold', glyph: 'bold', label: 'Bold', keys: 'Meta+B' },
    { kind: 'italic', glyph: 'italic', label: 'Italic', keys: 'Meta+I' },
    { kind: 'bullets', glyph: 'bullets', label: 'List', keys: undefined },
    { kind: 'numbers', glyph: 'numbers', label: 'Numbered list', keys: undefined },
  ] as const;

  function apply(kind: (typeof tools)[number]['kind']) {
    if (!area) return;
    const r = formatNotes(value, area.selectionStart, area.selectionEnd, kind);
    value = r.text;
    const el = area;
    // After Svelte writes the new text into the field, put the selection back where it belongs.
    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(r.start, r.end);
    });
  }

  function keys(e: KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const k = e.key.toLowerCase();
    if (k === 'b' || k === 'i') {
      e.preventDefault();
      apply(k === 'b' ? 'bold' : 'italic');
    }
  }
</script>

<div class="ne">
  <Field {label} {hint}>
    <div class="ne-box">
      <div class="ne-tools" role="toolbar" aria-label={t('Format the notes')}>
        {#each tools as tool (tool.kind)}
          <button
            type="button"
            class="ne-tool"
            aria-label={t(tool.label)}
            aria-keyshortcuts={tool.keys}
            title={t(tool.label)}
            onmousedown={(e) => e.preventDefault()}
            onclick={() => apply(tool.kind)}><Glyph name={tool.glyph} size={18} /></button
          >
        {/each}
      </div>
      <Textarea bind:ref={area} bind:value {rows} maxlength={20000} onkeydown={keys} class="ne-area" />
    </div>
  </Field>
</div>

<style>
  /* The toolbar and the field read as one box: one border, one focus ring around both. */
  .ne-box {
    border: 1px solid var(--color-border-strong, var(--color-base-300));
    border-radius: 16px;
    background: var(--color-base-100);
    overflow: hidden;
  }
  .ne-box:focus-within {
    border-color: var(--color-leaf-line);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-leaf-line) 22%, transparent);
  }
  .ne-tools {
    display: flex;
    gap: 0.125rem;
    padding: 0.3125rem 0.375rem;
    border-bottom: 1px solid var(--color-base-300);
    background: var(--color-base-200);
  }
  .ne-tool {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 0;
    border-radius: 10px;
    background: none;
    color: var(--color-base-content);
    cursor: pointer;
  }
  .ne-tool:hover {
    background: var(--color-base-100);
    color: var(--color-leaf-deep);
  }
  .ne-tool:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
  .ne-box :global(.ne-area) {
    display: block;
    min-height: 7.5rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    font-size: 1rem;
    line-height: 1.55;
    resize: vertical;
  }
  /* The box carries the focus mark, so the field inside it doesn't add a second one. */
  .ne-box :global(.ne-area:focus),
  .ne-box :global(.ne-area:focus-within) {
    outline: none;
    border: 0;
    box-shadow: none;
  }
</style>
