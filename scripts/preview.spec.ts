import assert from 'node:assert/strict';
import { realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { DEFAULTS, validate } from './lib/config.ts';
import { epic, part, pr } from './lib/fixtures.ts';
import { repository, sh, tempDir } from './lib/testing.ts';
import { uncommitted } from './lib/worktrees.ts';
import { entriesOf, previewDir, rebuild, renderPreview, seeIt, type Entry } from './preview.ts';

const temp = realpathSync(tempDir('preview'));

/** A repository with a base branch `epic` and part branches made of one commit each. */
const withParts = (name: string) => {
  const { repo, commit } = repository(temp, name, 'epic');
  commit('epic', 'shared.txt', 'base\n');
  for (const [branch, file, text] of [
    ['20-a', 'a.txt', 'a\n'],
    ['21-b', 'shared.txt', 'from b\n'],
    ['22-c', 'shared.txt', 'from c\n'],
  ]) {
    sh(repo, 'branch', branch, 'epic');
    commit(branch, file, text);
  }
  sh(repo, 'checkout', '--quiet', 'epic');
  return repo;
};

const entry = (branch: string, over: Partial<Entry> = {}): Omit<Entry, 'outcome' | 'conflicts'> => ({
  parts: [],
  pr: null,
  branch,
  ref: branch,
  copy: 'local',
  notPushed: 'never',
  diverged: false,
  worktree: null,
  dirty: [],
  ...over,
});

describe('entriesOf', () => {
  it('merges the open pull requests in their order, then the parts with no pull request by their branch', () => {
    const entries = entriesOf(
      epic({
        parts: [
          part(20, { mentions: [pr(2, { headRefName: '20-a' })] }),
          part(21, { branches: ['21-linked'] }),
          part(22),
          part(23, { state: 'CLOSED' }),
        ],
        intoBranch: [pr(1, { headRefName: '10-own-work' })],
      }),
      ['22-local', '23-closed'],
    );
    assert.deepEqual(
      entries.map((e) => [e.branch, e.parts.map((p) => p.number)]),
      [
        ['10-own-work', []],
        ['20-a', [20]],
        ['21-linked', [21]],
        ['22-local', [22]],
      ],
    );
  });

  it('lists a part with no branch at all, so the table says it is missing', () => {
    assert.deepEqual(
      entriesOf(epic({ parts: [part(20)] }), []).map((e) => e.branch),
      [null],
    );
  });
});

describe('previewDir', () => {
  it('fills the template beside the main worktree, or relative to it', () => {
    assert.equal(previewDir(DEFAULTS.preview.dir, '/r/magma', 1292), '/r/magma-wt-1292-preview');
    assert.equal(previewDir('.previews/{repo}-{epic}', '/r/home', 7), '/r/home/.previews/home-7');
  });
});

describe('rebuild', () => {
  it('merges each branch in order, skips the one that conflicts and names its files', () => {
    const repo = withParts('merge');
    const dir = path.join(temp, 'merge-preview');
    const result = rebuild(repo, dir, '10-preview', 'epic', [
      entry('20-a'),
      entry('21-b'),
      entry('22-c'),
      entry('none', { ref: null, copy: 'missing' }),
    ]);
    assert.deepEqual(result.blocked, []);
    assert.equal(result.created, true);
    assert.deepEqual(
      result.entries.map((e) => [e.branch, e.outcome, e.conflicts]),
      [
        ['20-a', 'merged', []],
        ['21-b', 'merged', []],
        ['22-c', 'conflict', ['shared.txt']],
        ['none', 'missing', []],
      ],
    );
    assert.deepEqual(uncommitted(dir), [], 'a conflict is aborted, not left in the folder');
    assert.equal(sh(dir, 'rev-parse', '--abbrev-ref', 'HEAD'), '10-preview');
    assert.equal(sh(repo, 'rev-parse', 'epic'), sh(repo, 'rev-parse', 'epic'), 'the base is untouched');
  });

  it('rebuilds from scratch on the next run, and knows a branch already in the base', () => {
    const repo = withParts('again');
    const dir = path.join(temp, 'again-preview');
    rebuild(repo, dir, '10-preview', 'epic', [entry('20-a')]);
    sh(repo, 'merge', '--quiet', '--no-edit', '20-a');
    const second = rebuild(repo, dir, '10-preview', 'epic', [entry('20-a'), entry('21-b')]);
    assert.deepEqual(
      second.entries.map((e) => [e.branch, e.outcome]),
      [
        ['20-a', 'already in'],
        ['21-b', 'merged'],
      ],
    );
  });

  it('never touches a preview that holds uncommitted changes or a commit of its own', () => {
    const repo = withParts('guard');
    const dir = path.join(temp, 'guard-preview');
    rebuild(repo, dir, '10-preview', 'epic', [entry('20-a')]);
    writeFileSync(path.join(dir, 'notes.txt'), 'work\n');
    const dirty = rebuild(repo, dir, '10-preview', 'epic', [entry('20-a')]);
    assert.match(dirty.blocked.join(), /holds uncommitted changes: notes\.txt/);
    sh(dir, 'add', 'notes.txt');
    sh(dir, 'commit', '--quiet', '--no-verify', '-m', 'work on the preview');
    const committed = rebuild(repo, dir, '10-preview', 'epic', [entry('20-a')]);
    assert.match(committed.blocked.join(), /holds commits of its own: [0-9a-f]+ work on the preview/);
    assert.equal(sh(dir, 'log', '-1', '--format=%s'), 'work on the preview', 'the commit is still there');
  });

  it('refuses a folder on another branch, and a preview branch with commits of its own', () => {
    const repo = withParts('other');
    const dir = path.join(temp, 'other-preview');
    sh(repo, 'worktree', 'add', '--quiet', dir, '20-a');
    assert.match(rebuild(repo, dir, '10-preview', 'epic', []).blocked.join(), /is on `20-a`, not on `10-preview`/);

    sh(repo, 'branch', '11-preview', 'epic');
    sh(repo, 'checkout', '--quiet', '11-preview');
    writeFileSync(path.join(repo, 'own.txt'), 'own\n');
    sh(repo, 'add', 'own.txt');
    sh(repo, 'commit', '--quiet', '--no-verify', '-m', 'own commit');
    sh(repo, 'checkout', '--quiet', 'epic');
    const result = rebuild(repo, path.join(temp, 'other-11'), '11-preview', 'epic', []);
    assert.match(result.blocked.join(), /the branch `11-preview` holds commits of its own: [0-9a-f]+ own commit/);
  });

  it('never pushes: the preview branch has no upstream and origin never sees it', () => {
    const { repo, origin, commit } = repository(temp, 'nopush', 'epic');
    commit('epic', 'a.txt', 'a\n');
    sh(repo, 'push', '--quiet', 'origin', 'epic');
    const dir = path.join(temp, 'nopush-preview');
    rebuild(repo, dir, '10-preview', 'epic', []);
    assert.equal(sh(origin, 'branch', '--list', '10-preview'), '');
    assert.throws(() => sh(repo, 'config', '--get', 'branch.10-preview.remote'), 'no upstream');
  });
});

describe('renderPreview', () => {
  const config = validate({
    preview: {
      install: 'npm ci',
      build: ['npm run build'],
      serve: [{ name: 'site', url: 'http://localhost:4411', command: 'npm run dev -- --port 4411', cwd: 'app' }],
    },
  }).config;

  it('says what each branch brings and what stays out, then how to see it', () => {
    const text = renderPreview(
      {
        epic: epic({ distance: { ahead: 3, behind: 1 } }),
        dir: '/repos/x-wt-10-preview',
        branch: '10-preview',
        base: 'origin/10-epic',
        blocked: [],
        created: true,
        installDue: true,
        entries: [
          {
            ...entry('20-a', { worktree: '/repos/x-wt-20', dirty: [' M a.ts', '?? b.ts'], notPushed: 3 }),
            outcome: 'merged',
            conflicts: [],
          },
          { ...entry('22-c'), outcome: 'conflict', conflicts: ['shared.txt'] },
          { ...entry('23-d', { copy: 'origin', notPushed: 0 }), outcome: 'already in', conflicts: [] },
        ],
      },
      config,
    );
    assert.match(
      text,
      /^\| 1 \| work of the epic itself \| `20-a` \| `x-wt-20` \| 2 files \| 3 commits \| yes, without the 2 uncommitted files \|$/m,
    );
    assert.match(text, /^\| 2 \| .* \| no: conflicts in `shared\.txt` \|$/m);
    assert.match(text, /^\| 3 \| .* `23-d` \(origin\) .* already in the branch of the epic \|$/m);
    assert.match(text, /Install once, in `\/repos\/x-wt-10-preview`: `npm ci`\./);
    assert.match(text, /Build, in `\/repos\/x-wt-10-preview`: `npm run build`\./);
    assert.match(text, /Serve site, in `\/repos\/x-wt-10-preview\/app`: `npm run dev -- --port 4411` \(it answers at http:\/\/localhost:4411\)\./);
    assert.match(text, /Commit on its branch what each part should show: `x-wt-20`/);
    assert.match(text, /never pushed/);
  });

  it('says the commands are unknown without a configuration', () => {
    assert.match(seeIt(DEFAULTS, '/x', false).join(), /add `preview` to `\.claude\/v2\.json`/);
  });
});
