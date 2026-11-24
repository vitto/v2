import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULTS, validate } from './lib/config.ts';
import { epic, part, pr } from './lib/fixtures.ts';
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
  const pr15 = pr(15, { baseRefName: '12-site', headRefName: '13-part', url: 'https://x/15', checks: 'PENDING' });

  it('shows the legend once, each epic as a summary, the issues outside an epic, the pull requests, the worktrees and what waits for the person', () => {
    const text = renderOverview(
      repo,
      {
        defaultBranch: 'main',
        mergeQueue: false,
        epics: [
          epic({
            number: 12,
            title: 'epic: the site',
            url: 'https://x/12',
            branch: '12-site',
            linkedBranches: ['12-site'],
            parts: [
              part(13, { url: 'https://x/13' }),
              part(16, {
                mentions: [pr(17, { headRefName: '16-b', baseRefName: '12-site', state: 'MERGED', mergedAt: '2026-11-02T00:00:00Z' })],
              }),
            ],
            intoBranch: [pr15],
          }),
        ],
        issues: [
          { ...part(20, { url: 'https://x/20', title: 'a | bug' }), labels: ['bug', 'prg-site'] },
          { ...part(21, { url: 'https://x/21', branches: ['21-c'] }), labels: [] },
        ],
        unread: 0,
        pulls: [pr(14, { baseRefName: 'main', headRefName: '20-fix', url: 'https://x/14', title: 'a | b' }), pr15],
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
    assert.equal(text.match(/^\u2705 merged \u00b7 \u{1f500} pull request open \u00b7 \u2b1c to do$/gmu)?.length, 1);
    assert.match(text, /^### \[12\]\(https:\/\/x\/12\) \u00b7 epic: the site$/m);
    assert.match(text, /^Parts: \u2705 1 \u00b7 \u{1f500} 1 \u00b7 \u2b1c 0$/mu);
    assert.match(text, /^\| \[13\]\(https:\/\/x\/13\) \| part 13 \| \u{1f500} \| `13-part` \|$/mu);
    assert.doesNotMatch(text, /\[16\]/, 'a merged part is in the count only');
    assert.match(text, /^### Open issues outside an epic\n\n\| # \| What matters \| State \| Branch \| Labels \|$/m);
    assert.match(text, /^\| \[20\]\(https:\/\/x\/20\) \| a \\\| bug \| \u{1f500} \| `20-fix` \| bug, prg-site \|$/mu);
    assert.match(text, /^\| \[21\]\(https:\/\/x\/21\) \| part 21 \| \u2b1c \| `21-c` \| - \|$/mu);
    assert.match(text, /^\| # \| What matters \| From \| Into \| State \|$/m);
    assert.match(text, /^\| \[14\]\(https:\/\/x\/14\) \| a \\\| b \| `20-fix` \| `main` \| ready \|$/m);
    assert.match(text, /^\| \[15\]\(https:\/\/x\/15\) \| .* \| `13-part` \| `12-site` \| checks running \|$/m);
    assert.match(text, /^\| `home` \(here\) \| `main` \| - \| - \| - \|$/m);
    assert.match(text, /^\| `home-wt-13` \| `13-part` \| 2 files \| 1 commit \| \[15\]\(https:\/\/x\/15\) \|$/m);
    assert.match(text, /^\| `home-wt-12-preview` \| `12-preview` \| - \| the local preview, never pushed \| - \|$/m);
    assert.doesNotMatch(text, /^\| \[#/m, 'a number in a first column is a bare number');
    assert.match(text, /- \[#14\]\(https:\/\/x\/14\) is ready to merge into `main`: it waits for your ok \("ok #14", then `gh pr merge 14 --merge`\)\./);
    assert.match(text, /- `home-wt-13` holds work GitHub has not seen: 2 uncommitted files, 1 commit no remote branch holds\./);
    assert.doesNotMatch(text, /home-wt-12-preview` holds/, 'the preview is local by design');
  });

  it('says when there is nothing to decide', () => {
    const text = renderOverview(
      repo,
      { defaultBranch: 'main', mergeQueue: true, epics: [], issues: [], unread: 0, pulls: [] },
      landingOf(DEFAULTS, true),
      [],
    );
    assert.match(text, /through its merge queue/);
    assert.match(text, /No open epic/);
    assert.match(text, /No open issue outside an epic\./);
    assert.match(text, /No open pull request\./);
    assert.match(text, /- Nothing waits for your ok, and no worktree holds work GitHub has not seen\./);
  });

  it('says how many open issues it did not read', () => {
    const text = renderOverview(
      repo,
      { defaultBranch: 'main', mergeQueue: true, epics: [], issues: [], unread: 20, pulls: [] },
      landingOf(DEFAULTS, true),
      [],
    );
    assert.match(text, /^20 more open issues not read: the first 100 only\.$/m);
  });
});
