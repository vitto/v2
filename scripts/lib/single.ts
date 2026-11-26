/*
  One piece of work - an issue, a pull request, a branch or a worktree - as the person asked for
  it on 2026-11-24: never a list, the state of that work alone. The agent writes above it what the
  work does and runs /v2:work-map on the same target below it (skills/work-status/SKILL.md).
  Pure functions over what scripts/lib/github.ts and scripts/lib/worktrees.ts read;
  scripts/status.ts resolves the target and prints it.

  How one target leads to the others:

  - a pull request: its issue is the first one its body closes with a keyword (`closes`, the
    form GOVERNANCE.md rule 3 writes), else the number its head branch starts with; its branch is
    its head;
  - a branch: its issue is the number it starts with (`<issue>-<slug>`, the name
    `gh issue develop` gives, rule 3), else the first one its pull request closes; the branch
    linked to an epic is the epic, reported as one, and another branch named after an epic is the
    epic's own work, with no issue of its own;
  - a worktree: its branch, then as a branch. A detached worktree keeps no other trace of its
    issue than its folder name: the number the name ends with (`magma-wt-1427`), when that number
    is an issue of the repository;
  - an issue: its branch is the head of its open pull request, else of its merged one, else its
    first linked branch; its worktree is the one on that branch, else a detached one whose folder
    name ends with its number.

  The state, with the icons of the report of an epic (scripts/lib/epic.ts):

  - a part of an open epic: the state of that part in the report of its epic (`itemsOf`);
  - any other issue: merged when it is closed; pull request open when an open pull request
    belongs to it (`issueItem`); to do otherwise;
  - a branch or a worktree with no issue: pull request open when a pull request from it is open,
    merged when one merged, to do otherwise.
*/
import path from 'node:path';
import {
  ICONS,
  belongsTo,
  closes,
  holds,
  issueItem,
  mergeCommand,
  pullTable,
  type Landing,
  type Part,
  type Progress,
  type PullRequest,
} from './epic.ts';
import { cell, link, plural, ref, rule } from './markdown.ts';

export interface Issue {
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'CLOSED';
}

export interface WorktreeState {
  dir: string;
  branch: string | null;
  /** Uncommitted files. */
  dirty: number;
  /** Commits no remote-tracking branch holds. */
  local: number;
}

/** One piece of work and what stands around it. */
export interface Piece {
  /** What the person pointed at, for the heading when there is no issue. */
  target: { kind: 'issue' | 'pull' | 'branch' | 'worktree'; name: string };
  defaultBranch: string;
  issue: Issue | null;
  /** The epic the issue is a part of, when it is open. */
  epic: { number: number; title: string; url: string; branch: string | null } | null;
  progress: Progress;
  branch: string | null;
  worktree: WorktreeState | null;
  /** Where the work lands: the branch of its epic when it has one, else the default branch. */
  base: string;
  /** Commits of `base` the work misses; null when the work is not on this disk. */
  behind: number | null;
  /** The open and merged pull requests of the work, oldest first. */
  pulls: PullRequest[];
}

const STATE_WORDS: Record<Progress, string> = {
  merged: 'merged',
  open: 'pull request open',
  todo: 'to do',
};

const LEADING = /^(\d+)-/;
const TRAILING = /-(\d+)$/;

/** The issue a branch is named after (`<issue>-<slug>`), or null. */
export const issueOfBranch = (branch: string): number | null => {
  const match = LEADING.exec(branch);
  return match ? Number(match[1]) : null;
};

/** The issue a detached worktree is named after (its folder name ends with `-<issue>`), or null. */
export const issueOfFolder = (dir: string): number | null => {
  const match = TRAILING.exec(path.basename(dir));
  return match ? Number(match[1]) : null;
};

/** The issue of a pull request: the first its body closes, else the number its head starts with. */
export const issueOfPull = (pr: PullRequest): number | null =>
  [...closes(pr.body)][0] ?? issueOfBranch(pr.headRefName);

/** The pull requests of an issue among `prs`: those that belong to it, closed ones left out. */
export const pullsOf = (issue: Part, prs: PullRequest[]): PullRequest[] => {
  const seen = new Set<number>();
  return prs
    .filter((pr) => pr.state !== 'CLOSED' && belongsTo(pr, issue))
    .filter((pr) => !seen.has(pr.number) && !!seen.add(pr.number))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

/** The branch of an issue: its open pull request's, else its merged one's, else its first linked branch. */
export const branchOf = (issue: Part, pulls: PullRequest[]): string | null =>
  pulls.find((pr) => pr.state === 'OPEN')?.headRefName ??
  pulls.find((pr) => pr.state === 'MERGED')?.headRefName ??
  issue.branches[0] ??
  null;

/** The state of an issue outside an open epic (the header says why). */
export const issueProgress = (issue: Part, pulls: PullRequest[]): Progress =>
  issue.state === 'CLOSED' ? 'merged' : issueItem(issue, pulls).progress;

/** The state of a branch with no issue, from its pull requests. */
export const branchProgress = (pulls: PullRequest[]): Progress =>
  pulls.some((pr) => pr.state === 'OPEN') ? 'open' : pulls.some((pr) => pr.state === 'MERGED') ? 'merged' : 'todo';

/** The worktree of a piece of work: the one on its branch, else a detached one named after its issue. */
export const worktreeOf = <W extends WorktreeState>(
  worktrees: W[],
  branch: string | null,
  issue: number | null,
): W | null =>
  (branch ? worktrees.find((w) => w.branch === branch) : undefined) ??
  (issue ? worktrees.find((w) => !w.branch && issueOfFolder(w.dir) === issue) : undefined) ??
  null;

const day = (iso: string | null): string => (iso ?? '').slice(0, 10);

/** The state of a pull request in one cell: merged, in the queue, what holds it, or ready. */
export const pullState = (pr: PullRequest): string => {
  if (pr.state === 'MERGED') return `merged into \`${pr.baseRefName}\` ${day(pr.mergedAt)}`;
  const held = holds(pr, [], pr.baseRefName);
  return [...(pr.isInMergeQueue ? ['in the merge queue'] : []), ...(held.length ? held : ['ready'])].join('; ');
};

/** What the work there holds that GitHub has not seen, in words; empty when nothing. */
const unseen = (w: WorktreeState): string =>
  [w.dirty ? plural(w.dirty, 'uncommitted file') : '', w.local ? `${plural(w.local, 'commit')} no remote branch holds` : '']
    .filter(Boolean)
    .join(', ');

/** The next steps of a piece of work: what a person decides is said as such, never done. */
export const nextOf = (piece: Piece, landing: Landing): string[] => {
  const out: string[] = [];
  const open = piece.pulls.filter((pr) => pr.state === 'OPEN');
  for (const pr of open) {
    const held = holds(pr, [], pr.baseRefName);
    if (pr.isInMergeQueue) out.push(`${link(pr.number, pr.url)} is in the merge queue of \`${pr.baseRefName}\`.`);
    else if (held.length) out.push(`${link(pr.number, pr.url)} waits: ${held.join('; ')}.`);
    else {
      const method = pr.baseRefName === piece.defaultBranch ? landing.method : 'merge';
      out.push(
        `${link(pr.number, pr.url)} is ready to merge into \`${pr.baseRefName}\`: it waits for your ok ("ok #${pr.number}", then \`${mergeCommand(pr.number, method)}\`).`,
      );
    }
  }
  const w = piece.worktree;
  if (w && unseen(w))
    out.push(
      `\`${path.basename(w.dir)}\` holds work GitHub has not seen: ${unseen(w)}${w.branch ? '' : ', on no branch'}.`,
    );
  if (!open.length && piece.progress !== 'merged') {
    if (piece.branch) out.push(`No pull request from \`${piece.branch}\` yet.`);
    else if (piece.issue) {
      const base = piece.epic?.branch ?? piece.defaultBranch;
      out.push(
        `No branch yet: \`gh issue develop ${piece.issue.number} --base ${base}\` links one to the issue (GOVERNANCE.md rule 3).`,
      );
    }
  }
  if (piece.progress === 'merged' && !open.length)
    out.push(piece.issue?.state === 'CLOSED' ? 'Done: the issue is closed.' : 'Done: the work is merged.');
  return out;
};

/** The report of one piece of work, in Markdown. */
export const renderPiece = (piece: Piece, landing: Landing): string => {
  const dot = String.fromCodePoint(0xb7);
  const heading = piece.issue
    ? `### ${ref(piece.issue.number, piece.issue.url)} ${dot} ${cell(piece.issue.title)}`
    : piece.target.kind === 'pull' && piece.pulls[0]
      ? `### ${ref(piece.pulls[0].number, piece.pulls[0].url)} ${dot} ${cell(piece.pulls[0].title)}`
      : `### ${piece.target.kind === 'worktree' ? 'Worktree' : 'Branch'} \`${cell(piece.target.name)}\``;
  const lines = [heading, ''];
  lines.push(`State: ${ICONS[piece.progress]} ${STATE_WORDS[piece.progress]}.`);
  if (piece.epic) lines.push(`Epic: ${ref(piece.epic.number, piece.epic.url)} ${dot} ${cell(piece.epic.title)}.`);
  // how far behind, only for work still to land
  const behind =
    piece.behind && piece.progress !== 'merged' ? `, ${piece.behind} commits behind \`${piece.base}\`` : '';
  lines.push(piece.branch ? `Branch: \`${piece.branch}\`${behind}.` : 'Branch: none.');
  const w = piece.worktree;
  if (!w) lines.push('Worktree: none on this disk.');
  else {
    const where = w.branch ? '' : piece.branch ? ' (detached, not on the branch)' : ` (detached${behind})`;
    lines.push(`Worktree: \`${path.basename(w.dir)}\`${where}${unseen(w) ? `: ${unseen(w)}` : ', nothing GitHub has not seen'}.`);
  }
  lines.push(...rule(), '**Pull requests**', '');
  if (!piece.pulls.length) lines.push('None.');
  else lines.push(...pullTable(piece.pulls, pullState));
  const next = nextOf(piece, landing);
  lines.push(...rule(), '**Next action**', '', ...(next.length ? next : ['Nothing waits.']).map((line) => `- ${line}`));
  return lines.join('\n');
};
