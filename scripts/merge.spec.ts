import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { DEFAULTS, validate } from './lib/config.ts';
import type { MergeFacts } from './lib/github.ts';
import { pr } from './lib/fixtures.ts';
import { tempDir } from './lib/testing.ts';
import { checksOf, mergeArgs, methodOf, names, renderMerge } from './merge.ts';

const temp = tempDir('merge');
const MERGE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'merge.ts');
const SHA = 'a'.repeat(40);
const repo = { owner: 'o', name: 'r' };

const facts = (over: Partial<MergeFacts['pr']> = {}, rest: Partial<MergeFacts> = {}): MergeFacts => ({
  pr: {
    ...pr(5, { baseRefName: 'main', headRefName: '5-fix' }),
    headRefOid: SHA,
    isCrossRepository: false,
    reviewDecision: null,
    mergeStateStatus: 'CLEAN',
    ...over,
  },
  defaultBranch: 'main',
  mergeCommitAllowed: true,
  baseQueue: false,
  baseDistance: null,
  ...rest,
});

const held = (checks: { what: string; holds: boolean }[]) => checks.filter((c) => c.holds).map((c) => c.what);

describe('mergeArgs', () => {
  it('is a merge commit or the merge queue, always on the commit seen, never another flag', () => {
    assert.deepEqual(mergeArgs(repo, 5, 'merge', SHA), ['pr', 'merge', '5', '-R', 'o/r', '--merge', '--match-head-commit', SHA]);
    assert.deepEqual(mergeArgs(repo, 5, 'queue', SHA), ['pr', 'merge', '5', '-R', 'o/r', '--match-head-commit', SHA]);
    for (const args of [mergeArgs(repo, 5, 'merge', SHA), mergeArgs(repo, 5, 'queue', SHA)])
      for (const forbidden of ['--auto', '--admin', '--squash', '--rebase', '--delete-branch'])
        assert.equal(args.includes(forbidden), false, forbidden);
    assert.throws(() => mergeArgs(repo, 5, 'merge', 'HEAD'), /not a commit id/);
  });
});

describe('names', () => {
  it('takes the words of the person only when they name this pull request alone', () => {
    assert.ok(names('ok #1302', 1302));
    assert.ok(names('mergia la 1302', 1302));
    assert.ok(names('OK #5, go', 5));
    assert.equal(names('ok', 1302), false);
    assert.equal(names('mergia', 1302), false);
    assert.equal(names('ok #13021', 1302), false);
    assert.equal(names('ok #1302 e #1303', 1302), false, 'two pull requests: not this one alone');
    assert.equal(names('ok #1303', 1302), false);
  });
});

describe('methodOf', () => {
  it('follows the merge queue GitHub has, and holds a queue the configuration asks for in vain', () => {
    const queue = validate({ merge: { method: 'queue' } }).config;
    assert.deepEqual(methodOf({ baseQueue: true, defaultBranch: 'main', base: 'main' }, DEFAULTS), { method: 'queue' });
    assert.deepEqual(methodOf({ baseQueue: false, defaultBranch: 'main', base: 'main' }, DEFAULTS), { method: 'merge' });
    assert.match(methodOf({ baseQueue: false, defaultBranch: 'main', base: 'main' }, queue).problem ?? '', /has none on GitHub/);
    assert.deepEqual(methodOf({ baseQueue: false, defaultBranch: 'main', base: '10-epic' }, queue), { method: 'merge' });
  });
});

describe('checksOf', () => {
  it('lets a clean pull request through', () => {
    assert.deepEqual(held(checksOf(facts(), DEFAULTS, [])), []);
  });

  it('holds on anything GitHub would refuse or a person should see first', () => {
    assert.deepEqual(
      held(
        checksOf(
          facts({ isDraft: true, checks: 'PENDING', mergeable: 'CONFLICTING', reviewDecision: 'CHANGES_REQUESTED', mergeStateStatus: 'BLOCKED' }),
          DEFAULTS,
          [],
        ),
      ),
      ['Draft', 'Checks', 'Conflicts', 'Review', 'Rules of the base'],
    );
    assert.deepEqual(held(checksOf(facts({ checks: null }), DEFAULTS, [])), ['Checks'], 'no checks reported is not green');
    assert.deepEqual(held(checksOf(facts({ state: 'MERGED' }), DEFAULTS, [])), ['Pull request']);
    assert.deepEqual(held(checksOf(facts({ isInMergeQueue: true }), DEFAULTS, [])), ['Merge queue']);
    assert.deepEqual(held(checksOf(facts({ headRefName: 'main', baseRefName: '10-epic' }, { baseDistance: { ahead: 1, behind: 0 } }), DEFAULTS, [])), ['Head']);
    assert.deepEqual(held(checksOf(facts({}, { mergeCommitAllowed: false }), DEFAULTS, [])), ['Method']);
  });

  it('holds a part while the branch of its epic is behind the default branch (rule 2)', () => {
    const part = facts({ baseRefName: '10-epic' }, { baseDistance: { ahead: 4, behind: 2 } });
    const checks = checksOf(part, DEFAULTS, []);
    assert.deepEqual(held(checks), ['Branch of the epic']);
    assert.match(checks.find((c) => c.what === 'Branch of the epic')?.state ?? '', /2 commits behind `main`: sync it first \(rule 2\)/);
  });

  it('holds a merge into the default branch while a blocking workflow has a run not finished', () => {
    const config = validate({ merge: { blockingWorkflows: [{ workflow: 'publish.yml', event: 'workflow_dispatch' }] } }).config;
    const run = { workflow: 'publish.yml', event: 'workflow_dispatch', status: 'waiting', url: 'https://x/run/1' };
    assert.deepEqual(held(checksOf(facts(), config, [run])), ['Blocking workflows']);
    assert.deepEqual(held(checksOf(facts(), config, [])), []);
  });
});

describe('renderMerge', () => {
  it('writes the checks as a table and asks for the ok naming the pull request', () => {
    const text = renderMerge(facts(), checksOf(facts(), DEFAULTS, []), 'gh pr merge 5 --merge', []);
    assert.match(text, /^\| Check \| State \| Result \|$/m);
    assert.match(text, /^\| Checks \| checks green \| ok \|$/m);
    assert.match(text, /Ready: it waits for your ok, naming it \("ok #5"\)\. Then: `gh pr merge 5 --merge`\./);
  });
});

/*
  merge.ts end to end, with a `gh` of its own first on the PATH: it answers the queries from a
  state file and writes down every `gh pr merge` it is asked for.
*/
const FAKE_GH = `#!/usr/bin/env node
const fs = require('node:fs');
const state = JSON.parse(fs.readFileSync(process.env.FAKE_GH_STATE, 'utf8'));
const args = process.argv.slice(2);
const out = (data) => process.stdout.write(JSON.stringify(data));
if (args[0] === 'pr' && args[1] === 'merge') {
  fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(args) + '\\n');
  if (state.queue) state.pr.isInMergeQueue = true; else state.pr.state = 'MERGED';
  fs.writeFileSync(process.env.FAKE_GH_STATE, JSON.stringify(state));
} else if (args[0] === 'run' && args[1] === 'list') out(state.runs || []);
else if (args[0] === 'api' && args[1].startsWith('repos/')) out(state.distance || { ahead: 0, behind: 0 });
else if (args[0] === 'api' && args[1] === 'graphql') {
  const query = args.find((a) => a.startsWith('query=')) || '';
  if (query.includes('mergeCommitAllowed'))
    out({ data: { repository: { defaultBranchRef: { name: 'main' }, mergeCommitAllowed: true, pullRequest: state.pr } } });
  else out({ data: { repository: { mergeQueue: state.queue ? { url: 'q' } : null } } });
} else { process.stderr.write('fake gh: unexpected ' + args.join(' ')); process.exit(9); }
`;

const ghDir = path.join(temp, 'bin');
const fake = (name: string, over: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => {
  const stateFile = path.join(temp, `${name}.state.json`);
  const log = path.join(temp, `${name}.log`);
  writeFileSync(
    stateFile,
    JSON.stringify({
      pr: {
        number: 5, title: 'fix', url: 'https://github.com/o/r/pull/5', state: 'OPEN', isDraft: false,
        baseRefName: 'main', headRefName: '5-fix', createdAt: '2026-11-01T00:00:00Z', mergedAt: null,
        body: '', mergeable: 'MERGEABLE', isInMergeQueue: false,
        commits: { nodes: [{ commit: { statusCheckRollup: { state: 'SUCCESS' } } }] },
        headRefOid: SHA, isCrossRepository: false, reviewDecision: null, mergeStateStatus: 'CLEAN',
        ...over,
      },
      ...extra,
    }),
  );
  const run = (...args: string[]) => {
    const result = spawnSync('node', [MERGE, '5', '--repo=o/r', ...args], {
      cwd: temp,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${ghDir}:${process.env.PATH}`, FAKE_GH_STATE: stateFile, FAKE_GH_LOG: log },
    });
    return { status: result.status, out: result.stdout + result.stderr };
  };
  const merges = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  return { run, merges };
};

describe('merge.ts with a fake gh', () => {
  mkdirSync(ghDir, { recursive: true });
  writeFileSync(path.join(ghDir, 'gh'), FAKE_GH);
  chmodSync(path.join(ghDir, 'gh'), 0o755);

  it('only checks without an approval', () => {
    const gh = fake('check');
    const { status, out } = gh.run();
    assert.equal(status, 0);
    assert.match(out, /Ready: it waits for your ok, naming it \("ok #5"\)/);
    assert.deepEqual(gh.merges(), []);
  });

  it('refuses an approval that does not name the pull request', () => {
    const gh = fake('unnamed');
    const { status, out } = gh.run('--approved=ok mergia');
    assert.equal(status, 1);
    assert.match(out, /Not merged: the approval "ok mergia" does not name #5 alone/);
    assert.deepEqual(gh.merges(), []);
  });

  it('merges with a merge commit, on the commit seen, once the approval names it', () => {
    const gh = fake('named');
    const { status, out } = gh.run('--approved=ok #5');
    assert.equal(status, 0, out);
    assert.deepEqual(gh.merges(), [['pr', 'merge', '5', '-R', 'o/r', '--merge', '--match-head-commit', SHA]]);
    assert.match(out, /Approved \("ok #5"\) and carried out/);
    assert.match(out, /GitHub says: merged into `main`\./);
  });

  it('adds it to the merge queue of a base that has one, without --merge', () => {
    const gh = fake('queue', {}, { queue: true });
    const { out } = gh.run('--approved=ok #5');
    assert.deepEqual(gh.merges(), [['pr', 'merge', '5', '-R', 'o/r', '--match-head-commit', SHA]]);
    assert.match(out, /GitHub says: in the merge queue of `main`/);
  });

  it('does not merge an approved pull request that something holds, and says what', () => {
    const gh = fake('red', { commits: { nodes: [{ commit: { statusCheckRollup: { state: 'FAILURE' } } }] } });
    const { status, out } = gh.run('--approved=ok #5');
    assert.equal(status, 1);
    assert.match(out, /Not merged, though approved \("ok #5"\): checks hold it/);
    assert.deepEqual(gh.merges(), []);
  });

  it('waits for a blocking workflow run that is not finished, from the configuration', () => {
    const config = path.join(temp, 'blocking.v2.json');
    writeFileSync(config, JSON.stringify({ merge: { blockingWorkflows: ['publish.yml'] } }));
    const gh = fake('blocking', {}, { runs: [{ status: 'in_progress', event: 'workflow_dispatch', url: 'https://x/1', workflowName: 'publish' }] });
    const { status, out } = gh.run('--approved=ok #5', `--config=${config}`);
    assert.equal(status, 1);
    assert.match(out, /\| Blocking workflows \| `publish\.yml` in progress: https:\/\/x\/1 \| \*\*holds\*\* \|/);
    assert.deepEqual(gh.merges(), []);
  });
});
