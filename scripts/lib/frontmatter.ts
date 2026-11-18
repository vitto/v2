/*
  The frontmatter of a SKILL.md, read as strictly as it must parse: a skill whose YAML does not
  parse loads with empty metadata, and nothing says so. No package: the skills keep to a small part
  of YAML, and what is outside it is refused with its line rather than guessed.

  - `key: value`, one per line, each key once; blank lines and `# comments` between them;
  - a value plain (`a value`), single-quoted (`'the project''s'`, a quote inside doubled),
    double-quoted (`"a \"b\""`, with the backslash escapes of YAML), or a block (`|` or `>`, with
    `-` or `+`, its lines indented under the key);
  - refused, with its line: a quote that closes a value before the line ends (`'the project's'`),
    a quoted value not closed on its line, an escape YAML does not have, `: ` in a plain value
    (YAML reads a map there) or ` #` (YAML cuts the value there), a value that opens a list, a map,
    an anchor, an alias or a tag, a key twice, an indented line outside a block, a line that is no
    `key: value`, a file without its two `---` lines.
*/

// typed on the name, so that the type check knows nothing runs after a call
const fail: (line: number, reason: string) => never = (line, reason) => {
  throw new Error(`line ${line}: ${reason}`);
};

/** What may follow a closed quote or a block indicator: nothing, or a comment after a space. */
const AFTER = /^(?:[ \t]+#.*)?[ \t]*$/;

const KEY = /^([A-Za-z_][\w-]*):(?:[ \t]+(.*))?$/;

const BLOCK = /^[|>](?:[1-9][-+]?|[-+][1-9]?)?$/;

const ESCAPES: Record<string, string> = {
  '0': '\0',
  a: '\x07',
  b: '\b',
  t: '\t',
  '\t': '\t',
  n: '\n',
  v: '\v',
  f: '\f',
  r: '\r',
  e: '\x1b',
  ' ': ' ',
  '"': '"',
  '/': '/',
  '\\': '\\',
  N: '\x85',
  _: '\xa0',
  L: '\u2028',
  P: '\u2029',
};

/** The hex digits after `\x`, `\u` and `\U`. */
const HEX: Record<string, number> = { x: 2, u: 4, U: 8 };

/** A few characters before `at`, to show where a quote closed. */
const before = (raw: string, at: number): string => JSON.stringify(raw.slice(Math.max(0, at - 15), at));

const closed = (raw: string, at: number, line: number, quote: string): void => {
  const rest = raw.slice(at);
  if (!AFTER.test(rest)) {
    fail(
      line,
      `the ${quote} value closes after ${before(raw, at)}, and ${JSON.stringify(rest.slice(0, 15))} follows: ` +
        (quote === 'single-quoted' ? "a quote inside it is written ''" : 'a quote inside it is written \\"'),
    );
  }
};

const singleQuoted = (raw: string, line: number): string => {
  let out = '';
  for (let i = 1; i < raw.length; i += 1) {
    if (raw[i] !== "'") out += raw[i];
    else if (raw[i + 1] === "'") {
      out += "'";
      i += 1;
    } else {
      closed(raw, i + 1, line, 'single-quoted');
      return out;
    }
  }
  return fail(line, 'the single-quoted value is not closed on its line');
};

const doubleQuoted = (raw: string, line: number): string => {
  let out = '';
  for (let i = 1; i < raw.length; i += 1) {
    const c = raw[i] as string;
    if (c === '"') {
      closed(raw, i + 1, line, 'double-quoted');
      return out;
    }
    if (c !== '\\') {
      out += c;
      continue;
    }
    const escape = raw[i + 1] ?? '';
    if (Object.hasOwn(HEX, escape)) {
      const digits = raw.slice(i + 2, i + 2 + (HEX[escape] as number));
      const code = /^[0-9A-Fa-f]+$/.test(digits) && digits.length === HEX[escape] ? parseInt(digits, 16) : -1;
      if (code < 0 || code > 0x10ffff) fail(line, `\\${escape}${digits} is no character`);
      out += String.fromCodePoint(code);
      i += 1 + digits.length;
    } else if (Object.hasOwn(ESCAPES, escape)) {
      out += ESCAPES[escape];
      i += 1;
    } else {
      fail(line, `\\${escape} is no escape of a double-quoted value: a backslash is written \\\\`);
    }
  }
  return fail(line, 'the double-quoted value is not closed on its line');
};

const plain = (value: string, line: number): string => {
  if (/^[[\]{},&*!%@`#]/.test(value) || /^[-?:](?:\s|$)/.test(value)) {
    fail(line, `a value that starts with ${value[0]} is not plain text in YAML: quote it`);
  }
  if (/:(?:\s|$)/.test(value)) fail(line, 'a ": " in a plain value makes YAML read a map: quote the value');
  if (/\s#/.test(value)) fail(line, 'a " #" in a plain value starts a comment and cuts it: quote the value');
  return value;
};

/** The fields of the frontmatter of a Markdown file; an Error with the line of the first fault. */
export const frontmatter = (text: string): Record<string, string> => {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trimEnd() !== '---') fail(1, 'no frontmatter: the file does not start with a --- line');
  const end = lines.findIndex((row, i) => i > 0 && row.trimEnd() === '---');
  if (end === -1) fail(1, 'the frontmatter has no closing --- line');

  const fields = new Map<string, string>();
  for (let i = 1; i < end; i += 1) {
    const row = lines[i] as string;
    const line = i + 1;
    if (/^\s*(?:#.*)?$/.test(row)) continue;
    if (/^\s/.test(row)) fail(line, 'an indented line outside a block value (| or >)');
    const match = KEY.exec(row) ?? fail(line, 'not a "key: value" line');
    const [, key = '', rest = ''] = match;
    if (fields.has(key)) fail(line, `${key} is there twice`);
    const raw = rest.trimEnd();

    if (raw.startsWith("'")) fields.set(key, singleQuoted(raw, line));
    else if (raw.startsWith('"')) fields.set(key, doubleQuoted(raw, line));
    else if (/^[|>]/.test(raw)) {
      const indicator = raw.split(/[ \t]/, 1)[0] as string;
      if (!BLOCK.test(indicator) || !AFTER.test(raw.slice(indicator.length))) {
        fail(line, `${JSON.stringify(raw)} is no block header: | or >, then - or +, then a comment at most`);
      }
      // the block: the lines after it, blank or indented; for > its lines joined by spaces
      const body: string[] = [];
      let indent = 0;
      while (i + 1 < end && /^(?: +\S|\s*$)/.test(lines[i + 1] as string)) {
        i += 1;
        const inner = lines[i] as string;
        if (!inner.trim()) continue;
        const own = inner.length - inner.trimStart().length;
        indent ||= own;
        if (own < indent) fail(i + 1, 'a line of the block indented less than its first line');
        body.push(inner.slice(indent));
      }
      fields.set(key, body.join(indicator.startsWith('|') ? '\n' : ' '));
    } else fields.set(key, raw === '' ? '' : plain(raw, line));
  }
  return Object.fromEntries(fields);
};
