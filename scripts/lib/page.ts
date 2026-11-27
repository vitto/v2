/*
  The page of a report: the shell every script that draws one shares (the epic of the HTML
  reports, #73). A script keeps its facts and its Markdown; this gives them a page that opens from
  a file, offline, printed, or published as an Artifact as it is.

  - One document, nothing loaded from the network: the styles are inline, a script is optional
    and only adds to a page that reads complete without it (a filter, a scroll).
  - The colours are tokens on `:root`, light and dark: the dark ones under
    `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and again
    under `:root[data-theme="dark"]`, so a host that sets the theme on the page wins over the
    system (the contract of an Artifact page). `body` has its own background.
  - Readable at the width of a phone: one column under 640 px, no scroll of the page sideways.
  - Pure functions, no input of their own; what a page says comes from the script that calls them.

  Where each answer comes from: the tokens below, chosen for a contrast of 4.5:1 or more of every
  text colour on the surfaces it sits on, in both themes (WCAG 2.2, 1.4.3).
*/

/** A text as HTML: the five characters HTML reads, as entities. */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * The inline Markdown a cell of a report holds, as HTML: `code`, and "words in double quotes"
 * (the words a person says) as a chip. Quotes inside code stay as they are. Everything else is
 * escaped.
 */
export const inline = (value: string): string =>
  value
    .split('`')
    .map((part, i) =>
      i % 2 === 1
        ? `<code>${escapeHtml(part)}</code>`
        : escapeHtml(part).replace(/&quot;(.+?)&quot;/g, '<q>$1</q>'),
    )
    .join('');

/** The colours, by name: the same names in both themes. */
export const LIGHT: Record<string, string> = {
  bg: '#f6f7f9',
  surface: '#ffffff',
  fg: '#111827',
  muted: '#4b5563',
  line: '#e5e7eb',
  code: '#f1f5f9',
  violet: '#6d28d9',
  'violet-soft': '#f3eefe',
  teal: '#0e7490',
  'teal-soft': '#e6f6f8',
  amber: '#a14a07',
  'amber-soft': '#fdf3e6',
  green: '#065f46',
  'green-soft': '#e8f7f0',
  red: '#b91c1c',
  'red-soft': '#fdecec',
};

export const DARK: Record<string, string> = {
  bg: '#0b0f17',
  surface: '#131a24',
  fg: '#e5e7eb',
  muted: '#9ca3af',
  line: '#263041',
  code: '#1b2431',
  violet: '#b69cff',
  'violet-soft': '#231b3a',
  teal: '#5fd0e3',
  'teal-soft': '#0f2a30',
  amber: '#f3b66b',
  'amber-soft': '#33240f',
  green: '#7ee2b8',
  'green-soft': '#10291f',
  red: '#fca5a5',
  'red-soft': '#3a1414',
};

const tokens = (colours: Record<string, string>): string =>
  Object.entries(colours)
    .map(([name, value]) => `--${name}: ${value};`)
    .join(' ');

/** What every page shares: the tokens, the type, tables, chips, cards, print. */
export const BASE_STYLES = `
:root { color-scheme: light dark; ${tokens(LIGHT)} }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${tokens(DARK)} } }
:root[data-theme="dark"] { ${tokens(DARK)} }
:root[data-theme="light"] { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1240px; margin: 0 auto; padding: 32px 16px 64px; }
h1 { font-size: 28px; line-height: 1.2; margin: 0; }
h2 { font-size: 20px; margin: 40px 0 4px; }
h3 { font-size: 17px; margin: 0; }
h4 { font-size: 15px; margin: 0; }
p { margin: 0; }
a { color: inherit; }
.muted { color: var(--muted); }
code { font: 13px/1.4 ui-monospace, "SF Mono", Menlo, Consolas, monospace; background: var(--code); padding: 1px 5px; border-radius: 4px; overflow-wrap: anywhere; }
q { quotes: none; color: var(--green); background: var(--green-soft); padding: 1px 6px; border-radius: 999px; font-size: 13px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.chip { font-size: 12px; border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; color: var(--muted); }
.box { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); font-weight: 600; }
tbody tr:last-child td { border-bottom: 0; }
footer { margin-top: 40px; font-size: 13px; }
[hidden] { display: none !important; }
@media (max-width: 640px) {
  table.stack, table.stack tbody, table.stack tr, table.stack td { display: block; }
  table.stack thead { display: none; }
  table.stack tr { padding: 10px 12px; border-bottom: 1px solid var(--line); }
  table.stack td { border: 0; padding: 2px 0; }
}
@media print {
  body { background: #ffffff; }
  nav, input { display: none; }
  .box, article { break-inside: avoid; }
}
`;

export interface PageOptions {
  /** The title of the document: two to four words. */
  title: string;
  /** What is inside `<main>`, as HTML. */
  body: string;
  /** The language of the page. */
  lang?: string;
  /** The styles of this kind of page, after the shared ones. */
  styles?: string;
  /** A script that only adds to the page: the page reads complete without it. */
  script?: string;
}

/** The whole document. */
export const page = ({ title, body, lang = 'en', styles = '', script = '' }: PageOptions): string => `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${BASE_STYLES}${styles}</style>
</head>
<body>
<main>
${body}
</main>
${script ? `<script>${script}</script>\n` : ''}</body>
</html>
`;
