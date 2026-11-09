/*
  Where the work stands, as Markdown tables. The skill /v2:status shows what this prints.

    node scripts/status.ts <epic number> [--branch=<branch of the epic>] [--repo=<owner/name>] [--config=<file>]
        the epic: its parts in the order they land, their pull requests, where each lands, its
        checks, the open parts that change the same files, how far the branch of the epic is from
        the default branch, then the next action (scripts/lib/epic.ts says where each answer
        comes from)
    node scripts/status.ts [--repo=<owner/name>] [--config=<file>]
        the repository: its open epics, its open pull requests and what holds each, the local
        worktrees and the work in them GitHub has not seen, then the next action

  Where each answer comes from:

  - GitHub: scripts/lib/github.ts, through `gh`, as the person running it sees it; the
    repository is `--repo`, else the one gh reads from the remotes of the current folder;
  - the local worktrees (the overview only): scripts/lib/worktrees.ts, git in the current folder;
  - how a pull request into the default branch merges: `merge.method` of .claude/v2.json, else
    the merge queue of the default branch when GitHub has one, else a merge commit; the workflows
    that hold it: `merge.blockingWorkflows` (scripts/lib/config.ts).

  It only reads. "ready" means the person can decide, never that a merge may happen
  (GOVERNANCE.md rule 1).
*/
import path from 'node:path';
import { isMain, parseArgs } from './lib/args.ts';
import { configNotice, loadConfig, type Config } from './lib/config.ts';
import { holds, mergeCommand, report, type Landing, type PullRequest } from './lib/epic.ts';
import { readEpic, readOverview, type Overview } from './lib/github.ts';
import { cell, link, plural, short, table } from './lib/markdown.ts';
import { repoOf, rootOf, type Repo } from './lib/run.ts';
import { onlyHere, uncommitted, worktreesOf } from './lib/worktrees.ts';

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
    '**Open epics**',
    '',
  );
  if (!overview.epics.length)
    lines.push('No open epic (an issue with sub-issues, GOVERNANCE.md rule 2).');
  else
    lines.push(
      ...table(
        ['Epic', 'Parts done', 'Branch'],
        overview.epics.map((epic) => [
          `${link(epic.number, epic.url)} ${cell(short(epic.title))}`,
          `${epic.parts.completed} of ${epic.parts.total}`,
          epic.branches.length ? epic.branches.map((b) => `\`${cell(b)}\``).join('<br>') : 'none linked',
        ]),
      ),
    );

  lines.push('', '**Open pull requests**', '');
  if (!overview.pulls.length) lines.push('No open pull request.');
  else
    lines.push(
      ...table(
        ['#', 'Pull request', 'From', 'Into', 'State'],
        overview.pulls.map((pr, i) => [
          String(i + 1),
          `${link(pr.number, pr.url)} ${cell(short(pr.title))}`,
          `\`${cell(pr.headRefName)}\``,
          `\`${cell(pr.baseRefName)}\``,
          cell(prState(pr).join('; ')),
        ]),
      ),
    );

  const pullOf = new Map(overview.pulls.map((pr) => [pr.headRefName, pr]));
  if (worktrees.length) {
    lines.push('', '**Local worktrees**', '');
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
            pr ? link(pr.number, pr.url) : '-',
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
  lines.push('', '**Next action**', '', ...next.map((line) => `- ${line}`));
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

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const config = loadConfig(cwd, args.value('config'));
  const repo = repoOf(args.value('repo'), cwd);
  const number = args.number('epic');
  const notice = configNotice(config);
  if (number) {
    const { epic, mergeQueue } = readEpic(repo, number, args.value('branch'));
    console.info([...notice, report(epic, landingOf(config.config, mergeQueue))].join('\n'));
    return;
  }
  const overview = readOverview(repo);
  // the worktrees only when the folder is a checkout of that repository
  const local = args.value('repo') && !sameRepo(cwd, repo) ? [] : localWorktrees(cwd);
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
