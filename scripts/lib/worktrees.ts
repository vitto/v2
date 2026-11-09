/*
  The local side of the work: the worktrees of a repository, what each holds that GitHub has not
  seen, and which copy of a branch (local or origin) is the newest. Only git, only reads.

  Where each answer comes from:

  - the worktrees: `git worktree list --porcelain` (the main one first; a folder deleted by hand,
    "prunable", is left out);
  - the uncommitted changes of a folder: `git status --porcelain`, without the node_modules links
    a worktree may carry (untracked, never work);
  - the commits only on this disk: `git rev-list <branch> --not --remotes`, the commits of the
    branch no remote-tracking branch holds (as of the last fetch);
  - local or origin: the commits each copy has that the other has not (`git rev-list --count`).
*/
import { git } from './run.ts';

/** Whether a line of `git status --porcelain` is a node_modules link a worktree carries. */
export const isModulesLink = (line: string): boolean =>
  /^\?\? (.*\/)?node_modules\/?$/.test(line.trimEnd());

/** The uncommitted changes of a folder, as `git status --porcelain` lines. */
export const uncommitted = (dir: string): string[] =>
  (git(dir, ['status', '--porcelain', '--untracked-files=normal'], true) ?? '')
    .split('\n')
    .filter((line) => line && !isModulesLink(line));

export interface Worktree {
  dir: string;
  /** The branch checked out, or null on a detached HEAD. */
  branch: string | null;
  head: string;
  main: boolean;
}

/** Parses `git worktree list --porcelain`. */
export const parseWorktrees = (porcelain: string): Worktree[] => {
  const out: Worktree[] = [];
  let current: (Worktree & { prunable: boolean; bare: boolean }) | null = null;
  const flush = () => {
    if (current && !current.prunable && !current.bare)
      out.push({ dir: current.dir, branch: current.branch, head: current.head, main: current.main });
  };
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('worktree ')) {
      flush();
      current = {
        dir: line.slice('worktree '.length),
        branch: null,
        head: '',
        main: current === null && out.length === 0,
        prunable: false,
        bare: false,
      };
    } else if (!current) continue;
    else if (line.startsWith('HEAD ')) current.head = line.slice(5);
    else if (line.startsWith('branch refs/heads/')) current.branch = line.slice('branch refs/heads/'.length);
    else if (line.startsWith('prunable')) current.prunable = true;
    else if (line === 'bare') current.bare = true;
  }
  flush();
  return out;
};

/** The worktrees of the repository a folder belongs to; the main one first. */
export const worktreesOf = (cwd: string): Worktree[] =>
  parseWorktrees(git(cwd, ['worktree', 'list', '--porcelain'], true) ?? '');

/** The worktrees by the branch each has checked out, and the main worktree. */
export const byBranch = (cwd: string): { main: string; byBranch: Map<string, string> } => {
  const list = worktreesOf(cwd);
  return {
    main: list[0]?.dir ?? cwd,
    byBranch: new Map(
      list.filter((w) => w.branch).map((w) => [w.branch as string, w.dir] as [string, string]),
    ),
  };
};

/** The commits of a ref no remote-tracking branch holds: the work only on this disk. */
export const onlyHere = (cwd: string, ref: string): number =>
  Number(git(cwd, ['rev-list', '--count', ref, '--not', '--remotes'], true) ?? 0);

export type Copy = 'local' | 'origin' | 'missing';

/** Which copy of a branch to take, from what each side has that the other has not. */
export const chooseCopy = (state: {
  local: boolean;
  remote: boolean;
  ahead: number;
  behind: number;
}): { copy: Copy; notPushed: number | 'never'; diverged: boolean } => {
  if (!state.local)
    return { copy: state.remote ? 'origin' : 'missing', notPushed: 0, diverged: false };
  if (!state.remote) return { copy: 'local', notPushed: 'never', diverged: false };
  if (state.ahead > 0) return { copy: 'local', notPushed: state.ahead, diverged: state.behind > 0 };
  return { copy: 'origin', notPushed: 0, diverged: false };
};

const count = (cwd: string, range: string): number =>
  Number(git(cwd, ['rev-list', '--count', range], true) ?? 0);

export const exists = (cwd: string, ref: string): boolean =>
  git(cwd, ['rev-parse', '--verify', '--quiet', ref], true) !== null;

/** The copy of a branch to take and how it stands against origin. */
export const resolveCopy = (cwd: string, branch: string) => {
  const local = exists(cwd, `refs/heads/${branch}`);
  const remote = exists(cwd, `refs/remotes/origin/${branch}`);
  const ahead = local && remote ? count(cwd, `origin/${branch}..${branch}`) : 0;
  const behind = local && remote ? count(cwd, `${branch}..origin/${branch}`) : 0;
  const choice = chooseCopy({ local, remote, ahead, behind });
  const ref =
    choice.copy === 'local' ? branch : choice.copy === 'origin' ? `origin/${branch}` : null;
  return { ...choice, ref };
};
