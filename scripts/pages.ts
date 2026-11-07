/*
  The pages to open to test what a branch changes, as a table: title, what changed, URL. The
  skill /v2:test turns it into the table the person tests with (Title, What to test, URL),
  writing what to test from the commits and the diff, and keeps the addresses as printed here.

    node scripts/pages.ts [--base=<ref>] [--head=<ref>] [--<server>=<url>] [--config=<file>]
        print the table in Markdown; run it in the folder being tested (the preview of an epic,
        or the worktree of a branch)

  Where each answer comes from:

  - what changed: `git diff --name-status --no-renames <base>...<head>`, the changes of head since
    it left base (a page whose file was deleted is said so);
    base: the default branch of origin (`refs/remotes/origin/HEAD`, else the default branch gh
    reads, as `origin/<name>`), head: HEAD;
  - what each change says: the subjects of the commits of head that touch it, merges left out,
    and those `ignoreCommits` of .claude/v2.json matches (by default `chore(release)`, which only
    writes versions and changelogs);
  - where a change shows: the rules of `pages` in .claude/v2.json, in their order; a file goes to
    the first rule that takes it:
    - `storybook`: the entries of the index of the running Storybook (`<url>/index.json`: the id
      of each docs page and story and the file it comes from, relative to `root`), the docs page
      first. A folder of `groups` makes one row with the entries of the files under it; a file
      that is itself an entry gets its own. An id comes from the title of the stories, not from
      the name of a file, so no address is written without the index;
    - `static`: the paths of the changed files, through a template (`path`: one page per file,
      a last segment named `index` dropped, as static sites serve it as the folder) or a fixed
      list (`links`: the same pages for every matched file);
    - `command`: a command of the project, run in the root of the checkout with
      `{ files, base, head, url }` as JSON on its input, that prints the rows as JSON:
      `[{ "title": "...", "links": [{ "label": "...", "url": "..." }], "note": "..." }]`
      (a URL starting with `/` is on its server);
  - the address of a server: `--<name>=<url>`, else its `url` in `preview.serve`; whether it
    answers: a request to it (3 seconds);
  - anything no rule takes: one row "no page in the browser", so no change goes unseen.
*/
import { execFileSync } from 'node:child_process';
import { isMain, parseArgs } from './lib/args.ts';
import { configNotice, loadConfig, type Config, type PageRule, type Server } from './lib/config.ts';
import { fill, matchAny } from './lib/glob.ts';
import { capped, cell, plural, table } from './lib/markdown.ts';
import { gh, git, rootOf } from './lib/run.ts';

export interface StoryEntry {
  id: string;
  title: string;
  name: string;
  importPath: string;
  type: 'docs' | 'story';
}

export interface Row {
  title: string;
  changes: string[];
  links: { label: string; url: string }[];
  /** Said when there is no link: why, and what to do. */
  note?: string;
  files: string[];
}

/** The servers of a run: their address, and for Storybook the entries of its index. */
export type Servers = Map<string, { url: string; index: StoryEntry[] | null; answers: boolean }>;

/** Runs a `command` rule; returns its rows, or the reason it gave none. */
export type CommandRunner = (
  rule: Extract<PageRule, { type: 'command' }>,
  files: string[],
  url: string | null,
) => { rows: { title: string; links: { label: string; url: string }[]; note?: string }[] } | { error: string };

const strip = (importPath: string): string => importPath.replace(/^\.\//, '');

const LOOKS_LIKE_STORIES = /(\.stories\.[^/]+|\.mdx)$/;

/** A path of a static site: a last segment named index is the folder. */
export const dropIndex = (page: string): string => page.replace(/(^|\/)index(\.html?)?$/, '$1');

/** A link on a server: a path is joined to its address, a full URL stays as it is. */
export const onServer = (base: string | null, href: string): string =>
  /^https?:\/\//.test(href) || !base ? href : `${base}${href.startsWith('/') ? '' : '/'}${href}`;

interface Bucket {
  rule: number;
  key: string;
  title: string;
  files: string[];
  /** For a storybook folder: the folder; for a storybook file: the file; relative to root. */
  folder?: string;
  file?: string;
  /** For a static template: the page. */
  page?: string;
}

/** The rule and the row a changed file goes to, or null when no rule takes it. */
export const bucketOf = (
  file: string,
  rules: PageRule[],
  servers: Servers,
): Omit<Bucket, 'files'> | null => {
  for (const [i, rule] of rules.entries()) {
    if (rule.type === 'storybook') {
      if (!file.startsWith(`${rule.root}/`)) continue;
      const rel = file.slice(rule.root.length + 1);
      const group = matchAny(rule.groups ?? [], rel);
      if (group) {
        const folder = fill(group.pattern.slice(0, -3), group.captures);
        return { rule: i, key: `folder:${folder}`, title: Object.values(group.captures).join('/'), folder };
      }
      const index = servers.get(rule.server)?.index ?? null;
      const isEntry = index ? index.some((entry) => strip(entry.importPath) === rel) : LOOKS_LIKE_STORIES.test(rel);
      if (isEntry) return { rule: i, key: `file:${rel}`, title: rel, file: rel };
      continue;
    }
    const match = matchAny(rule.files, file);
    if (!match) continue;
    if (rule.type === 'static' && rule.path) {
      const page = dropIndex(fill(rule.path, match.captures));
      return { rule: i, key: `page:${page}`, title: page || '/', page };
    }
    return { rule: i, key: 'all', title: rule.title ?? rule.files.join(', ') };
  }
  return null;
};

/** The rows of the table: by rule, in the order of the rules, then by title; the files no rule takes last. */
export const rowsOf = (
  files: string[],
  subjectsOf: (files: string[]) => string[],
  rules: PageRule[],
  servers: Servers,
  runCommand: CommandRunner,
  deleted: Set<string> = new Set(),
): Row[] => {
  const buckets = new Map<string, Bucket>();
  const other: string[] = [];
  for (const file of files) {
    const bucket = bucketOf(file, rules, servers);
    if (!bucket) {
      other.push(file);
      continue;
    }
    const id = `${bucket.rule}:${bucket.key}`;
    const known = buckets.get(id);
    if (known) known.files.push(file);
    else buckets.set(id, { ...bucket, files: [file] });
  }
  const sorted = [...buckets.values()].sort(
    (a, b) => a.rule - b.rule || a.title.localeCompare(b.title),
  );
  const rows: Row[] = [];
  for (const bucket of sorted) {
    const rule = rules[bucket.rule];
    const server = 'server' in rule && rule.server ? servers.get(rule.server) : undefined;
    const changes = subjectsOf(bucket.files);
    const base = { title: bucket.title, changes, files: bucket.files };
    if (rule.type === 'storybook') {
      const name = rule.server;
      if (!server?.index) {
        rows.push({ ...base, links: [], note: `${name} does not answer at ${server?.url ?? 'its address'}: start it, then run again` });
        continue;
      }
      const entries = server.index
        .filter((entry) =>
          bucket.folder
            ? strip(entry.importPath).startsWith(`${bucket.folder}/`)
            : strip(entry.importPath) === bucket.file,
        )
        .sort((a, b) => (a.type === b.type ? 0 : a.type === 'docs' ? -1 : 1));
      rows.push(
        entries.length
          ? {
              ...base,
              links: entries.map((entry) => ({
                label: entry.type === 'docs' ? `${entry.title}: Docs` : entry.name,
                url: `${server.url}/?path=/${entry.type === 'docs' ? 'docs' : 'story'}/${entry.id}`,
              })),
            }
          : { ...base, links: [], note: `no story in ${name} shows it` },
      );
    } else if (rule.type === 'static') {
      const links =
        bucket.page !== undefined
          ? [{ label: bucket.page || '/', url: onServer(server?.url ?? null, bucket.page || '/') }]
          : (rule.links ?? []).map((one) => ({
              label: one.label,
              url: onServer(server?.url ?? null, one.path),
            }));
      const gone = bucket.page !== undefined && bucket.files.every((file) => deleted.has(file));
      const note = gone ? 'removed by this change: it should redirect or answer 404' : rule.note;
      rows.push({ ...base, links, ...(note ? { note } : {}) });
    } else {
      const result = runCommand(rule, bucket.files, server?.url ?? null);
      if ('error' in result) {
        rows.push({ ...base, links: [], note: `the command of the project failed: ${result.error}` });
        continue;
      }
      if (!result.rows.length) rows.push({ ...base, links: [], note: 'the command of the project lists no page' });
      for (const row of result.rows)
        rows.push({
          title: row.title,
          changes,
          files: bucket.files,
          links: row.links.map((one) => ({ label: one.label, url: onServer(server?.url ?? null, one.url) })),
          ...(row.note ? { note: row.note } : {}),
        });
    }
  }
  if (other.length)
    rows.push({
      title: 'no page in the browser',
      changes: subjectsOf(other),
      files: other,
      links: [],
      note: `${plural(other.length, 'file')}: tests, docs, tooling or CI`,
    });
  return rows;
};

/** The subjects worth reading, each once. */
export const meaningful = (subjects: string[], ignore: string[]): string[] => {
  const skip = ignore.map((pattern) => new RegExp(pattern));
  return [...new Set(subjects.filter((subject) => subject && !skip.some((re) => re.test(subject))))];
};

/** The table in Markdown: at most `max` commits and `max` links a row, the rest counted. */
export const render = (rows: Row[], header: string, max = 6): string => {
  const body = rows.map((row) => {
    const links = capped(
      row.links.map((one) => `[${cell(one.label)}](${one.url})`),
      max,
    );
    if (row.note) links.push(cell(row.note));
    return [
      cell(row.title),
      capped(row.changes.map(cell), max).join('<br>') || '-',
      links.join('<br>') || '-',
    ];
  });
  return [
    header,
    '',
    ...table(['Title', 'What changed', 'URL'], body.length ? body : [['-', 'nothing changed', '-']]),
  ].join('\n');
};

/** Checks the JSON a `command` rule printed. */
export const parseCommandRows = (
  text: string,
): { rows: { title: string; links: { label: string; url: string }[]; note?: string }[] } | { error: string } => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'it did not print JSON' };
  }
  if (!Array.isArray(data)) return { error: 'it did not print a JSON list' };
  const rows: { title: string; links: { label: string; url: string }[]; note?: string }[] = [];
  for (const item of data) {
    if (typeof item !== 'object' || item === null || typeof (item as { title?: unknown }).title !== 'string')
      return { error: 'a row has no title' };
    const row = item as { title: string; links?: unknown; note?: unknown };
    const links = Array.isArray(row.links)
      ? row.links.filter(
          (one): one is { label: string; url: string } =>
            typeof one === 'object' && one !== null && typeof one.label === 'string' && typeof one.url === 'string',
        )
      : [];
    rows.push({ title: row.title, links, ...(typeof row.note === 'string' ? { note: row.note } : {}) });
  }
  return { rows };
};

const commandRunner =
  (root: string, base: string, head: string): CommandRunner =>
  (rule, files, url) => {
    try {
      const out = execFileSync('sh', ['-c', rule.command], {
        cwd: root,
        input: JSON.stringify({ files, base, head, url }),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60_000,
        maxBuffer: 16 * 1024 * 1024,
      });
      return parseCommandRows(out);
    } catch (error) {
      const err = error as Error & { stderr?: string };
      return { error: (err.stderr || err.message).trim().split('\n')[0] ?? 'no output' };
    }
  };

const answers = async (url: string): Promise<boolean> => {
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
};

const readIndex = async (base: string): Promise<StoryEntry[] | null> => {
  try {
    const response = await fetch(`${base}/index.json`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = (await response.json()) as { entries?: Record<string, StoryEntry> };
    return data.entries ? Object.values(data.entries) : null;
  } catch {
    return null;
  }
};

/** The default branch of origin, as a ref. */
const defaultBase = (cwd: string): string | null => {
  const symbolic = git(cwd, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], true);
  if (symbolic) return symbolic;
  try {
    return `origin/${gh(['repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name'], cwd)}`;
  } catch {
    return null;
  }
};

/** The servers the rules name, at the addresses of the options or of the configuration. */
export const serversOf = (config: Config, overrides: Map<string, string>): Server[] =>
  config.preview.serve.map((server) => ({
    ...server,
    url: (overrides.get(server.name) ?? server.url).replace(/\/$/, ''),
  }));

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const root = rootOf(cwd);
  if (!root) {
    console.error('not in a git checkout: run it in the folder being tested');
    process.exitCode = 2;
    return;
  }
  const read = loadConfig(cwd, args.value('config'));
  const { config } = read;
  const base = args.value('base') ?? defaultBase(cwd);
  if (!base) {
    console.error('the default branch of origin is unknown: pass --base=<ref>');
    process.exitCode = 2;
    return;
  }
  const head = args.value('head') ?? 'HEAD';
  const changed = git(root, ['diff', '--name-status', '--no-renames', `${base}...${head}`])
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t') as [string, string]);
  const files = changed.map(([, file]) => file);
  const deleted = new Set(changed.filter(([status]) => status === 'D').map(([, file]) => file));
  const subjectsOf = (group: string[]) =>
    meaningful(
      git(root, ['log', '--no-merges', '--format=%s', `${base}..${head}`, '--', ...group]).split('\n'),
      config.ignoreCommits,
    );

  const used = new Set<string>();
  for (const file of files) {
    const bucket = bucketOf(file, config.pages, new Map());
    const rule = bucket ? config.pages[bucket.rule] : null;
    if (rule && 'server' in rule && rule.server) used.add(rule.server);
  }
  const servers: Servers = new Map();
  const configured = serversOf(config, args.values);
  await Promise.all(
    configured.map(async (server) => {
      const storybook = config.pages.some((rule) => rule.type === 'storybook' && rule.server === server.name);
      const index = storybook ? await readIndex(server.url) : null;
      const up = index ? true : used.has(server.name) ? await answers(server.url) : false;
      servers.set(server.name, { url: server.url, index, answers: up });
    }),
  );
  const rows = rowsOf(files, subjectsOf, config.pages, servers, commandRunner(root, base, head), deleted);

  const states = configured
    .filter((server) => used.has(server.name))
    .map((server) =>
      servers.get(server.name)?.answers
        ? `${server.name} answers at ${server.url}`
        : `${server.name} does not answer at ${server.url}${server.command ? ` (start it: \`${server.command}\`${server.cwd ? ` in \`${server.cwd}\`` : ''})` : ''}`,
    );
  const notes = [
    ...(config.pages.length
      ? []
      : ['No `pages` in .claude/v2.json: every change is listed, none with its page.']),
    ...(states.length ? [`${states.join('; ')}.`] : []),
  ];
  const header = [
    ...configNotice(read),
    `## What to test: \`${head}\` since it left \`${base}\``,
    '',
    `${plural(files.length, 'file')} changed.${notes.length ? ` ${notes.join(' ')}` : ''}`,
  ].join('\n');
  console.info(render(rows, header));
};

if (isMain(import.meta.url))
  main().catch((error: Error & { stderr?: string }) => {
    console.error((error.stderr || error.message).trim());
    process.exitCode = 1;
  });
