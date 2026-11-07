/*
  The preview of an epic: its branch with every open part merged in, on a local branch nobody
  pushes, in a worktree of its own, to see and test in one place the work that converges while
  its pieces live in several worktrees. The skill /v2:test builds it and shows its table.

    node scripts/preview.ts <epic number> [--branch=<branch of the epic>] [--dir=<folder>] [--repo=<owner/name>] [--config=<file>]
        rebuild the preview, then print what it holds as a table, and how to see it

  GOVERNANCE.md rule 2: a part reaches the branch of the epic only through its pull request,
  merged on a person's approval. Rule 5: the preview never touches that branch; it is rebuilt
  from it on every run, so nothing in it is lost or needs undoing, and it is never pushed.

  Where each answer comes from:

  - the epic, its branch, its parts and their order: scripts/lib/github.ts (`readEpic`) and
    scripts/lib/epic.ts (`rowsOf`);
  - the branch of a part: the head branch of its open pull request into the branch of the epic,
    else a branch linked to it, else a local branch named `<part>-...` (rule 3); the open pull
    requests into the branch of the epic that belong to no part are merged too, as the work of
    the epic itself;
  - which copy of a branch: the local one when it holds commits origin has not (not pushed yet),
    origin's when the local one is only behind or missing; both moved: the local one, said so
    (scripts/lib/worktrees.ts);
  - the worktree of a branch: `git worktree list`; its uncommitted changes: `git status` there,
    without the node_modules links a worktree may carry. They cannot be merged (a merge takes
    commits), so the table says so instead of leaving them out silently;
  - the folder: `preview.dir` of .claude/v2.json (default `{main}-wt-{epic}-preview`, beside the
    main worktree), or `--dir`; the branch: `<epic>-preview`, local only;
  - how to install, build and serve it: `preview.install`, `preview.build`, `preview.serve` of
    .claude/v2.json; without them the table says they are unknown.

  It never loses work: it rebuilds the preview only when its folder holds no uncommitted change
  and no commit of its own (one that is neither a merge nor reachable from what it merges, the
  branch of the epic and the branches of the parts); otherwise it stops and says what is there.
  Work belongs on the branch of a part.
*/
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseArgs } from './lib/args.ts';
import { configNotice, loadConfig, type Config } from './lib/config.ts';
import { rowsOf, type Epic, type Part, type PullRequest } from './lib/epic.ts';
import { readEpic } from './lib/github.ts';
import { fill } from './lib/glob.ts';
import { cell, link, plural, short, table } from './lib/markdown.ts';
import { git, repoOf } from './lib/run.ts';
import {
  byBranch,
  exists,
  resolveCopy,
  uncommitted,
  type Copy,
} from './lib/worktrees.ts';

export interface Entry {
  parts: Part[];
  pr: PullRequest | null;
  branch: string | null;
  ref: string | null;
  copy: Copy;
  /** Commits of the local copy origin has not; 'never' when the branch was never pushed. */
  notPushed: number | 'never';
  diverged: boolean;
  worktree: string | null;
  dirty: string[];
  outcome: 'merged' | 'already in' | 'conflict' | 'missing';
  conflicts: string[];
}

/** The branches to merge, in the order the work lands: open pull requests first, then the parts with no pull request. */
export const entriesOf = (
  epic: Epic,
  localBranches: string[],
): Pick<Entry, 'parts' | 'pr' | 'branch'>[] => {
  const out: Pick<Entry, 'parts' | 'pr' | 'branch'>[] = [];
  const seen = new Set<string>();
  for (const row of rowsOf(epic)) {
    if (row.kind === 'open' && row.pr && !row.landing && row.pr.baseRefName === epic.branch) {
      if (seen.has(row.pr.headRefName)) continue;
      seen.add(row.pr.headRefName);
      out.push({ parts: row.parts, pr: row.pr, branch: row.pr.headRefName });
    }
    if (row.kind === 'waiting' && row.parts[0]?.state === 'OPEN') {
      const part = row.parts[0];
      const candidates = [
        ...part.branches,
        ...localBranches.filter((name) => name.startsWith(`${part.number}-`)),
      ].filter(
        (name) => name !== epic.branch && !name.startsWith(`${epic.number}-`) && !seen.has(name),
      );
      const branch = candidates[0] ?? null;
      if (branch) seen.add(branch);
      out.push({ parts: [part], pr: null, branch });
    }
  }
  return out;
};

/** The folder of the preview, from the template of the configuration. */
export const previewDir = (template: string, main: string, epic: number): string =>
  path.resolve(main, fill(template, { main, repo: path.basename(main), epic: String(epic) }));

export interface Preview {
  epic: Epic;
  dir: string;
  branch: string;
  base: string;
  entries: Entry[];
  /** Why the preview was not rebuilt; empty when it was. */
  blocked: string[];
  created: boolean;
  /** Whether the install of the configuration is due in the folder. */
  installDue: boolean;
}

/**
 * Rebuilds the preview in `dir` on `branch` from `base`, merging each entry's ref in order.
 * Stops before touching anything when the folder or the branch holds work of its own.
 */
export const rebuild = (
  repo: string,
  dir: string,
  branch: string,
  base: string,
  entries: Omit<Entry, 'outcome' | 'conflicts'>[],
): { entries: Entry[]; blocked: string[]; created: boolean } => {
  const refs = entries.map((entry) => entry.ref).filter((ref): ref is string => !!ref);
  const blocked: string[] = [];
  const created = !existsSync(dir);
  const ownCommits = (tip: string) =>
    (git(repo, ['rev-list', '--no-merges', '--oneline', tip, '--not', base, ...refs], true) ?? '')
      .split('\n')
      .filter(Boolean);

  if (created) {
    if (exists(repo, `refs/heads/${branch}`)) {
      const own = ownCommits(branch);
      if (own.length)
        blocked.push(`the branch \`${branch}\` holds commits of its own: ${own.join('; ')}`);
    }
    if (!blocked.length) {
      // a folder deleted by hand leaves its worktree registered: prune forgets only those
      git(repo, ['worktree', 'prune']);
      git(repo, ['worktree', 'add', '--quiet', '-B', branch, dir, base]);
    }
  } else {
    const head = git(dir, ['rev-parse', '--abbrev-ref', 'HEAD'], true);
    if (head !== branch)
      blocked.push(`\`${dir}\` is on \`${head ?? 'no branch'}\`, not on \`${branch}\``);
    else {
      const dirty = uncommitted(dir);
      if (dirty.length)
        blocked.push(
          `\`${dir}\` holds uncommitted changes: ${dirty.map((line) => line.slice(3)).join(', ')}`,
        );
      // by its name, not HEAD: `repo` is another worktree, whose HEAD is another branch
      const own = ownCommits(`refs/heads/${branch}`);
      if (own.length) blocked.push(`\`${branch}\` holds commits of its own: ${own.join('; ')}`);
    }
    if (!blocked.length) git(dir, ['reset', '--quiet', '--hard', base]);
  }
  if (blocked.length)
    return {
      entries: entries.map((entry) => ({
        ...entry,
        outcome: entry.ref ? 'conflict' : 'missing',
        conflicts: [],
      })),
      blocked,
      created,
    };

  const done: Entry[] = [];
  for (const entry of entries) {
    if (!entry.ref) {
      done.push({ ...entry, outcome: 'missing', conflicts: [] });
      continue;
    }
    if (git(dir, ['merge-base', '--is-ancestor', entry.ref, 'HEAD'], true) !== null) {
      done.push({ ...entry, outcome: 'already in', conflicts: [] });
      continue;
    }
    // --no-verify: the preview is never pushed, there is nothing for the hooks to hold
    if (
      git(dir, ['merge', '--no-ff', '--no-edit', '--no-verify', '--quiet', entry.ref], true) !==
      null
    ) {
      done.push({ ...entry, outcome: 'merged', conflicts: [] });
      continue;
    }
    const conflicts = (git(dir, ['diff', '--name-only', '--diff-filter=U'], true) ?? '')
      .split('\n')
      .filter(Boolean);
    git(dir, ['merge', '--abort'], true);
    done.push({ ...entry, outcome: 'conflict', conflicts });
  }
  return { entries: done, blocked, created };
};

const PAGES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages.ts');

/** How to see what a folder holds: install, build, serve, then the pages to test. */
export const seeIt = (config: Config, dir: string, installDue: boolean): string[] => {
  const { install, build, serve } = config.preview;
  const out: string[] = [];
  if (!install && !build.length && !serve.length) {
    out.push(
      'How to install, build and serve this project is not known: add `preview` to `.claude/v2.json` (the README of v2 shows how).',
    );
  }
  if (install && installDue) out.push(`Install once, in \`${dir}\`: \`${install}\`.`);
  if (build.length)
    out.push(`Build, in \`${dir}\`: ${build.map((command) => `\`${command}\``).join(', then ')}.`);
  for (const server of serve)
    if (server.command)
      out.push(
        `Serve ${server.name}, in \`${server.cwd ? path.join(dir, server.cwd) : dir}\`: \`${server.command}\` (it answers at ${server.url}).`,
      );
  out.push(
    `The pages to test, in \`${dir}\`: \`node ${PAGES}\`${serve.length ? ` (the URLs of the servers above; \`--<name>=<url>\` overrides one)` : ''}.`,
  );
  return out;
};

/** What the preview holds, in Markdown: the table, then what to do next. */
export const renderPreview = (preview: Preview, config: Config): string => {
  const { epic } = preview;
  const lines = [
    `## Preview of epic ${link(epic.number, epic.url)}: \`${preview.branch}\``,
    '',
    `Folder: \`${preview.dir}\`${preview.created ? ' (created now)' : ''}. Built from \`${preview.base}\`${
      epic.distance
        ? ` (${epic.distance.ahead} commits ahead of \`${epic.defaultBranch}\`, ${epic.distance.behind} behind)`
        : ''
    } and the branches below, in the order the work lands. Local only, rebuilt on every run, never pushed.`,
  ];
  if (preview.blocked.length)
    lines.push(
      '',
      '**Not rebuilt**: nothing was touched, because',
      '',
      ...preview.blocked.map((reason) => `- ${reason}`),
    );
  const rows = preview.entries.map((entry, i) => {
    const what = entry.parts.length
      ? entry.parts
          .map((part) => `${link(part.number, part.url)} ${cell(short(part.title, 50))}`)
          .join('<br>')
      : 'work of the epic itself';
    const pushed =
      entry.copy === 'missing'
        ? '-'
        : entry.notPushed === 'never'
          ? 'never pushed'
          : entry.notPushed
            ? `${plural(entry.notPushed, 'commit')}${entry.diverged ? ', and origin moved too' : ''}`
            : '-';
    const inside = preview.blocked.length
      ? 'not rebuilt'
      : entry.outcome === 'missing'
        ? 'no: no branch yet'
        : entry.outcome === 'conflict'
          ? `no: conflicts in ${entry.conflicts.map((file) => `\`${file}\``).join(', ') || 'files git did not list'}`
          : entry.outcome === 'already in'
            ? 'already in the branch of the epic'
            : entry.dirty.length
              ? `yes, without the ${plural(entry.dirty.length, 'uncommitted file')}`
              : 'yes';
    return [
      String(i + 1),
      what,
      entry.branch ? `\`${cell(entry.branch)}\`${entry.copy === 'origin' ? ' (origin)' : ''}` : '-',
      entry.worktree ? `\`${path.basename(entry.worktree)}\`` : '-',
      entry.dirty.length ? plural(entry.dirty.length, 'file') : '-',
      pushed,
      cell(inside),
    ];
  });
  lines.push(
    '',
    ...table(
      ['#', 'Part', 'Branch', 'Worktree', 'Uncommitted', 'Not pushed', 'In the preview'],
      rows.length
        ? rows
        : [['-', 'no open part', '-', '-', '-', '-', 'the preview is the branch of the epic as it is']],
    ),
  );
  const next: string[] = [];
  if (preview.blocked.length)
    next.push(
      'Move that work onto the branch of its part, or discard it once its owner agrees, then run again.',
    );
  const dirty = preview.entries.filter((entry) => entry.dirty.length && entry.worktree);
  if (dirty.length)
    next.push(
      `Commit on its branch what each part should show: ${dirty.map((entry) => `\`${path.basename(entry.worktree ?? '')}\``).join(', ')}; then run again.`,
    );
  if (!preview.blocked.length) next.push(...seeIt(config, preview.dir, preview.installDue));
  lines.push('', '**Next**', '', ...next.map((line) => `- ${line}`));
  return lines.join('\n');
};

/** Reads the epic, rebuilds its preview and describes it. */
export const previewEpic = (
  number: number,
  config: Config,
  options: { branch?: string; dir?: string; repo?: string } = {},
): Preview => {
  const cwd = process.cwd();
  git(cwd, ['fetch', '--quiet', 'origin']);
  const { epic } = readEpic(repoOf(options.repo, cwd), number, options.branch);
  const { main, byBranch: worktreeOf } = byBranch(cwd);
  const branch = `${number}-preview`;
  const dir = options.dir ? path.resolve(options.dir) : previewDir(config.preview.dir, main, number);
  const installDue = (folder: string) =>
    !!config.preview.install && !existsSync(path.join(folder, config.preview.installed));
  if (!epic.branch)
    return {
      epic,
      dir,
      branch,
      base: '-',
      entries: [],
      blocked: ['the branch of the epic is unknown: `/v2:status` says why'],
      created: false,
      installDue: installDue(dir),
    };
  const base = `origin/${epic.branch}`;
  const localBranches = (
    git(cwd, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/']) ?? ''
  )
    .split('\n')
    .filter(Boolean);
  const entries = entriesOf(epic, localBranches).map((entry) => {
    const resolved = entry.branch
      ? resolveCopy(cwd, entry.branch)
      : { copy: 'missing' as Copy, notPushed: 0, diverged: false, ref: null };
    const worktree = entry.branch ? (worktreeOf.get(entry.branch) ?? null) : null;
    const ready: Omit<Entry, 'outcome' | 'conflicts'> = {
      ...entry,
      ref: resolved.ref,
      copy: resolved.copy,
      notPushed: resolved.notPushed,
      diverged: resolved.diverged,
      worktree,
      dirty: worktree && worktree !== dir ? uncommitted(worktree) : [],
    };
    return ready;
  });
  const result = rebuild(cwd, dir, branch, base, entries);
  return { epic, dir, branch, base, ...result, installDue: installDue(dir) };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const number = args.number('epic');
  if (!number) {
    console.error(
      'usage: node scripts/preview.ts <epic number> [--branch=<branch of the epic>] [--dir=<folder>] [--repo=<owner/name>] [--config=<file>]',
    );
    process.exitCode = 2;
    return;
  }
  const read = loadConfig(process.cwd(), args.value('config'));
  const preview = previewEpic(number, read.config, {
    branch: args.value('branch'),
    dir: args.value('dir'),
    repo: args.value('repo'),
  });
  console.info([...configNotice(read), renderPreview(preview, read.config)].join('\n'));
  if (preview.blocked.length) process.exitCode = 1;
};

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (error) {
    const err = error as Error & { stderr?: string };
    console.error((err.stderr || err.message).trim());
    process.exitCode = 1;
  }
}
