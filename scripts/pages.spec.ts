import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { validate, type PageRule } from './lib/config.ts';
import { repository, sh, tempDir } from './lib/testing.ts';
import {
  bucketOf,
  dropIndex,
  meaningful,
  onServer,
  parseCommandRows,
  render,
  rowsOf,
  type CommandRunner,
  type Servers,
  type StoryEntry,
} from './pages.ts';

const temp = realpathSync(tempDir('pages'));
const PAGES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages.ts');

const story = (id: string, importPath: string, type: 'docs' | 'story' = 'story'): StoryEntry => ({
  id,
  title: id.split('--')[0],
  name: id.split('--')[1] ?? 'docs',
  importPath,
  type,
});

const rules = validate({
  preview: {
    serve: [
      { name: 'storybook', url: 'http://localhost:6008' },
      { name: 'site', url: 'http://localhost:4321' },
    ],
  },
  pages: [
    { type: 'storybook', server: 'storybook', root: 'projects/stencil', groups: ['src/components/{name}/**'] },
    { type: 'static', server: 'site', files: 'src/pages/{page}.astro', path: '/{page}' },
    {
      type: 'static',
      server: 'site',
      files: ['src/components/**', 'src/layouts/**'],
      title: 'the whole site',
      links: [{ label: 'Home', path: '/' }],
      note: 'shared by every page',
    },
    { type: 'command', server: 'site', files: 'tools/**', command: 'unused' },
  ],
}).config.pages as PageRule[];

const servers = (index: StoryEntry[] | null): Servers =>
  new Map([
    ['storybook', { url: 'http://localhost:6008', index, answers: !!index }],
    ['site', { url: 'http://localhost:4321', index: null, answers: true }],
  ]);

const INDEX = [
  story('ui-chip--default', './src/components/mds-chip/stories/chip.stories.tsx'),
  story('ui-chip--docs', './src/components/mds-chip/stories/chip.mdx', 'docs'),
  story('intro--docs', './src/docs/intro.mdx', 'docs'),
];

const noCommand: CommandRunner = () => ({ error: 'not run' });
const subjects = (files: string[]) => files.map((file) => `change ${file}`);

describe('dropIndex and onServer', () => {
  it('serves a last segment named index as its folder', () => {
    assert.equal(dropIndex('/index'), '/');
    assert.equal(dropIndex('/blog/index'), '/blog/');
    assert.equal(dropIndex('/blog/index.html'), '/blog/');
    assert.equal(dropIndex('/reindex'), '/reindex');
  });
  it('joins a path to the server and keeps a full URL', () => {
    assert.equal(onServer('http://x:1', '/a'), 'http://x:1/a');
    assert.equal(onServer('http://x:1', 'a'), 'http://x:1/a');
    assert.equal(onServer('http://x:1', 'https://y/z'), 'https://y/z');
  });
});

describe('bucketOf', () => {
  it('takes a file by the first rule that matches it', () => {
    const at = (file: string) => bucketOf(file, rules, servers(INDEX));
    assert.deepEqual(at('projects/stencil/src/components/mds-chip/test/x.spec.ts'), {
      rule: 0,
      key: 'folder:src/components/mds-chip',
      title: 'mds-chip',
      folder: 'src/components/mds-chip',
    });
    assert.equal(at('projects/stencil/src/docs/intro.mdx')?.key, 'file:src/docs/intro.mdx');
    assert.equal(at('projects/stencil/package.json'), null, 'under the root, but no entry: no rule');
    assert.equal(at('src/pages/index.astro')?.title, '/');
    assert.equal(at('src/pages/blog/post.astro')?.title, '/blog/post');
    assert.equal(at('src/layouts/Layout.astro')?.title, 'the whole site');
    assert.equal(at('README.md'), null);
  });
});

describe('rowsOf', () => {
  it('links a component folder to its docs page first, then its stories, from the index', () => {
    const rows = rowsOf(['projects/stencil/src/components/mds-chip/chip.tsx'], subjects, rules, servers(INDEX), noCommand);
    assert.deepEqual(rows[0].links, [
      { label: 'ui-chip: Docs', url: 'http://localhost:6008/?path=/docs/ui-chip--docs' },
      { label: 'default', url: 'http://localhost:6008/?path=/story/ui-chip--default' },
    ]);
  });

  it('says so when Storybook does not answer, or shows no story of the change', () => {
    const down = rowsOf(['projects/stencil/src/components/mds-chip/chip.tsx'], subjects, rules, servers(null), noCommand);
    assert.match(down[0].note ?? '', /storybook does not answer at http:\/\/localhost:6008: start it, then run again/);
    const none = rowsOf(['projects/stencil/src/components/mds-new/x.tsx'], subjects, rules, servers(INDEX), noCommand);
    assert.equal(none[0].note, 'no story in storybook shows it');
  });

  it('gives a page its own row, shared files the fixed pages, and a removed page its note', () => {
    const rows = rowsOf(
      ['src/pages/about.astro', 'src/pages/old.astro', 'src/components/Hero.astro', 'src/layouts/Layout.astro'],
      subjects,
      rules,
      servers(INDEX),
      noCommand,
      new Set(['src/pages/old.astro']),
    );
    assert.deepEqual(
      rows.map((row) => [row.title, row.links.map((l) => l.url), row.note ?? null, row.files.length]),
      [
        ['/about', ['http://localhost:4321/about'], null, 1],
        ['/old', ['http://localhost:4321/old'], 'removed by this change: it should redirect or answer 404', 1],
        ['the whole site', ['http://localhost:4321/'], 'shared by every page', 2],
      ],
    );
  });

  it('runs a command once for its files, and puts a relative URL on its server', () => {
    const calls: string[][] = [];
    const runner: CommandRunner = (_rule, files, url) => {
      calls.push(files);
      return { rows: [{ title: 'tool', links: [{ label: 'Tool', url: '/tool' }], note: `at ${url}` }] };
    };
    const rows = rowsOf(['tools/a.ts', 'tools/b.ts'], subjects, rules, servers(INDEX), runner);
    assert.deepEqual(calls, [['tools/a.ts', 'tools/b.ts']]);
    assert.deepEqual(rows, [
      {
        title: 'tool',
        changes: ['change tools/a.ts', 'change tools/b.ts'],
        files: ['tools/a.ts', 'tools/b.ts'],
        links: [{ label: 'Tool', url: 'http://localhost:4321/tool' }],
        note: 'at http://localhost:4321',
      },
    ]);
    const failed = rowsOf(['tools/a.ts'], subjects, rules, servers(INDEX), noCommand);
    assert.equal(failed[0].note, 'the command of the project failed: not run');
  });

  it('keeps every other file in one row, so no change goes unseen, and orders the rows', () => {
    const rows = rowsOf(
      ['README.md', 'src/pages/b.astro', 'projects/stencil/src/components/mds-chip/x.ts', 'src/pages/a.astro'],
      subjects,
      rules,
      servers(INDEX),
      noCommand,
    );
    assert.deepEqual(
      rows.map((row) => row.title),
      ['mds-chip', '/a', '/b', 'no page in the browser'],
    );
    assert.equal(rows.at(-1)?.note, '1 file: tests, docs, tooling or CI');
  });
});

describe('parseCommandRows', () => {
  it('takes rows with a title, and says what is wrong otherwise', () => {
    assert.deepEqual(parseCommandRows('[{"title":"a","links":[{"label":"L","url":"/x"},{"bad":1}]}]'), {
      rows: [{ title: 'a', links: [{ label: 'L', url: '/x' }] }],
    });
    assert.deepEqual(parseCommandRows('nope'), { error: 'it did not print JSON' });
    assert.deepEqual(parseCommandRows('{}'), { error: 'it did not print a JSON list' });
    assert.deepEqual(parseCommandRows('[{"links":[]}]'), { error: 'a row has no title' });
  });
});

describe('meaningful and render', () => {
  it('drops the subjects the configuration ignores, and the repeats', () => {
    assert.deepEqual(meaningful(['feat: a', 'chore(release): 2.0.0', 'feat: a', ''], ['^chore\\(release\\)']), [
      'feat: a',
    ]);
  });

  it('writes one row per page, caps the links and keeps the cells in their columns', () => {
    const text = render(
      [
        {
          title: 'a | b',
          changes: ['one', 'two'],
          files: [],
          links: Array.from({ length: 8 }, (_, i) => ({ label: `L${i}`, url: `http://x/${i}` })),
          note: 'a note',
        },
      ],
      '## head',
    );
    assert.match(text, /^\| Title \| What changed \| URL \|$/m);
    assert.match(text, /^\| a \\\| b \| one<br>two \| \[L0\]\(http:\/\/x\/0\)<br>.*<br>\+2 more<br>a note \|$/m);
    assert.match(render([], '## h'), /\| - \| nothing changed \| - \|/);
  });
});

describe('pages.ts on a real repository', () => {
  it('reads the change from git, runs the command of the project with the JSON of the files, and prints the table', () => {
    const { repo, commit } = repository(temp, 'site');
    commit('main', 'README.md', 'x\n');
    sh(repo, 'branch', 'feature');
    mkdirSync(path.join(repo, 'src/pages/blog'), { recursive: true });
    mkdirSync(path.join(repo, 'tools'), { recursive: true });
    commit('feature', 'src/pages/blog/index.astro', 'blog\n');
    commit('feature', 'tools/gen.ts', 'tool\n');
    commit('feature', 'notes.md', 'notes\n');
    const config = path.join(temp, 'site.v2.json');
    writeFileSync(
      config,
      JSON.stringify({
        preview: { serve: [{ name: 'site', url: 'http://127.0.0.1:9', command: 'npm run dev' }] },
        pages: [
          { type: 'static', server: 'site', files: 'src/pages/{page}.astro', path: '/{page}' },
          {
            type: 'command',
            server: 'site',
            files: 'tools/**',
            // prints back what it read on its input, to prove the protocol
            command: `node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const i=JSON.parse(s);console.log(JSON.stringify([{title:'tools',links:[{label:i.files.join('+'),url:'/tools'}],note:i.head}]))})"`,
          },
        ],
      }),
    );
    const out = execFileSync('node', [PAGES, `--config=${config}`, '--base=main', '--head=feature'], {
      cwd: repo,
      encoding: 'utf8',
    });
    assert.match(out, /^## What to test: `feature` since it left `main`$/m);
    assert.match(out, /3 files changed\. site does not answer at http:\/\/127\.0\.0\.1:9 \(start it: `npm run dev`\)\./);
    assert.match(out, /^\| \/blog\/ \| feature: src\/pages\/blog\/index\.astro \| \[\/blog\/\]\(http:\/\/127\.0\.0\.1:9\/blog\/\) \|$/m);
    assert.match(out, /^\| tools \| feature: tools\/gen\.ts \| \[tools\/gen\.ts\]\(http:\/\/127\.0\.0\.1:9\/tools\)<br>feature \|$/m);
    assert.match(out, /^\| no page in the browser \| feature: notes\.md \| 1 file: tests, docs, tooling or CI \|$/m);
  });
});
