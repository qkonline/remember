// Notes with a little formatting, kept as plain text in the topic's `notes` field (so the synced
// record, its limit and old notes all stay as they are):
//
//   **bold**   *italic*   lines starting "- " (a list)   lines starting "1. " (a numbered list)
//   a blank line between paragraphs; links (http:// or https://) are found and made clickable.
//
// `renderNotes` turns that into HTML for `{@html}`: it escapes the whole text first and only then
// adds its own few tags, so nothing typed can become markup. Links open in a new tab.

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Runs on escaped text: a quote or angle bracket (now an entity) ends a link.
const URL_RE = /\bhttps?:\/\/(?:(?!&quot;|&lt;|&gt;)\S)+/gi;
const BULLET_RE = /^\s*[-*•]\s+(.*)$/;
const NUMBER_RE = /^\s*\d{1,3}[.)]\s+(.*)$/;

/** Bold, italic and links within one line (already escaped). */
function inline(line: string): string {
  const links: string[] = [];
  let s = line.replace(URL_RE, (raw) => {
    // A sentence's full stop or closing bracket is not part of the link.
    const url = raw.replace(/[.,;:!?)\]'’]+$/, '');
    const rest = raw.slice(url.length);
    links.push(
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url.replace(/^https?:\/\//i, '')}</a>`,
    );
    return `\u0000${links.length - 1}\u0000${rest}`;
  });
  s = s.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*(?=\S)(.+?)(?<=\S)\*(?![*\w])/g, '$1<em>$2</em>');
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => links[Number(i)] ?? '');
}

export function renderNotes(text: string): string {
  const lines = escape(text.replace(/\r\n?/g, '\n')).split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;

  const endPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
    para = [];
  };
  const endList = () => {
    if (list)
      out.push(`<${list.tag}>${list.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };

  for (const line of lines) {
    const bullet = BULLET_RE.exec(line);
    const number = bullet ? null : NUMBER_RE.exec(line);
    if (bullet || number) {
      const tag = bullet ? 'ul' : 'ol';
      endPara();
      if (list && list.tag !== tag) endList();
      list ??= { tag, items: [] };
      list.items.push((bullet ?? number)?.[1] ?? '');
    } else if (!line.trim()) {
      endPara();
      endList();
    } else {
      endList();
      para.push(line);
    }
  }
  endPara();
  endList();
  return out.join('');
}

/** The notes' text without the marks, for one-line previews and search. */
export const plainNotes = (text: string) =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[^*\w])\*(\S.*?\S|\S)\*/g, '$1$2')
    .replace(/^\s*(?:[-*•]|\d{1,3}[.)])\s+/gm, '');

/**
 * Wraps the selection in `mark` (or adds/removes it around the cursor), or turns the selected
 * lines into a list. Returns the new text and selection, for a textarea's toolbar and keys.
 */
export function formatNotes(
  text: string,
  start: number,
  end: number,
  kind: 'bold' | 'italic' | 'bullets' | 'numbers',
): { text: string; start: number; end: number } {
  if (kind === 'bold' || kind === 'italic') {
    const mark = kind === 'bold' ? '**' : '*';
    const before = text.slice(0, start);
    const chosen = text.slice(start, end);
    const after = text.slice(end);
    if (before.endsWith(mark) && after.startsWith(mark) && !(kind === 'italic' && before.endsWith('**'))) {
      return {
        text: before.slice(0, -mark.length) + chosen + after.slice(mark.length),
        start: start - mark.length,
        end: end - mark.length,
      };
    }
    return {
      text: before + mark + chosen + mark + after,
      start: start + mark.length,
      end: end + mark.length,
    };
  }
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', Math.max(end - (end > start ? 1 : 0), start));
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const re = kind === 'bullets' ? BULLET_RE : NUMBER_RE;
  const all = lines.every((l) => re.test(l));
  const changed = lines
    .map((l, i) => {
      const bare = l.replace(/^\s*(?:[-*•]|\d{1,3}[.)])\s+/, '');
      return all ? bare : kind === 'bullets' ? `- ${bare}` : `${i + 1}. ${bare}`;
    })
    .join('\n');
  const result = text.slice(0, lineStart) + changed + text.slice(lineEnd);
  return { text: result, start: lineStart, end: lineStart + changed.length };
}
