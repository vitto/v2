/*
  The Markdown every script prints: tables whose cells keep their columns, links to GitHub, and
  short labels. Pure functions, no input of their own.
*/

/** A table cell: no line break, no bare pipe. */
export const cell = (text: string): string => text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');

/** A text cut to `max` characters, the cut marked with three dots. */
export const short = (text: string, max = 60): string =>
  text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;

/** `[#12](url)`. */
export const link = (n: number, url: string): string => `[#${n}](${url})`;

/** `1 file`, `2 files`. */
export const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

/** At most `max` items, the rest counted in one more item. */
export const capped = (items: string[], max: number): string[] =>
  items.length > max ? [...items.slice(0, max), `+${items.length - max} more`] : items;

/** A Markdown table from a header and rows of cells (already escaped). */
export const table = (header: string[], rows: string[][]): string[] => [
  `| ${header.join(' | ')} |`,
  `|${header.map((name) => '-'.repeat(name.length + 2)).join('|')}|`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
];
