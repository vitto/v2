import assert from 'node:assert/strict';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { DEFAULTS, loadConfig, validate } from './config.ts';
import { repository, sh, tempDir } from './testing.ts';

// realpath: git answers /private/var where the temporary folder of macOS says /var
const temp = realpathSync(tempDir('config'));

describe('validate', () => {
  it('fills the defaults of what is missing', () => {
    const { config, errors } = validate({});
    assert.deepEqual(errors, []);
    assert.deepEqual(config, DEFAULTS);
  });

  it('reads the examples of the plugin without an error', async () => {
    const { readFileSync } = await import('node:fs');
    for (const name of ['home', 'magma']) {
      const file = new URL(`../../examples/${name}.v2.json`, import.meta.url);
      const { errors } = validate(JSON.parse(readFileSync(file, 'utf8')));
      assert.deepEqual(errors, [], name);
    }
  });

  it('refuses squash and rebase, and says why', () => {
    for (const method of ['squash', 'rebase'])
      assert.match(validate({ merge: { method } }).errors.join(), /never used, GOVERNANCE\.md rule 1/);
    assert.equal(validate({ merge: { method: 'queue' } }).config.merge.method, 'queue');
  });

  it('names an unknown key and ignores the notes starting with $', () => {
    const { errors } = validate({ $schema: 'x', $comment: 'y', merge: { mehtod: 'merge' } });
    assert.deepEqual(errors, ['merge.mehtod: unknown key (known: method, blockingWorkflows)']);
  });

  it('takes a blocking workflow as a file name or with its event', () => {
    const { config } = validate({
      merge: { blockingWorkflows: ['release.yml', { workflow: 'publish.yml', event: 'workflow_dispatch' }] },
    });
    assert.deepEqual(config.merge.blockingWorkflows, [
      { workflow: 'release.yml' },
      { workflow: 'publish.yml', event: 'workflow_dispatch' },
    ]);
  });

  it('checks that every page rule names a server of preview.serve', () => {
    const { errors } = validate({
      preview: { serve: [{ name: 'site', url: 'http://localhost:4321/' }] },
      pages: [
        { type: 'static', server: 'site', files: 'src/pages/{page}.astro', path: '/{page}' },
        { type: 'static', server: 'docs', files: 'docs/**', links: [{ label: 'Docs', path: '/' }] },
      ],
    });
    assert.deepEqual(errors, ['pages[1].server: no server named docs in preview.serve']);
    assert.equal(validate({ preview: { serve: [{ name: 'site', url: 'http://x:1/' }] } }).config.preview.serve[0].url, 'http://x:1');
  });

  it('asks a static rule for either a path or links, and a storybook group for /** and a {name}', () => {
    const serve = [{ name: 'sb', url: 'http://localhost:6006' }];
    assert.match(
      validate({ preview: { serve }, pages: [{ type: 'static', server: 'sb', files: 'a/**' }] }).errors.join(),
      /give either path/,
    );
    assert.match(
      validate({
        preview: { serve },
        pages: [{ type: 'storybook', server: 'sb', root: 'x', groups: ['src/components/*'] }],
      }).errors.join(),
      /must end in \/\*\* and hold a \{name\}/,
    );
    assert.match(validate({ pages: [{ type: 'unknown' }] }).errors.join(), /one of storybook, static, command/);
  });
});

describe('loadConfig', () => {
  it('reads the file of the checkout, else the one of the main worktree, else the defaults', () => {
    const { repo, commit } = repository(temp, 'load');
    commit('main', 'readme.md', 'x\n');
    const worktree = path.join(temp, 'load-wt');
    sh(repo, 'worktree', 'add', '--quiet', '-b', 'feature', worktree);
    assert.equal(loadConfig(worktree).file, null, 'no file anywhere: the defaults');

    mkdirSync(path.join(repo, '.claude'));
    writeFileSync(path.join(repo, '.claude/v2.json'), JSON.stringify({ merge: { method: 'queue' } }));
    const fromMain = loadConfig(worktree);
    assert.equal(fromMain.file, path.join(repo, '.claude/v2.json'));
    assert.equal(fromMain.config.merge.method, 'queue');

    mkdirSync(path.join(worktree, '.claude'));
    writeFileSync(path.join(worktree, '.claude/v2.json'), JSON.stringify({ merge: { method: 'merge' } }));
    assert.equal(loadConfig(worktree).config.merge.method, 'merge', 'the checkout first');
  });

  it('reads --config when given, and says when the file is not JSON or missing', () => {
    const file = path.join(temp, 'broken.json');
    writeFileSync(file, '{ "merge": ');
    assert.match(loadConfig(temp, file).errors.join(), /^not JSON/);
    assert.match(loadConfig(temp, 'missing.json').errors.join(), /does not exist/);
  });
});
