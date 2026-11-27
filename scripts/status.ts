/*
  Where the work stands, as Markdown tables. The status job of /v2:work (skills/work/status.md) shows what this prints.

    node scripts/status.ts <epic number> [--branch=<branch of the epic>] [--repo=<owner/name>] [--config=<file>]
        the epic: a line per part in the order they land, with an icon for its state and its
        branch; the open pull requests, where each lands, its checks, the open parts that change
        the same files; how far the branch of the epic is behind the default branch; then the next
        action (scripts/lib/epic.ts says where each answer comes from and what each icon means)
    node scripts/status.ts [--repo=<owner/name>] [--config=<file>]
        the repository: each open epic as a summary (its branch, the count of its parts per
        state, a line per part not merged yet), the open issues outside the open epics with their
        state, branch and labels (the agent groups them by subject and writes the domain of each
        row), the open pull requests and what holds each, the local worktrees and the work in
        them GitHub has not seen, then the next action, each block apart by a horizontal rule;
        the states of a part and of an issue outside an epic, and the domains: scripts/lib/epic.ts
    node scripts/status.ts <issue or pull request number | branch | worktree> [--repo=<owner/name>] [--config=<file>]
        one piece of work: its state, its epic, its branch and how far behind it is, its
        worktree and the work there GitHub has not seen, its pull requests and what holds each,
        then the next action (scripts/lib/single.ts says how each target leads to the others);
        a number with sub-issues is an epic, a branch named after an epic is that epic; words
        that name no local worktree (its folder name or path) and no branch print the overview,
        for the agent to narrow to the subject

  Where each answer comes from:

  - GitHub: scripts/lib/github.ts, through `gh`, as the person running it sees it; the
    repository is `--repo`, else the one gh reads from the remotes of the current folder;
  - the local worktrees (the overview and one piece of work): scripts/lib/worktrees.ts, git in the
    current folder; how far a piece of work is behind: `git rev-list --count <tip>..origin/<default
    branch>`, as of the last fetch;
  - how a pull request into the default branch merges: `merge.method` of .claude/v2.json, else
    the merge queue of the default branch when GitHub has one, else a merge commit; the workflows
    that hold it: `merge.blockingWorkflows` (scripts/lib/config.ts).

  It only reads. "ready" means the person can decide, never that a merge may happen
  (GOVERNANCE.md rule 1).
*/
import path from 'node:path';
import { isMain, parseArgs } from './lib/args.ts';
import { configNotice, loadConfig, type Config } from './lib/config.ts';
import {
  ICONS,
  UNKNOWN_DOMAIN,
  holds,
  issueItem,
  itemsOf,
  legends,
  mergeCommand,
  pullTable,
  report,
  rowsOf,
  epicSummary,
  type Landing,
  type Part,
  type PullRequest,
} from './lib/epic.ts';
import {
  hasMergeQueue,
  readBranch,
  readDefaultBranch,
  readEpic,
  readItem,
  readOverview,
  type Overview,
} from './lib/github.ts';
import { cell, details, link, plural, ref, rule, table } from './lib/markdown.ts';
import { git, repoOf, rootOf, type Repo } from './lib/run.ts';
import {
  branchOf,
  branchProgress,
  issueOfBranch,
  issueOfFolder,
  issueOfPull,
  issueProgress,
  pullsOf,
  renderPiece,
  worktreeOf,
  type Piece,
} from './lib/single.ts';
import { exists, onlyHere, resolveCopy, uncommitted, worktreesOf } from './lib/worktrees.ts';

/** How the default branch takes a pull request. */
export const landingOf = (config: Config, mergeQueue: boolean): Landing => ({
  method: config.merge.method ?? (mergeQueue ? 'queue' : 'merge'),
  blocking: config.merge.blockingWorkflows,
});

export interface LocalWorktree {
  dir: string;
  branch: string | null;
  here: boolean;
  dirty: number;
  /** Commits no remote-tracking branch holds. */
  local: number;
}

/** The state of a pull request in one cell: in the queue, what holds it, or ready. */
export const prState = (pr: PullRequest): string[] => {
  const held = holds(pr, [], pr.baseRefName);
  return [...(pr.isInMergeQueue ? ['in the merge queue'] : []), ...(held.length ? held : ['ready'])];
};

/** The repository overview, in Markdown. */
export const renderOverview = (
  repo: Repo,
  overview: Overview,
  landing: Landing,
  worktrees: LocalWorktree[],
): string => {
  const lines = [`## Where \`${repo.owner}/${repo.name}\` stands`, ''];
  lines.push(
    `Default branch: \`${overview.defaultBranch}\`, ${
      landing.method === 'queue' ? 'through its merge queue' : 'with a merge commit'
    }.`,
    '',
    ...legends(),
    ...rule(),
  );
  if (!overview.epics.length) lines.push('No open epic (an issue with sub-issues, GOVERNANCE.md rule 2).');
  else lines.push(overview.epics.map(epicSummary).join(`\n${rule().join('\n')}\n`));

  lines.push(...rule(), '### Open issues outside an epic', '');
  if (!overview.issues.length) lines.push('No open issue outside an epic.');
  else
    lines.push(
      '| # | Domain | Details | State | Labels |',
      '|---|---|---|:-:|---|',
      ...overview.issues.map((issue) => {
        const item = issueItem(issue, overview.pulls);
        return `| ${ref(item.number, item.url)} | ${UNKNOWN_DOMAIN} | ${details(item.title, item.branch)} | ${
          ICONS[item.progress]
        } | ${issue.labels.length ? cell(issue.labels.join(', ')) : '-'} |`;
      }),
    );
  if (overview.unread) lines.push('', `${plural(overview.unread, 'more open issue')} not read: the first 100 only.`);

  lines.push(...rule(), '**Open pull requests**', '');
  if (!overview.pulls.length) lines.push('No open pull request.');
  else lines.push(...pullTable(overview.pulls, (pr) => prState(pr).join('; ')));

  const pullOf = new Map(overview.pulls.map((pr) => [pr.headRefName, pr]));
  if (worktrees.length) {
    lines.push(...rule(), '**Local worktrees**', '');
    lines.push(
      ...table(
        ['Folder', 'Branch', 'Uncommitted', 'Only on this disk', 'Pull request'],
        worktrees.map((w) => {
          const pr = w.branch ? pullOf.get(w.branch) : undefined;
          const preview = w.branch && /^\d+-preview$/.test(w.branch);
          return [
            `\`${cell(path.basename(w.dir))}\`${w.here ? ' (here)' : ''}`,
            w.branch ? `\`${cell(w.branch)}\`` : 'detached',
            w.dirty ? plural(w.dirty, 'file') : '-',
            preview
              ? 'the local preview, never pushed'
              : w.local
                ? plural(w.local, 'commit')
                : '-',
            pr ? ref(pr.number, pr.url) : '-',
          ];
        }),
      ),
    );
  }

  const next: string[] = [];
  for (const pr of overview.pulls)
    if (!pr.isInMergeQueue && !holds(pr, [], pr.baseRefName).length) {
      const method = pr.baseRefName === overview.defaultBranch ? landing.method : 'merge';
      next.push(
        `${link(pr.number, pr.url)} is ready to merge into \`${pr.baseRefName}\`: it waits for your ok ("ok #${pr.number}", then \`${mergeCommand(pr.number, method)}\`).`,
      );
    }
  for (const w of worktrees) {
    if (w.branch && /^\d+-preview$/.test(w.branch)) continue;
    const what = [
      w.dirty ? plural(w.dirty, 'uncommitted file') : '',
      w.local ? `${plural(w.local, 'commit')} no remote branch holds` : '',
    ].filter(Boolean);
    if (what.length)
      next.push(`\`${path.basename(w.dir)}\` holds work GitHub has not seen: ${what.join(', ')}.`);
  }
  if (!next.length) next.push('Nothing waits for your ok, and no worktree holds work GitHub has not seen.');
  lines.push(...rule(), '**Next action**', '', ...next.map((line) => `- ${line}`));
  return lines.join('\n');
};

/** The local worktrees of the repository of a folder, with what each holds. */
export const localWorktrees = (cwd: string): LocalWorktree[] => {
  const here = rootOf(cwd);
  return worktreesOf(cwd).map((w) => ({
    dir: w.dir,
    branch: w.branch,
    here: w.dir === here,
    dirty: uncommitted(w.dir).length,
    local: onlyHere(w.dir, 'HEAD'),
  }));
};

/** What a target resolves to: an epic, reported as one, or one piece of work. */
type Resolved = { kind: 'epic'; number: number; branch?: string } | { kind: 'piece'; piece: Piece };

/** The commits of `base` (its branch on origin) a piece of work misses, from git on this disk; null when unknown. */
const behindOf = (cwd: string, worktree: LocalWorktree | null, branch: string | null, base: string): number | null => {
  const upstream = `origin/${base}`;
  if (!exists(cwd, upstream)) return null;
  const tip = worktree ? git(worktree.dir, ['rev-parse', 'HEAD'], true) : branch ? resolveCopy(cwd, branch).ref : null;
  if (!tip) return null;
  return Number(git(cwd, ['rev-list', '--count', `${tip}..${upstream}`], true) ?? 0);
};

/** One piece of work from its issue (scripts/lib/single.ts says how the rest follows from it). */
const fromIssue = (
  repo: Repo,
  cwd: string,
  local: LocalWorktree[],
  found: { issue: Part; parent: { number: number; state: 'OPEN' | 'CLOSED' } | null },
  defaultBranch: string,
  given: { target: Piece['target']; branch?: string; worktree?: LocalWorktree; pulls?: PullRequest[] },
): Piece => {
  const { issue, parent } = found;
  let pulls = pullsOf(issue, [...issue.mentions, ...(given.pulls ?? [])]);
  let progress = issueProgress(issue, pulls);
  let branch = given.branch ?? branchOf(issue, pulls);
  let epic: Piece['epic'] = null;
  if (parent?.state === 'OPEN') {
    // a part: its state and its pull requests as the report of its epic has them
    const whole = readEpic(repo, parent.number).epic;
    const rows = rowsOf(whole);
    const item = itemsOf(whole, rows).find((one) => one.number === issue.number);
    const ofPart = rows
      .filter((row) => row.pr && !row.landing && row.parts.some((part) => part.number === issue.number))
      .map((row) => row.pr as PullRequest);
    pulls = [...new Map([...pulls, ...ofPart].map((pr) => [pr.number, pr])).values()].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    if (item) progress = item.progress;
    branch = given.branch ?? item?.branch ?? branch;
    epic = { number: whole.number, title: whole.title, url: whole.url, branch: whole.branch };
  }
  const worktree = given.worktree ?? worktreeOf(local, branch, issue.number);
  const base = epic?.branch ?? defaultBranch;
  return {
    target: given.target,
    defaultBranch,
    issue: { number: issue.number, title: issue.title, url: issue.url, state: issue.state },
    epic,
    progress,
    branch,
    worktree,
    base,
    behind: behindOf(cwd, worktree, branch, base),
    pulls,
  };
};

/** A branch: its issue when it has one, else the branch alone; null when no such branch exists. */
const fromBranch = (
  repo: Repo,
  cwd: string,
  local: LocalWorktree[],
  branch: string,
  given: { target: Piece['target']; worktree?: LocalWorktree },
): Resolved | null => {
  const read = readBranch(repo, branch);
  const onDisk = exists(cwd, `refs/heads/${branch}`) || exists(cwd, `refs/remotes/origin/${branch}`);
  if (!read.exists && !onDisk && !given.worktree) return null;
  let epic: Piece['epic'] = null;
  for (const n of [issueOfBranch(branch), ...read.pulls.map(issueOfPull)]) {
    if (!n) continue;
    const { item, defaultBranch } = readItem(repo, n);
    if (item.kind === 'epic') {
      // the branch of the epic is the epic; another branch named after it is the epic's own work
      if (item.branches.includes(branch)) return { kind: 'epic', number: n, branch };
      epic ??= {
        number: item.number,
        title: item.title,
        url: item.url,
        branch: item.branches.length === 1 ? item.branches[0] : null,
      };
      continue;
    }
    if (item.kind === 'issue')
      return {
        kind: 'piece',
        piece: fromIssue(repo, cwd, local, item, defaultBranch, { ...given, branch, pulls: read.pulls }),
      };
  }
  const worktree = given.worktree ?? worktreeOf(local, branch, null);
  const base = epic?.branch ?? read.defaultBranch;
  return {
    kind: 'piece',
    piece: {
      target: given.target,
      defaultBranch: read.defaultBranch,
      issue: null,
      epic,
      progress: branchProgress(read.pulls),
      branch,
      worktree,
      base,
      behind: behindOf(cwd, worktree, branch, base),
      pulls: read.pulls,
    },
  };
};

/** A worktree: as its branch; a detached one through the issue its folder is named after. */
const fromWorktree = (repo: Repo, cwd: string, local: LocalWorktree[], w: LocalWorktree): Resolved => {
  const target: Piece['target'] = { kind: 'worktree', name: path.basename(w.dir) };
  if (w.branch) return fromBranch(repo, cwd, local, w.branch, { target, worktree: w }) as Resolved;
  const n = issueOfFolder(w.dir);
  const read = n ? readItem(repo, n) : null;
  if (read?.item.kind === 'issue')
    return { kind: 'piece', piece: fromIssue(repo, cwd, local, read.item, read.defaultBranch, { target, worktree: w }) };
  const defaultBranch = read?.defaultBranch ?? readDefaultBranch(repo);
  return {
    kind: 'piece',
    piece: {
      target,
      defaultBranch,
      issue: null,
      epic: null,
      progress: 'todo',
      branch: null,
      worktree: w,
      base: defaultBranch,
      behind: behindOf(cwd, w, null, defaultBranch),
      pulls: [],
    },
  };
};

/** A number: an epic, an issue or a pull request. */
const fromNumber = (repo: Repo, cwd: string, local: LocalWorktree[], n: number): Resolved => {
  const { item, defaultBranch } = readItem(repo, n);
  if (item.kind === 'epic') return { kind: 'epic', number: n };
  if (item.kind === 'issue')
    return { kind: 'piece', piece: fromIssue(repo, cwd, local, item, defaultBranch, { target: { kind: 'issue', name: String(n) } }) };
  if (item.kind === 'pull') {
    const target: Piece['target'] = { kind: 'pull', name: String(n) };
    const issue = issueOfPull(item.pr);
    const read = issue ? readItem(repo, issue) : null;
    if (read?.item.kind === 'issue')
      return {
        kind: 'piece',
        piece: fromIssue(repo, cwd, local, read.item, defaultBranch, { target, branch: item.pr.headRefName, pulls: [item.pr] }),
      };
    const branch = fromBranch(repo, cwd, local, item.pr.headRefName, { target });
    if (branch) return branch;
    return {
      kind: 'piece',
      piece: {
        target,
        defaultBranch,
        issue: null,
        epic: null,
        progress: branchProgress([item.pr]),
        branch: item.pr.headRefName,
        worktree: null,
        base: item.pr.baseRefName,
        behind: null,
        pulls: [item.pr],
      },
    };
  }
  throw new Error(`#${n} is neither an issue nor a pull request of ${repo.owner}/${repo.name}`);
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.value('config'));
  const repo = repoOf(args.value('repo'), cwd);
  const number = args.number('epic');
  const notice = configNotice(config);
  // the worktrees only when the folder is a checkout of that repository
  const local = args.value('repo') && !sameRepo(cwd, repo) ? [] : localWorktrees(cwd);
  const epicReport = (n: number, branch?: string) => {
    const { epic, mergeQueue } = readEpic(repo, n, args.value('branch') ?? branch);
    console.info([...notice, report(epic, landingOf(config.config, mergeQueue))].join('\n'));
  };
  const show = (resolved: Resolved) => {
    if (resolved.kind === 'epic') return epicReport(resolved.number, resolved.branch);
    const landing = landingOf(config.config, hasMergeQueue(repo, resolved.piece.defaultBranch));
    console.info([...notice, renderPiece(resolved.piece, landing)].join('\n'));
  };
  if (number) return show(fromNumber(repo, cwd, local, number));
  const words = args.words;
  if (words) {
    const w = local.find((one) => path.basename(one.dir) === words || one.dir === path.resolve(cwd, words));
    const resolved = w
      ? fromWorktree(repo, cwd, local, w)
      : /\s/.test(words)
        ? null
        : fromBranch(repo, cwd, local, words, { target: { kind: 'branch', name: words } });
    if (resolved) return show(resolved);
    notice.push(`No worktree or branch is named \`${words}\`: the overview follows, for the subject.`, '');
  }
  const overview = readOverview(repo);
  console.info(
    [...notice, renderOverview(repo, overview, landingOf(config.config, overview.mergeQueue), local)].join('\n'),
  );
};

/** Whether the current folder is a checkout of the repository. */
const sameRepo = (cwd: string, repo: Repo): boolean => {
  try {
    const here = repoOf(undefined, cwd);
    return here.owner.toLowerCase() === repo.owner.toLowerCase() && here.name.toLowerCase() === repo.name.toLowerCase();
  } catch {
    return false;
  }
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
