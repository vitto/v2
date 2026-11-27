import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contrast, parseColor } from './measure.ts';
import { BASE_STYLES, DARK, LIGHT, escapeHtml, inline, page } from './page.ts';

describe('the page', () => {
  it('escapes what HTML reads', () => assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'));

  it('reads `code` and "words" in a cell; a quote inside code stays', () => {
    assert.equal(inline('type `/v2:help <x>` or "aiuto"'), 'type <code>/v2:help &lt;x&gt;</code> or <q>aiuto</q>');
    assert.equal(inline('`say "a"` then "b"'), '<code>say &quot;a&quot;</code> then <q>b</q>');
  });

  it('is one document, its title and its body, the script only when given', () => {
    const html = page({ title: 'A <report>', body: '<p>x</p>' });
    assert.match(html, /^<!doctype html>\n<html lang="en">/);
    assert.match(html, /<title>A &lt;report&gt;<\/title>/);
    assert.match(html, /<main>\n<p>x<\/p>\n<\/main>/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(page({ title: 't', body: '', script: 'go()' }), /<script>go\(\)<\/script>/);
  });

  it('gives the dark theme to the system and to a host that sets it, and body its background', () => {
    assert.match(BASE_STYLES, /@media \(prefers-color-scheme: dark\) \{ :root:not\(\[data-theme="light"\]\) \{/);
    assert.match(BASE_STYLES, /:root\[data-theme="dark"\] \{/);
    assert.match(BASE_STYLES, /body \{[^}]*background: var\(--bg\)/);
    assert.deepEqual(Object.keys(DARK), Object.keys(LIGHT), 'the two themes name the same colours');
  });

  // the header of page.ts: every text colour 4.5:1 or more on the surfaces it sits on, both themes
  const pairs: [string, string][] = [
    ['fg', 'bg'], ['fg', 'surface'], ['fg', 'code'], ['muted', 'bg'], ['muted', 'surface'],
    ['violet', 'violet-soft'], ['violet', 'surface'], ['teal', 'teal-soft'], ['teal', 'surface'],
    ['amber', 'amber-soft'], ['amber', 'surface'], ['green', 'green-soft'], ['red', 'red-soft'], ['red', 'surface'],
  ];
  for (const [theme, colours] of [['light', LIGHT], ['dark', DARK]] as const) {
    for (const [text, ground] of pairs) {
      it(`${theme}: ${text} on ${ground} reaches 4.5:1`, () => {
        const ratio = contrast(parseColor(colours[text]) ?? [0, 0, 0, 1], parseColor(colours[ground]) ?? [0, 0, 0, 1]);
        assert.ok(ratio >= 4.5, `${colours[text]} on ${colours[ground]}: ${ratio.toFixed(2)}:1`);
      });
    }
  }
});
