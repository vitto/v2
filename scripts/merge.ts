/*
  The merge of one pull request a person approved: what holds it, as a table, and, with the
  approval, the merge itself. The only script of v2 that changes GitHub. The skill /v2:merge
  runs it.

    node scripts/merge.ts <pull request> [--repo=<owner/name>] [--config=<file>]
        check only: print what holds the merge, and the command that would carry it out
    node scripts/merge.ts <pull request> --approved="<the person's words>" [--repo=...] [--config=...]
        check again, then merge, only when the words name this pull request (`#<number>`) and
        nothing holds it; print what GitHub says after

  GOVERNANCE.md rule 1: every merge is a person's decision, given in the conversation by naming
  the pull request ("ok #1302"); it covers that merge only. The command is always one of
  `gh pr merge <n> --merge --match-head-commit <sha>` (a merge commit) or
  `gh pr merge <n> --match-head-commit <sha>` (the merge queue of the base), so the commit merged
  is the one whose checks were seen green. Never `--auto`, `--admin`, `--squash` or `--rebase`.

  Where each answer comes from (scripts/lib/github.ts, through `gh`):

  - the pull request: its state, draft, base and head, head commit, checks (the rollup of its
    last commit; none reported is not green), `mergeable`, `mergeStateStatus` (the rules of the
    base: BLOCKED, BEHIND), `reviewDecision`, whether it is in a merge queue; GitHub computes
    `mergeable` when asked, so an UNKNOWN is read again, up to 4 times 2 seconds apart;
  - the repository: its default branch, whether it takes merge commits (`mergeCommitAllowed`),
    whether the base has a merge queue (`mergeQueue(branch:)`);
  - the method: the merge queue when the base has one (GitHub requires it); else a merge commit;
    `merge.method` of .claude/v2.json set to `queue` for a base with no queue holds the merge;
  - a part of an epic (a base other than the default branch): how far the base is behind the
    default branch (the compare API); rule 2 syncs it first;
  - the workflows that hold a merge into the default branch: `merge.blockingWorkflows` of
    .claude/v2.json, and their runs not finished (`gh run list`: queued, waiting for an approval,
    in progress).
*/
import { isMain, parseArgs } from './lib/args.ts';
import { configNotice, loadConfig, type Config, type MergeMethod } from './lib/config.ts';
import { checksText } from './lib/epic.ts';
import { readMergeFacts, unfinishedRuns, type MergeFacts, type Run } from './lib/github.ts';
import { cell, link, plural, table } from './lib/markdown.ts';
import { gh, repoOf, type Repo } from './lib/run.ts';

const sleep = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

const FORBIDDEN =['--auto', '--admin', '--squash', '--rebase', '-s', '-r', '--disable-auto'];

/** The arguments of `gh` that merge a pull request: one of two forms, nothing else. */
export const mergeArgs = (repo: Repo, n: number, method: MergeMethod, sha: string): string[] => {
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`not a commit id: ${sha}`);
  const args = ['pr', 'merge', String(n), '-R', `${repo.owner}/${repo.name}`];
  if (method === 'merge') args.push('--merge');
  args.push('--match-head-commit', sha);
  if (args.some((arg) => FORBIDDEN.includes(arg))) throw new Error('a forbidden flag');
  return args;
};

/** Whether the person's words name this pull request: `#<n>`, or the number on its own. */
export const names = (words: string, n: number): boolean =>
  new RegExp(`(^|[^\\w#])#?${n}(?![\\w])`).test(words) &&
  // another number named too is not an approval of this one alone
  [...words.matchAll(/#?(\d+)/g)].every((match) => Number(match[1]) === n);

export interface Check {
  what: string;
  state: string;
  holds: boolean;
}

/** The method a pull request merges with, and what of the configuration holds it. */
export const methodOf = (
  facts: Pick<MergeFacts, 'baseQueue' | 'defaultBranch'> & { base: string },
  config: Config,
): { method: MergeMethod; problem?: string } => {
  if (facts.baseQueue) return { method: 'queue' };
  if (facts.base === facts.defaultBranch && config.merge.method === 'queue')
    return {
      method: 'queue',
      problem: `.claude/v2.json asks for the merge queue, and \`${facts.base}\` has none on GitHub`,
    };
  return { method: 'merge' };
};

/** Every check of the merge, in the order a person reads them. */
export const checksOf = (facts: MergeFacts, config: Config, runs: Run[]): Check[] => {
  const { pr } = facts;
  const out: Check[] = [];
  const toDefault = pr.baseRefName === facts.defaultBranch;
  out.push({
    what: 'Pull request',
    state:
      pr.state === 'OPEN'
        ? `open, \`${pr.headRefName}\` into \`${pr.baseRefName}\``
        : pr.state === 'MERGED'
          ? `merged already, into \`${pr.baseRefName}\``
          : 'closed without a merge',
    holds: pr.state !== 'OPEN',
  });
  if (pr.state !== 'OPEN') return out;
  if (pr.headRefName === facts.defaultBranch && !pr.isCrossRepository)
    out.push({
      what: 'Head',
      state: `\`${pr.headRefName}\` is the default branch: a pull request from it is never merged`,
      holds: true,
    });
  out.push({ what: 'Draft', state: pr.isDraft ? 'yes' : 'no', holds: pr.isDraft });
  out.push({ what: 'Checks', state: checksText(pr.checks), holds: pr.checks !== 'SUCCESS' });
  out.push({
    what: 'Conflicts',
    state:
      pr.mergeable === 'CONFLICTING'
        ? `conflicts with \`${pr.baseRefName}\``
        : pr.mergeable === 'UNKNOWN'
          ? 'not computed yet by GitHub: run again in a moment'
          : 'none',
    holds: pr.mergeable !== 'MERGEABLE',
  });
  out.push({
    what: 'Review',
    state:
      pr.reviewDecision === 'APPROVED'
        ? 'approved'
        : pr.reviewDecision === 'CHANGES_REQUESTED'
          ? 'changes requested'
          : pr.reviewDecision === 'REVIEW_REQUIRED'
            ? 'a review is required'
            : 'none required',
    holds: pr.reviewDecision === 'CHANGES_REQUESTED' || pr.reviewDecision === 'REVIEW_REQUIRED',
  });
  out.push({
    what: 'Rules of the base',
    state:
      pr.mergeStateStatus === 'BLOCKED'
        ? `blocked by the rules of \`${pr.baseRefName}\``
        : pr.mergeStateStatus === 'BEHIND'
          ? `behind \`${pr.baseRefName}\`, which the rules ask to be up to date`
          : 'met',
    holds: pr.mergeStateStatus === 'BLOCKED' || pr.mergeStateStatus === 'BEHIND',
  });
  if (pr.isInMergeQueue) out.push({ what: 'Merge queue', state: 'in it already', holds: true });
  if (!toDefault) {
    const behind = facts.baseDistance?.behind ?? 0;
    out.push({
      what: 'Branch of the epic',
      state: facts.baseDistance
        ? behind
          ? `\`${pr.baseRefName}\` is ${plural(behind, 'commit')} behind \`${facts.defaultBranch}\`: sync it first (rule 2)`
          : `\`${pr.baseRefName}\` holds all of \`${facts.defaultBranch}\``
        : `\`${pr.baseRefName}\` is not on GitHub`,
      holds: !facts.baseDistance || behind > 0,
    });
  }
  const { method, problem } = methodOf({ ...facts, base: pr.baseRefName }, config);
  out.push({
    what: 'Method',
    state:
      problem ??
      (method === 'queue'
        ? `the merge queue of \`${pr.baseRefName}\``
        : facts.mergeCommitAllowed
          ? 'a merge commit'
          : 'a merge commit, which the repository does not allow: squash and rebase are never used (rule 1)'),
    holds: !!problem || (method === 'merge' && !facts.mergeCommitAllowed),
  });
  if (toDefault && config.merge.blockingWorkflows.length)
    out.push({
      what: 'Blocking workflows',
      state: runs.length
        ? runs.map((run) => `\`${run.workflow}\` ${run.status.replace(/_/g, ' ')}: ${run.url}`).join('<br>')
        : `none running (${config.merge.blockingWorkflows.map((w) => `\`${w.workflow}\``).join(', ')})`,
      holds: runs.length > 0,
    });
  return out;
};

/** The report: the checks as a table, then what happens next. */
export const renderMerge = (
  facts: MergeFacts,
  checks: Check[],
  command: string,
  outcome: string[],
): string => {
  const { pr } = facts;
  const held = checks.filter((check) => check.holds);
  return [
    `## Merge of ${link(pr.number, pr.url)}: ${cell(pr.title)}`,
    '',
    ...table(
      ['Check', 'State', 'Result'],
      checks.map((check) => [check.what, cell(check.state), check.holds ? '**holds**' : 'ok']),
    ),
    '',
    '**Next action**',
    '',
    ...(outcome.length
      ? outcome
      : held.length
        ? [`- It waits: ${held.map((check) => check.what.toLowerCase()).join(', ')}. Nothing was merged.`]
        : [
            `- Ready: it waits for your ok, naming it ("ok #${pr.number}"). Then: \`${command}\`.`,
          ]),
  ].join('\n');
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const n = args.number('pr');
  if (!n) {
    console.error(
      'usage: node scripts/merge.ts <pull request> [--approved="<the person\'s words>"] [--repo=<owner/name>] [--config=<file>]',
    );
    process.exitCode = 2;
    return;
  }
  const cwd = process.cwd();
  const read = loadConfig(cwd, args.value('config'));
  const repo = repoOf(args.value('repo'), cwd);
  const approved = args.value('approved');

  // GitHub computes `mergeable` when asked: UNKNOWN on the first read is common
  let facts = readMergeFacts(repo, n);
  for (let i = 0; i < 4 && facts.pr.state === 'OPEN' && facts.pr.mergeable === 'UNKNOWN'; i++) {
    sleep(2000);
    facts = readMergeFacts(repo, n);
  }
  const toDefault = facts.pr.baseRefName === facts.defaultBranch;
  const runs = toDefault ? unfinishedRuns(repo, read.config.merge.blockingWorkflows) : [];
  const checks = checksOf(facts, read.config, runs);
  const { method } = methodOf({ ...facts, base: facts.pr.baseRefName }, read.config);
  const argv = mergeArgs(repo, n, method, facts.pr.headRefOid);
  const command = `gh ${argv.join(' ')}`;
  const outcome: string[] = [];

  if (approved !== undefined) {
    if (!names(approved, n)) {
      outcome.push(
        `- Not merged: the approval "${cell(approved)}" does not name #${n} alone. Every merge needs the person's ok naming it (rule 1).`,
      );
      process.exitCode = 1;
    } else if (checks.some((check) => check.holds)) {
      outcome.push(
        `- Not merged, though approved ("${cell(approved)}"): ${checks
          .filter((check) => check.holds)
          .map((check) => check.what.toLowerCase())
          .join(', ')} hold it. Show the person this table.`,
      );
      process.exitCode = 1;
    } else {
      gh(argv, cwd);
      const after = readMergeFacts(repo, n).pr;
      outcome.push(
        `- Approved ("${cell(approved)}") and carried out: \`${command}\`.`,
        after.state === 'MERGED'
          ? `- GitHub says: merged into \`${after.baseRefName}\`.`
          : after.isInMergeQueue
            ? `- GitHub says: in the merge queue of \`${after.baseRefName}\`; it merges once the queue's checks pass.`
            : `- GitHub says: ${after.state.toLowerCase()}, not merged yet. Run the check again.`,
      );
    }
  }
  console.info([...configNotice(read), renderMerge(facts, checks, command, outcome)].join('\n'));
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
