import assert from 'node:assert/strict';
import { realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { repository, sh, tempDir } from './testing.ts';
import {
  chooseCopy,
  isModulesLink,
  onlyHere,
  parseWorktrees,
  resolveCopy,
  uncommitted,
  worktreesOf,
} from './worktrees.ts';

const temp = realpathSync(tempDir('worktrees'));

describe('isModulesLink', () => {
  it('leaves out the node_modules links a worktree carries, and nothing else', () => {
    assert.ok(isModulesLink('?? node_modules'));
    assert.ok(isModulesLink('?? projects/stencil/node_modules'));
    assert.equal(isModulesLink('?? node_modules_notes.md'), false);
    assert.equal(isModulesLink(' M package.json'), false);
  });
});

describe('chooseCopy', () => {
  it('takes the local copy when it holds commits origin has not, and says when origin moved too', () => {
    assert.deepEqual(chooseCopy({ local: true, remote: true, ahead: 2, behind: 0 }), {
      copy: 'local',
      notPushed: 2,
      diverged: false,
    });
    assert.deepEqual(chooseCopy({ local: true, remote: true, ahead: 1, behind: 3 }), {
      copy: 'local',
      notPushed: 1,
      diverged: true,
    });
  });
  it('takes origin when the local copy is only behind or missing, and knows a branch never pushed', () => {
    assert.equal(chooseCopy({ local: true, remote: true, ahead: 0, behind: 4 }).copy, 'origin');
    assert.equal(chooseCopy({ local: false, remote: true, ahead: 0, behind: 0 }).copy, 'origin');
    assert.deepEqual(chooseCopy({ local: true, remote: false, ahead: 0, behind: 0 }), {
      copy: 'local',
      notPushed: 'never',
      diverged: false,
    });
    assert.equal(chooseCopy({ local: false, remote: false, ahead: 0, behind: 0 }).copy, 'missing');
  });
});

describe('parseWorktrees', () => {
  it('reads the main worktree first, a detached one, and leaves out the prunable and the bare', () => {
    const list = parseWorktrees(
      [
        'worktree /r/main',
        'HEAD aaa',
        'branch refs/heads/main',
        '',
        'worktree /r/main-wt-12',
        'HEAD bbb',
        'branch refs/heads/12-part',
        '',
        'worktree /r/gone',
        'HEAD ccc',
        'branch refs/heads/gone',
        'prunable gitdir file points to non-existent location',
        '',
        'worktree /r/detached',
        'HEAD ddd',
        'detached',
        '',
      ].join('\n'),
    );
    assert.deepEqual(list, [
      { dir: '/r/main', branch: 'main', head: 'aaa', main: true },
      { dir: '/r/main-wt-12', branch: '12-part', head: 'bbb', main: false },
      { dir: '/r/detached', branch: null, head: 'ddd', main: false },
    ]);
  });
});

describe('on a real repository', () => {
  it('counts the commits no remote branch holds, the uncommitted files, and picks the newest copy', () => {
    const { repo, commit } = repository(temp, 'here');
    commit('main', 'a.txt', 'a\n');
    sh(repo, 'push', '--quiet', '-u', 'origin', 'main');
    assert.equal(onlyHere(repo, 'HEAD'), 0, 'everything is on origin');

    const wt = path.join(temp, 'here-wt');
    sh(repo, 'worktree', 'add', '--quiet', '-b', '7-part', wt);
    writeFileSync(path.join(wt, 'b.txt'), 'b\n');
    sh(wt, 'add', 'b.txt');
    sh(wt, 'commit', '--quiet', '--no-verify', '-m', 'part');
    writeFileSync(path.join(wt, 'c.txt'), 'c\n');
    assert.equal(onlyHere(wt, 'HEAD'), 1, 'the commit of the part lives only here');
    assert.deepEqual(uncommitted(wt), ['?? c.txt']);
    assert.deepEqual(
      worktreesOf(repo).map((w) => [path.basename(w.dir), w.branch, w.main]),
      [
        ['here', 'main', true],
        ['here-wt', '7-part', false],
      ],
    );
    assert.deepEqual(resolveCopy(repo, '7-part'), {
      copy: 'local',
      notPushed: 'never',
      diverged: false,
      ref: '7-part',
    });
    sh(wt, 'push', '--quiet', '-u', 'origin', '7-part');
    assert.equal(onlyHere(wt, 'HEAD'), 0);
    assert.equal(resolveCopy(repo, '7-part').copy, 'origin', 'the same commits: origin');
    assert.equal(resolveCopy(repo, 'nothing').copy, 'missing');
  });
});
