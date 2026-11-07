import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULTS, validate } from './lib/config.ts';
import { pr } from './lib/fixtures.ts';
import { landingOf, prState, renderOverview } from './status.ts';

const repo = { owner: 'vitto', name: 'home' };

describe('landingOf', () => {
  it('takes the method of the configuration, else the merge queue GitHub has, else a merge commit', () => {
    assert.equal(landingOf(DEFAULTS, true).method, 'queue');
    assert.equal(landingOf(DEFAULTS, false).method, 'merge');
    assert.equal(landingOf(validate({ merge: { method: 'queue' } }).config, false).method, 'queue');
    assert.deepEqual(
      landingOf(validate({ merge: { blockingWorkflows: ['publish.yml'] } }).config, false).blocking,
      [{ workflow: 'publish.yml' }],
    );
  });
});

describe('prState', () => {
  it('says the queue, what holds a pull request, or ready', () => {
    assert.deepEqual(prState(pr(1, { baseRefName: 'main' })), ['ready']);
    assert.deepEqual(prState(pr(1, { baseRefName: 'main', isInMergeQueue: true })), ['in the merge queue', 'ready']);
    assert.deepEqual(prState(pr(1, { baseRefName: 'main', checks: 'FAILURE', isDraft: true })), ['draft', 'checks red']);
  });
});

describe('renderOverview', () => {
  it('shows the epics, the pull requests, the worktrees and what waits for the person', () => {
    const text = renderOverview(
      repo,
      {
        defaultBranch: 'main',
        mergeQueue: false,
        epics: [{ number: 12, title: 'epic: the site', url: 'https://x/12', parts: { total: 3, completed: 1 }, branches: ['12-site'] }],
        pulls: [
          pr(14, { baseRefName: 'main', headRefName: 'feat/a', url: 'https://x/14', title: 'a | b' }),
          pr(15, { baseRefName: '12-site', headRefName: '13-part', url: 'https://x/15', checks: 'PENDING' }),
        ],
      },
      landingOf(DEFAULTS, false),
      [
        { dir: '/r/home', branch: 'main', here: true, dirty: 0, local: 0 },
        { dir: '/r/home-wt-13', branch: '13-part', here: false, dirty: 2, local: 1 },
        { dir: '/r/home-wt-12-preview', branch: '12-preview', here: false, dirty: 0, local: 4 },
      ],
    );
    assert.match(text, /^## Where `vitto\/home` stands$/m);
    assert.match(text, /^Default branch: `main`, with a merge commit\.$/m);
    assert.match(text, /^\| \[#12\]\(https:\/\/x\/12\) epic: the site \| 1 of 3 \| `12-site` \|$/m);
    assert.match(text, /^\| 1 \| \[#14\]\(https:\/\/x\/14\) a \\\| b \| `feat\/a` \| `main` \| ready \|$/m);
    assert.match(text, /^\| 2 \| .* \| `13-part` \| `12-site` \| checks running \|$/m);
    assert.match(text, /^\| `home` \(here\) \| `main` \| - \| - \| - \|$/m);
    assert.match(text, /^\| `home-wt-13` \| `13-part` \| 2 files \| 1 commit \| \[#15\]\(https:\/\/x\/15\) \|$/m);
    assert.match(text, /^\| `home-wt-12-preview` \| `12-preview` \| - \| the local preview, never pushed \| - \|$/m);
    assert.match(text, /- \[#14\]\(https:\/\/x\/14\) is ready to merge into `main`: it waits for your ok \("ok #14", then `gh pr merge 14 --merge`\)\./);
    assert.match(text, /- `home-wt-13` holds work GitHub has not seen: 2 uncommitted files, 1 commit no remote branch holds\./);
    assert.doesNotMatch(text, /home-wt-12-preview` holds/, 'the preview is local by design');
  });

  it('says when there is nothing to decide', () => {
    const text = renderOverview(repo, { defaultBranch: 'main', mergeQueue: true, epics: [], pulls: [] }, landingOf(DEFAULTS, true), []);
    assert.match(text, /through its merge queue/);
    assert.match(text, /No open epic/);
    assert.match(text, /No open pull request\./);
    assert.match(text, /- Nothing waits for your ok, and no worktree holds work GitHub has not seen\./);
  });
});
