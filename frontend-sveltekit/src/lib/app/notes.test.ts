import { describe, expect, test } from 'vitest';
import { formatNotes, plainNotes, renderNotes } from './notes.ts';

describe('renderNotes', () => {
  test('escapes everything typed, then adds only its own tags', () => {
    expect(renderNotes('<img src=x onerror=alert(1)> & "q"')).toBe(
      '<p>&lt;img src=x onerror=alert(1)&gt; &amp; &quot;q&quot;</p>',
    );
    expect(renderNotes('**<b>x</b>**')).toBe('<p><strong>&lt;b&gt;x&lt;/b&gt;</strong></p>');
  });

  test('bold, italic, line breaks and paragraphs', () => {
    expect(renderNotes('A **big** and *small* idea\nnext line\n\nNew paragraph')).toBe(
      '<p>A <strong>big</strong> and <em>small</em> idea<br>next line</p><p>New paragraph</p>',
    );
    expect(renderNotes('2 * 3 * 4 and a*b')).toBe('<p>2 * 3 * 4 and a*b</p>');
  });

  test('lists, bulleted and numbered', () => {
    expect(renderNotes('Steps:\n- one\n- **two**\n1. first\n2. second')).toBe(
      '<p>Steps:</p><ul><li>one</li><li><strong>two</strong></li></ul><ol><li>first</li><li>second</li></ol>',
    );
  });

  test('links become clickable, without the sentence’s full stop, and survive emphasis', () => {
    expect(renderNotes('See https://example.com/a_b*c*. Then *read* it.')).toBe(
      '<p>See <a href="https://example.com/a_b*c*" target="_blank" rel="noopener noreferrer">example.com/a_b*c*</a>. Then <em>read</em> it.</p>',
    );
    expect(renderNotes('javascript:alert(1)')).toBe('<p>javascript:alert(1)</p>');
    expect(renderNotes('https://x.test/?a=1&b="2"')).toContain(
      '<a href="https://x.test/?a=1&amp;b=" target="_blank" rel="noopener noreferrer">x.test/?a=1&amp;b=</a>&quot;2&quot;',
    );
  });

  test('plain text for previews', () => {
    expect(plainNotes('- **Krebs** cycle\n2. *ATP*')).toBe('Krebs cycle\nATP');
  });
});

describe('formatNotes', () => {
  test('wraps a selection in bold, and unwraps it again', () => {
    const on = formatNotes('make it big', 8, 11, 'bold');
    expect(on).toEqual({ text: 'make it **big**', start: 10, end: 13 });
    expect(formatNotes(on.text, on.start, on.end, 'bold')).toEqual({
      text: 'make it big',
      start: 8,
      end: 11,
    });
  });

  test('an empty selection leaves the cursor between the marks', () => {
    expect(formatNotes('ab', 1, 1, 'italic')).toEqual({ text: 'a**b', start: 2, end: 2 });
  });

  test('turns the selected lines into a list, and back', () => {
    const on = formatNotes('intro\none\ntwo', 6, 13, 'bullets');
    expect(on.text).toBe('intro\n- one\n- two');
    expect(formatNotes(on.text, on.start, on.end, 'bullets').text).toBe('intro\none\ntwo');
    expect(formatNotes('one\ntwo', 0, 7, 'numbers').text).toBe('1. one\n2. two');
  });
});
