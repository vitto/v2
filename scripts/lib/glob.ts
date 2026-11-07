/*
  The file patterns of .claude/v2.json, matched against the paths git prints (relative to the root
  of the repository, with forward slashes). No package: a pattern becomes a regular expression.

  - `**` any number of folders (`src/**` takes `src/a.ts` and `src/a/b.ts`);
  - `*` any characters but `/`; `?` one character but `/`;
  - `{a,b}` one of the alternatives;
  - `{name}` a named capture: the shortest text, slashes included, that lets the rest match.
    `src/pages/{page}.astro` takes `src/pages/blog/post.astro` with page = `blog/post`;
    `src/components/{name}/**` takes the first folder under components as name.
*/

const escape = (text: string): string => text.replace(/[.+^$()|[\]\\]/g, '\\$&');

/** The regular expression of a pattern, anchored at both ends. */
export const globToRegExp = (pattern: string): RegExp => {
  let out = '';
  let i = 0;
  while (i < pattern.length) {
    const rest = pattern.slice(i);
    if (rest.startsWith('**/')) {
      out += '(?:.*/)?';
      i += 3;
    } else if (rest === '**' && out.endsWith('/')) {
      out = `${out.slice(0, -1)}(?:/.*)?`;
      i += 2;
    } else if (rest.startsWith('**')) {
      out += '.*';
      i += 2;
    } else if (rest[0] === '*') {
      out += '[^/]*';
      i += 1;
    } else if (rest[0] === '?') {
      out += '[^/]';
      i += 1;
    } else if (rest[0] === '{') {
      const end = rest.indexOf('}');
      if (end === -1) throw new Error(`unclosed { in the pattern ${pattern}`);
      const inside = rest.slice(1, end);
      if (/^[A-Za-z_]\w*$/.test(inside)) out += `(?<${inside}>.+?)`;
      else out += `(?:${inside.split(',').map((alt) => globToRegExp(alt).source.slice(1, -1)).join('|')})`;
      i += end + 1;
    } else {
      out += escape(rest[0]);
      i += 1;
    }
  }
  return new RegExp(`^${out}$`);
};

/** The captures of the first pattern a file matches, or null when it matches none. */
export const matchAny = (
  patterns: string[],
  file: string,
): { pattern: string; captures: Record<string, string> } | null => {
  for (const pattern of patterns) {
    const match = globToRegExp(pattern).exec(file);
    if (match) return { pattern, captures: { ...match.groups } };
  }
  return null;
};

/** A template with its `{name}` placeholders replaced. */
export const fill = (template: string, captures: Record<string, string>): string =>
  template.replace(/\{([A-Za-z_]\w*)\}/g, (whole, name: string) => captures[name] ?? whole);
