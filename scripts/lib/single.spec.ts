import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseArgs } from './args.ts';
import { ICONS } from './epic.ts';
import { URL, part, pr } from './fixtures.ts';
import {
  branchOf,
  branchProgress,
  issueOfBranch,
  issueOfFolder,
  issueOfPull,
  issueProgress,
  pullState,
  pullsOf,
  renderPiece,
  worktreeOf,
  type Piece,
} from './single.ts';

const DOT = String.fromCodePoint(0xb7);
const landing = { method: 'merge' as const, blocking: [] };
const merged = (n: number, over = {}) => pr(n, { state: 'MERGED', mergedAt: '2026-11-02T00:00:00Z', ...over });

const piece = (over: Partial<Piece> = {}): Piece => ({
  target: { kind: 'issue', name: '30' },
  defaultBranch: 'main',
  issue: { number: 30, title: 'the work', url: `${URL}/issues/30`, state: 'OPEN' },
  epic: null,
  progress: 'todo',
  branch: null,
  worktree: null,
  base: 'main',
  behind: null,
  pulls: [],
  ...over,
});

describe('parseArgs words', () => {
  it('keeps the words apart from the number and the options', () => {
    const args = parseArgs(['lavorazioni', 'di', 'studio', '--repo=o/r']);
    assert.equal(args.words, 'lavorazioni di studio');
    assert.equal(args.number(), null);
    assert.equal(parseArgs(['#12', 'magma-wt-12']).words, 'magma-wt-12');
    assert.equal(parseArgs(['12']).words, '');
  });
});

describe('how a target leads to its issue', () => {
  it('reads the issue a branch starts with, and nothing else', () => {
    assert.equal(issueOfBranch('1427-washes'), 1427);
    assert.equal(issueOfBranch('fix-1427'), null);
    assert.equal(issueOfBranch('main'), null);
  });

  it('reads the issue a folder name ends with', () => {
    assert.equal(issueOfFolder('/r/magma-wt-1427'), 1427);
    assert.equal(issueOfFolder('/r/magma-wt-studio-band-track'), null);
    assert.equal(issueOfFolder('/r/1427-x'), null);
  });

  it('takes the issue a pull request closes, else the number of its head', () => {
    assert.equal(issueOfPull(pr(5, { body: 'Closes #30, closes #31', headRefName: '40-x' })), 30);
    assert.equal(issueOfPull(pr(5, { body: 'Refs #30', headRefName: '40-x' })), 40);
    assert.equal(issueOfPull(pr(5, { headRefName: 'tidy' })), null);
  });
});

describe('the pull requests, branch and state of an issue', () => {
  const issue = part(30, { branches: ['30-linked'] });

  it('keeps the pull requests that belong to it, once each, oldest first, the closed ones out', () => {
    const prs = [
      pr(7, { headRefName: '30-b', createdAt: '2026-11-03T00:00:00Z' }),
      merged(5, { headRefName: '30-a', createdAt: '2026-11-01T00:00:00Z' }),
      pr(7, { headRefName: '30-b', createdAt: '2026-11-03T00:00:00Z' }),
      pr(8, { headRefName: '30-c', state: 'CLOSED' }),
      pr(9, { headRefName: 'other', body: 'Refs #30' }),
    ];
    assert.deepEqual(
      pullsOf(issue, prs).map((one) => one.number),
      [5, 7],
    );
  });

  it('takes the branch of the open pull request, else of the merged one, else the linked branch', () => {
    assert.equal(branchOf(issue, [merged(5, { headRefName: '30-a' }), pr(7, { headRefName: '30-b' })]), '30-b');
    assert.equal(branchOf(issue, [merged(5, { headRefName: '30-a' })]), '30-a');
    assert.equal(branchOf(issue, []), '30-linked');
    assert.equal(branchOf(part(31), []), null);
  });

  it('is merged when closed, open with an open pull request, to do otherwise', () => {
    assert.equal(issueProgress(part(30, { state: 'CLOSED' }), []), 'merged');
    assert.equal(issueProgress(issue, [pr(7, { headRefName: '30-b' })]), 'open');
    assert.equal(issueProgress(issue, [merged(5, { headRefName: '30-a' })]), 'todo');
  });

  it('reads the state of a branch with no issue from its pull requests', () => {
    assert.equal(branchProgress([pr(1)]), 'open');
    assert.equal(branchProgress([merged(1)]), 'merged');
    assert.equal(branchProgress([]), 'todo');
  });
});

describe('worktreeOf', () => {
  const trees = [
    { dir: '/r/magma', branch: 'main', dirty: 0, local: 0 },
    { dir: '/r/magma-wt-30', branch: null, dirty: 3, local: 1 },
    { dir: '/r/magma-wt-b', branch: '30-b', dirty: 0, local: 0 },
  ];

  it('takes the worktree on the branch, else a detached one named after the issue', () => {
    assert.equal(worktreeOf(trees, '30-b', 30)?.dir, '/r/magma-wt-b');
    assert.equal(worktreeOf(trees, null, 30)?.dir, '/r/magma-wt-30');
    assert.equal(worktreeOf(trees, '30-x', 31), null);
  });
});

describe('pullState', () => {
  it('says merged with its day, what holds an open one, or ready', () => {
    assert.equal(pullState(merged(5, { baseRefName: '10-epic' })), 'merged into `10-epic` 2026-11-02');
    assert.equal(pullState(pr(5)), 'ready');
    assert.equal(pullState(pr(5, { checks: 'FAILURE' })), 'checks red');
  });
});

describe('renderPiece', () => {
  it('writes the issue, its state, its epic, its branch, its worktree, its pull requests and the next action', () => {
    const text = renderPiece(
      piece({
        epic: { number: 10, title: 'epic: the work', url: `${URL}/issues/10`, branch: '10-epic' },
        progress: 'open',
        branch: '30-b',
        base: '10-epic',
        behind: 4,
        worktree: { dir: '/r/magma-wt-b', branch: '30-b', dirty: 2, local: 0 },
        pulls: [pr(7, { headRefName: '30-b', title: 'a | b' })],
      }),
      landing,
    );
    const lines = text.split('\n');
    assert.equal(lines[0], `### [30](${URL}/issues/30) ${DOT} the work`);
    assert.ok(lines.includes(`State: ${ICONS.open} pull request open.`));
    assert.ok(lines.includes(`Epic: [10](${URL}/issues/10) ${DOT} epic: the work.`));
    assert.ok(lines.includes('Branch: `30-b`, 4 commits behind `10-epic`.'));
    assert.ok(lines.includes('Worktree: `magma-wt-b`: 2 uncommitted files.'));
    assert.ok(lines.includes(`| [7](${URL}/pull/7) | a \\| b | \`30-b\` | \`10-epic\` | ready |`));
    assert.ok(lines.includes(`- [#7](${URL}/pull/7) is ready to merge into \`10-epic\`: it waits for your ok ("ok #7", then \`gh pr merge 7 --merge\`).`));
    assert.ok(lines.includes('- `magma-wt-b` holds work GitHub has not seen: 2 uncommitted files.'));
  });

  it('says a detached worktree holds work on no branch, and how to link a branch to the issue', () => {
    const text = renderPiece(
      piece({
        target: { kind: 'worktree', name: 'magma-wt-30' },
        behind: 104,
        worktree: { dir: '/r/magma-wt-30', branch: null, dirty: 28, local: 1 },
      }),
      landing,
    );
    const lines = text.split('\n');
    assert.ok(lines.includes('Branch: none.'));
    assert.ok(lines.includes('Worktree: `magma-wt-30` (detached, 104 commits behind `main`): 28 uncommitted files, 1 commit no remote branch holds.'));
    assert.ok(lines.includes('None.'));
    assert.ok(lines.includes('- `magma-wt-30` holds work GitHub has not seen: 28 uncommitted files, 1 commit no remote branch holds, on no branch.'));
    assert.ok(lines.includes('- No branch yet: `gh issue develop 30 --base main` links one to the issue (GOVERNANCE.md rule 3).'));
  });

  it('bases the branch of a part on the branch of its epic, and says when a branch has no pull request', () => {
    const part = renderPiece(piece({ epic: { number: 10, title: 'e', url: `${URL}/issues/10`, branch: '10-epic' } }), landing);
    assert.match(part, /gh issue develop 30 --base 10-epic/);
    const branch = renderPiece(piece({ branch: '30-b' }), landing);
    assert.match(branch, /^- No pull request from `30-b` yet\.$/m);
    assert.match(branch, /^Worktree: none on this disk\.$/m);
  });

  it('names a branch or a worktree with no issue, and a pull request with none', () => {
    const lone = renderPiece(piece({ issue: null, target: { kind: 'worktree', name: 'wt-x' }, branch: 'x' }), landing);
    assert.match(lone, /^### Worktree `wt-x`$/m);
    const branch = renderPiece(piece({ issue: null, target: { kind: 'branch', name: 'x' }, branch: 'x' }), landing);
    assert.match(branch, /^### Branch `x`$/m);
    const pull = renderPiece(
      piece({ issue: null, target: { kind: 'pull', name: '7' }, branch: 'x', progress: 'open', pulls: [pr(7, { title: 'tidy' })] }),
      landing,
    );
    assert.equal(pull.split('\n')[0], `### [7](${URL}/pull/7) ${DOT} tidy`);
  });

  it('says the work is done, without how far behind it is, once merged or closed', () => {
    const closed = renderPiece(
      piece({
        issue: { number: 30, title: 'the work', url: `${URL}/issues/30`, state: 'CLOSED' },
        progress: 'merged',
        branch: '30-b',
        behind: 13,
        pulls: [merged(7, { headRefName: '30-b', baseRefName: 'main' })],
      }),
      landing,
    );
    assert.match(closed, /^State: .+ merged\.$/mu);
    assert.match(closed, /^Branch: `30-b`\.$/m);
    assert.match(closed, /^- Done: the issue is closed\.$/m);
    assert.match(closed, /\| merged into `main` 2026-11-02 \|/);
  });
});
