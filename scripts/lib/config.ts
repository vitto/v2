/*
  The configuration of a project: `.claude/v2.json` at the root of its repository, optional.
  Without it every script still works from git and GitHub alone; the file only adds what they
  cannot know (the commands that build and serve the project, where its pages are).
  The format: schema/v2.schema.json, and the README of the plugin.

  Where each answer comes from:

  - the file: `--config=<file>` when a script gets one; else `<root of the checkout>/.claude/v2.json`;
    else the same file in the main worktree (a worktree or the preview may not hold a file the
    main checkout keeps uncommitted). Read as JSON; any key starting with `$` (`$schema`,
    `$comment`) is a note and is ignored;
  - a missing key: the defaults below;
  - an error: the key path and what is wrong, so a typo is never ignored silently.
*/
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { git } from './run.ts';

export type MergeMethod = 'merge' | 'queue';

export interface BlockingWorkflow {
  /** The workflow file (`publish.yml`) or its name. */
  workflow: string;
  /** Only the runs started by this event (`workflow_dispatch`); any event when missing. */
  event?: string;
}

export interface Server {
  /** The name the page rules use, and the `--<name>=<url>` option of the scripts. */
  name: string;
  /** Where it answers once started. */
  url: string;
  /** The command that starts it, run in `cwd`. */
  command?: string;
  /** The folder to run the command in, relative to the root of the checkout. */
  cwd?: string;
}

export interface Link {
  label: string;
  /** A path on the server (`/about`) or a full URL. */
  path: string;
}

export type PageRule =
  | {
      /** The entries of the running Storybook (`<url>/index.json`) for the changed files. */
      type: 'storybook';
      server: string;
      /** The folder Storybook runs in; the `importPath` of its entries are relative to it. */
      root: string;
      /** Folders that make one row each, as patterns ending in `/**` with a `{name}`. */
      groups?: string[];
    }
  | {
      /** Pages from the paths of the changed files: a template, or a fixed list. */
      type: 'static';
      server: string;
      files: string[];
      /** One page per changed file: a template filled with the captures of `files`. */
      path?: string;
      /** Or the same pages for every matched file. */
      links?: Link[];
      title?: string;
      note?: string;
    }
  | {
      /** A command of the project that prints the pages as JSON. */
      type: 'command';
      server?: string;
      files: string[];
      command: string;
      title?: string;
    };

export interface Config {
  merge: {
    /** How a pull request into the default branch merges; detected on GitHub when missing. */
    method?: MergeMethod;
    /** Workflows whose runs, while not finished, hold every merge into the default branch. */
    blockingWorkflows: BlockingWorkflow[];
  };
  preview: {
    /** The folder of the preview; `{main}` the main worktree, `{repo}` its name, `{epic}` the number. */
    dir: string;
    install?: string;
    /** What the install creates: when it is missing, the install is due. */
    installed: string;
    build: string[];
    serve: Server[];
  };
  pages: PageRule[];
  /** Commit subjects with nothing to test, as regular expressions. */
  ignoreCommits: string[];
}

export const DEFAULTS: Config = {
  merge: { blockingWorkflows: [] },
  preview: { dir: '{main}-wt-{epic}-preview', installed: 'node_modules', build: [], serve: [] },
  pages: [],
  ignoreCommits: ['^chore\\(release\\)'],
};

export const CONFIG_PATH = '.claude/v2.json';

type Json = unknown;

const isObject = (value: Json): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Checks a parsed configuration; returns it with the defaults filled in, or the errors. */
export const validate = (raw: Json): { config: Config; errors: string[] } => {
  const errors: string[] = [];
  const config: Config = structuredClone(DEFAULTS);
  if (!isObject(raw)) return { config, errors: ['the file is not a JSON object'] };

  const keys = (where: string, value: Record<string, Json>, allowed: string[]) => {
    for (const key of Object.keys(value))
      if (!key.startsWith('$') && !allowed.includes(key))
        errors.push(`${where}${key}: unknown key (known: ${allowed.join(', ')})`);
  };
  const text = (where: string, value: Json): string | undefined => {
    if (typeof value === 'string' && value.trim()) return value;
    errors.push(`${where}: a non-empty string is expected`);
    return undefined;
  };
  const texts = (where: string, value: Json): string[] => {
    const list = typeof value === 'string' ? [value] : value;
    if (!Array.isArray(list) || !list.length) {
      errors.push(`${where}: a string or a non-empty list of strings is expected`);
      return [];
    }
    return list.map((item, i) => text(`${where}[${i}]`, item)).filter((t): t is string => !!t);
  };

  keys('', raw, ['merge', 'preview', 'pages', 'ignoreCommits']);

  if (raw.merge !== undefined) {
    if (!isObject(raw.merge)) errors.push('merge: an object is expected');
    else {
      keys('merge.', raw.merge, ['method', 'blockingWorkflows']);
      const method = raw.merge.method;
      if (method !== undefined) {
        if (method === 'merge' || method === 'queue') config.merge.method = method;
        else
          errors.push(
            `merge.method: ${JSON.stringify(method)} is not one of merge, queue (squash and rebase are never used, GOVERNANCE.md rule 1)`,
          );
      }
      const blocking = raw.merge.blockingWorkflows;
      if (blocking !== undefined) {
        if (!Array.isArray(blocking)) errors.push('merge.blockingWorkflows: a list is expected');
        else
          blocking.forEach((item, i) => {
            const where = `merge.blockingWorkflows[${i}]`;
            if (typeof item === 'string') {
              config.merge.blockingWorkflows.push({ workflow: item });
              return;
            }
            if (!isObject(item)) {
              errors.push(`${where}: a workflow file or { workflow, event } is expected`);
              return;
            }
            keys(`${where}.`, item, ['workflow', 'event']);
            const workflow = text(`${where}.workflow`, item.workflow);
            const event = item.event === undefined ? undefined : text(`${where}.event`, item.event);
            if (workflow) config.merge.blockingWorkflows.push({ workflow, ...(event ? { event } : {}) });
          });
      }
    }
  }

  if (raw.preview !== undefined) {
    if (!isObject(raw.preview)) errors.push('preview: an object is expected');
    else {
      const p = raw.preview;
      keys('preview.', p, ['dir', 'install', 'installed', 'build', 'serve']);
      if (p.dir !== undefined) config.preview.dir = text('preview.dir', p.dir) ?? config.preview.dir;
      if (p.install !== undefined) config.preview.install = text('preview.install', p.install);
      if (p.installed !== undefined)
        config.preview.installed = text('preview.installed', p.installed) ?? 'node_modules';
      if (p.build !== undefined) config.preview.build = texts('preview.build', p.build);
      if (p.serve !== undefined) {
        if (!Array.isArray(p.serve)) errors.push('preview.serve: a list is expected');
        else
          p.serve.forEach((item, i) => {
            const where = `preview.serve[${i}]`;
            if (!isObject(item)) {
              errors.push(`${where}: an object is expected`);
              return;
            }
            keys(`${where}.`, item, ['name', 'url', 'command', 'cwd']);
            const name = text(`${where}.name`, item.name);
            const url = text(`${where}.url`, item.url);
            if (name && !/^[a-z][a-z0-9-]*$/.test(name))
              errors.push(`${where}.name: lowercase letters, digits and dashes, starting with a letter`);
            if (url && !/^https?:\/\//.test(url)) errors.push(`${where}.url: an http(s) URL is expected`);
            if (name && config.preview.serve.some((server) => server.name === name))
              errors.push(`${where}.name: ${name} is taken by another server`);
            const command = item.command === undefined ? undefined : text(`${where}.command`, item.command);
            const cwd = item.cwd === undefined ? undefined : text(`${where}.cwd`, item.cwd);
            if (name && url)
              config.preview.serve.push({
                name,
                url: url.replace(/\/$/, ''),
                ...(command ? { command } : {}),
                ...(cwd ? { cwd } : {}),
              });
          });
      }
    }
  }

  const servers = new Set(config.preview.serve.map((server) => server.name));
  const server = (where: string, value: Json, required: boolean): string | undefined => {
    if (value === undefined && !required) return undefined;
    const name = text(where, value);
    if (name && !servers.has(name))
      errors.push(`${where}: no server named ${name} in preview.serve`);
    return name;
  };

  if (raw.pages !== undefined) {
    if (!Array.isArray(raw.pages)) errors.push('pages: a list is expected');
    else
      raw.pages.forEach((item, i) => {
        const where = `pages[${i}]`;
        if (!isObject(item)) {
          errors.push(`${where}: an object is expected`);
          return;
        }
        if (item.type === 'storybook') {
          keys(`${where}.`, item, ['type', 'server', 'root', 'groups']);
          const name = server(`${where}.server`, item.server, true);
          const root = text(`${where}.root`, item.root);
          const groups = item.groups === undefined ? [] : texts(`${where}.groups`, item.groups);
          for (const group of groups)
            if (!group.endsWith('/**') || !/\{[A-Za-z_]\w*\}/.test(group))
              errors.push(`${where}.groups: ${group} must end in /** and hold a {name}`);
          if (name && root)
            config.pages.push({ type: 'storybook', server: name, root: root.replace(/\/$/, ''), groups });
        } else if (item.type === 'static') {
          keys(`${where}.`, item, ['type', 'server', 'files', 'path', 'links', 'title', 'note']);
          const name = server(`${where}.server`, item.server, true);
          const files = texts(`${where}.files`, item.files);
          const template = item.path === undefined ? undefined : text(`${where}.path`, item.path);
          let links: Link[] | undefined;
          if (item.links !== undefined) {
            if (!Array.isArray(item.links) || !item.links.length)
              errors.push(`${where}.links: a non-empty list is expected`);
            else
              links = item.links.flatMap((one, j) => {
                if (!isObject(one)) {
                  errors.push(`${where}.links[${j}]: { label, path } is expected`);
                  return [];
                }
                keys(`${where}.links[${j}].`, one, ['label', 'path']);
                const label = text(`${where}.links[${j}].label`, one.label);
                const href = text(`${where}.links[${j}].path`, one.path);
                return label && href ? [{ label, path: href }] : [];
              });
          }
          if (!template === !links)
            errors.push(`${where}: give either path (one page per file) or links (the same pages)`);
          const title = item.title === undefined ? undefined : text(`${where}.title`, item.title);
          const note = item.note === undefined ? undefined : text(`${where}.note`, item.note);
          if (name && files.length)
            config.pages.push({
              type: 'static',
              server: name,
              files,
              ...(template ? { path: template } : {}),
              ...(links ? { links } : {}),
              ...(title ? { title } : {}),
              ...(note ? { note } : {}),
            });
        } else if (item.type === 'command') {
          keys(`${where}.`, item, ['type', 'server', 'files', 'command', 'title']);
          const name = server(`${where}.server`, item.server, false);
          const files = texts(`${where}.files`, item.files);
          const command = text(`${where}.command`, item.command);
          const title = item.title === undefined ? undefined : text(`${where}.title`, item.title);
          if (files.length && command)
            config.pages.push({
              type: 'command',
              files,
              command,
              ...(name ? { server: name } : {}),
              ...(title ? { title } : {}),
            });
        } else
          errors.push(`${where}.type: one of storybook, static, command is expected`);
      });
  }

  if (raw.ignoreCommits !== undefined) {
    config.ignoreCommits = Array.isArray(raw.ignoreCommits) && !raw.ignoreCommits.length
      ? []
      : texts('ignoreCommits', raw.ignoreCommits);
    for (const pattern of config.ignoreCommits)
      try {
        new RegExp(pattern);
      } catch {
        errors.push(`ignoreCommits: ${pattern} is not a regular expression`);
      }
  }

  return { config, errors };
};

/** Reads `.claude/v2.json` of a checkout: the configuration, the file read (or null) and the errors. */
export const readConfig = (
  root: string | null,
): { config: Config; file: string | null; errors: string[] } => {
  const file = root ? path.join(root, CONFIG_PATH) : null;
  if (!file || !existsSync(file)) return { config: structuredClone(DEFAULTS), file: null, errors: [] };
  return readFile(file);
};

const readFile = (file: string): { config: Config; file: string | null; errors: string[] } => {
  let raw: Json;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return {
      config: structuredClone(DEFAULTS),
      file,
      errors: [`not JSON: ${(error as Error).message}`],
    };
  }
  return { file, ...validate(raw) };
};

/**
 * The configuration for a folder: `--config=<file>` when given; else `.claude/v2.json` of the
 * checkout the folder belongs to; else that of the main worktree (a worktree, or the preview,
 * may not hold a file the main checkout keeps uncommitted).
 */
export const loadConfig = (
  cwd: string,
  explicit?: string,
): { config: Config; file: string | null; errors: string[] } => {
  if (explicit) {
    const file = path.resolve(cwd, explicit);
    if (!existsSync(file))
      return { config: structuredClone(DEFAULTS), file, errors: [`--config: ${file} does not exist`] };
    return readFile(file);
  }
  const root = git(cwd, ['rev-parse', '--show-toplevel'], true);
  if (root && existsSync(path.join(root, CONFIG_PATH))) return readConfig(root);
  const main = (git(cwd, ['worktree', 'list', '--porcelain'], true) ?? '')
    .split('\n')
    .find((line) => line.startsWith('worktree '))
    ?.slice('worktree '.length);
  return readConfig(main ?? root);
};

/** The lines that say a configuration has errors, for the top of a report; empty when it has none. */
export const configNotice = (read: { file: string | null; errors: string[] }): string[] =>
  read.errors.length
    ? [
        `**${CONFIG_PATH} has errors**, the defaults stand in for the wrong keys:`,
        '',
        ...read.errors.map((error) => `- ${error}`),
        '',
      ]
    : [];
