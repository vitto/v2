import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  commandOf,
  jobsTable,
  markdownOf,
  pageOf,
  parseExamples,
  phrasesOf,
  problemsOf,
  purposeOf,
  readSkills,
  rulesOf,
  type Skill,
} from './help.ts';
import { escapeHtml, inline } from './lib/page.ts';

const root = path.join(import.meta.dirname, '..');

const file = (body: string, head = 'group: workflow\norder: 1'): string => `---\n${head}\n---\n\n${body}`;

const job = (title: string, rows: string[], extra = ''): string =>
  [`## ${title}`, '', 'Changes: nothing; it only reads.', ...(extra ? [extra] : []), '', '| You type | When | You get |', '| --- | --- | --- |', ...rows, ''].join('\n');

const skill = (name: string, description: string, examples: string, args = ''): Skill => ({
  name,
  description,
  args,
  purpose: purposeOf(description),
  phrases: phrasesOf(description),
  byWords: true,
  examples: parseExamples(examples),
});

describe('examples.md', () => {
  it('reads the frontmatter, each job, its Changes, its Say and its examples', () => {
    const parsed = parseExamples(
      file(
        [
          job('Know where the work stands', ['| `/v2:work 12` | an epic is open | its parts |', '| "a che punto siamo?" | mid-work | a question |'], 'Say: "stato", "a che punto siamo"'),
          job('Try the work', ['| `/v2:work test 12` | parts are open | a preview |', '| a cell with a \\| pipe | when | what |']),
        ].join('\n'),
        'group: workflow\norder: 3\nloads-by-itself: true',
      ),
    );
    assert.equal(parsed.group, 'workflow');
    assert.equal(parsed.order, 3);
    assert.equal(parsed.loadsByItself, true);
    assert.deepEqual(parsed.jobs.map((j) => j.title), ['Know where the work stands', 'Try the work']);
    assert.equal(parsed.jobs[0].changes, 'nothing; it only reads');
    assert.deepEqual(parsed.jobs[0].say, ['stato', 'a che punto siamo']);
    assert.deepEqual(parsed.jobs[1].say, []);
    assert.deepEqual(parsed.jobs[0].examples[1], { type: '"a che punto siamo?"', when: 'mid-work', get: 'a question' });
    assert.equal(parsed.jobs[1].examples[1].type, 'a cell with a | pipe');
  });

  const refused: [string, string, RegExp][] = [
    ['an unknown group', file(job('J', ['| a | b | c |']), 'group: other\norder: 1'), /group is "other"/],
    ['an order that is no whole number', file(job('J', ['| a | b | c |']), 'group: design\norder: first'), /order is "first"/],
    ['an unknown key', file(job('J', ['| a | b | c |']), 'group: design\norder: 1\njob: x'), /unknown key job/],
    ['text before the first job', file(`Some words\n\n${job('J', ['| a | b | c |'])}`), /:6: text before the first/],
    ['a table with another header', file('## J\n\nChanges: x.\n\n| Type | When | Get |\n| --- | --- | --- |\n| a | b | c |\n'), /:10: the table of examples opens with/],
    ['a table without its separator', file('## J\n\nChanges: x.\n\n| You type | When | You get |\n| a | b | c |\n'), /:11: the second line of the table/],
    ['a row of two cells', file(job('J', ['| a | b |'])), /:12: an example has three cells/],
    ['an empty cell', file(job('J', ['| a |  | c |'])), /an example has three cells, none empty/],
    ['a Say: without quotes', file(job('J', ['| a | b | c |'], 'Say: stato, testa')), /Say: holds "phrases"/],
    ['a job without Changes:', file('## J\n\n| You type | When | You get |\n| --- | --- | --- |\n| a | b | c |\n'), /"J" has no Changes: line/],
    ['a job without examples', file('## J\n\nChanges: x.\n'), /"J" has no examples/],
    ['no job', file(''), /no `## <job>` section/],
    ['a stray line', file(`${job('J', ['| a | b | c |'])}\nA note under the table\n`), /:14: a line that is no heading/],
  ];
  for (const [what, text, error] of refused) {
    it(`refuses ${what}, with its line`, () => assert.throws(() => parseExamples(text, 'x/examples.md'), error));
  }
});

describe('the description', () => {
  const description =
    'Where the work stands, as tables. Use when asked where things stand; in Italian "stato", "a che punto siamo".';

  it('says what the skill is for before its "Use when"', () =>
    assert.equal(purposeOf(description), 'Where the work stands, as tables.'));

  it('gives the words that call it: its phrases in double quotes', () =>
    assert.deepEqual(phrasesOf(description), ['stato', 'a che punto siamo']));
});

describe('the problems of a skill', () => {
  const description = 'Where the work stands. Use when asked; in Italian "stato", "testa".';

  it('none when the examples keep the rules', () => {
    const s = skill('work', description, file(job('J', ['| `/v2:work 12` | b | c |', '| "stato" | b | c |'], 'Say: "stato"')));
    assert.deepEqual(problemsOf(s), []);
  });

  it('two to four examples a job', () => {
    const s = skill('work', description, file(job('J', ['| `/v2:work` | b | c |'])));
    assert.match(problemsOf(s).join('\n'), /1 examples, not 2 to 4/);
  });

  it('an example typed as a command calls its own skill', () => {
    const s = skill('work', description, file(job('J', ['| `/v2:work-map done` | b | c |', '| `/v2:work` | b | c |'])));
    assert.match(problemsOf(s).join('\n'), /calls \/v2:work-map, not \/v2:work/);
  });

  it('a phrase of Say: is a phrase of the description', () => {
    const s = skill('work', description, file(job('J', ['| a | b | c |', '| d | e | f |'], 'Say: "mergia"')));
    assert.match(problemsOf(s).join('\n'), /"mergia" is not a phrase of the description/);
  });

  it('a skill without examples.md is a problem', () => {
    const s = { ...skill('work', description, file(job('J', ['| a | b | c |', '| d | e | f |']))), examples: null };
    assert.deepEqual(problemsOf(s), ['skills/work/examples.md is missing']);
  });

  it('an examples.md that does not parse is a problem, with its line', () => {
    const s = { ...skill('work', description, file(job('J', ['| a | b | c |', '| d | e | f |']))), examples: null, error: 'skills/work/examples.md:7: text before the first `## <job>` heading' };
    assert.deepEqual(problemsOf(s), ['skills/work/examples.md:7: text before the first `## <job>` heading']);
  });

  it('a description that says no "Use when" is a problem', () => {
    const s = skill('work', 'Where the work stands.', file(job('J', ['| a | b | c |', '| d | e | f |'])));
    assert.match(problemsOf(s).join('\n'), /says no "Use when/);
  });
});

describe('the command of a job', () => {
  const description = 'Status, test and merge. Use when asked; in Italian "stato", "testa", "mergia".';
  const work = skill(
    'work',
    description,
    file(
      [
        job('Know where the work stands', ['| `/v2:work 12` | b | c |', '| `/v2:work status 12` | b | c |'], 'Say: "stato"'),
        job('Try the work', ['| "testa" | b | c |', '| `/v2:work test 12` | b | c |'], 'Say: "testa"'),
        job('Merge', ['| "mergia" | b | c |', '| "ok #12" | b | c |'], 'Say: "mergia"'),
      ].join('\n'),
    ),
    '[status | test | merge] [epic or pull request]',
  );

  it('is the mode its examples type, when the skill has more than one job', () => {
    const [status, test, merge] = work.examples?.jobs ?? [];
    assert.equal(commandOf(work, status), '/v2:work status');
    assert.equal(commandOf(work, test), '/v2:work test');
    assert.equal(commandOf(work, merge), '/v2:work', 'no example types its mode: the skill alone');
  });

  it('the table has a row per job, with its command and its words', () => {
    const rows = jobsTable([work]).slice(2);
    assert.deepEqual(rows, [
      '| Know where the work stands | `/v2:work status` | "stato" |',
      '| Try the work | `/v2:work test` | "testa" |',
      '| Merge | `/v2:work` | "mergia" |',
    ]);
  });
});

describe('the cheatsheet of this plugin', () => {
  const skills = readSkills(root);
  const version = JSON.parse(readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8')).version;
  const rules = rulesOf(readFileSync(path.join(root, 'GOVERNANCE.md'), 'utf8'));
  const html = pageOf(skills, { version, rules, date: '2026-11-27', focus: 'help' });

  it('reads the rules of GOVERNANCE.md, by number', () =>
    assert.deepEqual(rules.map((r) => r.n), ['1', '2', '3', '4', '5']));

  it('the page holds every skill, its card and each of its jobs', () => {
    for (const s of skills) {
      assert.ok(html.includes(`id="${s.name}"`), `no card for ${s.name}`);
      for (const j of s.examples?.jobs ?? []) assert.ok(html.includes(escapeHtml(j.title)), `${s.name}: no job "${j.title}"`);
    }
  });

  it('the page holds every example, escaped', () => {
    const examples = skills.flatMap((s) => s.examples?.jobs.flatMap((j) => j.examples) ?? []);
    assert.ok(examples.length >= skills.length * 2);
    for (const e of examples) {
      assert.ok(html.includes(`<div class="type">${inline(e.type)}</div>`), `no example ${e.type}`);
      assert.ok(html.includes(`<div class="get">${inline(e.get)}</div>`), `no "${e.get}"`);
    }
    assert.doesNotMatch(html, /<url>/, 'a <url> of an example reached the page unescaped');
  });

  it('opens on the card asked for, and names the version', () => {
    assert.match(html, /class="card focus" id="help"/);
    assert.match(html, new RegExp(`plugin v2 ${version.replace(/\./g, '\\.')}`));
  });

  it('the page loads nothing from the network', () => {
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|@import|url\(/);
  });

  it('prints the table in Markdown, or the card of one skill', () => {
    const table = markdownOf(skills, version);
    for (const s of skills) assert.ok(table.includes(`\`/v2:${s.name}`), `no row for ${s.name}`);
    const help = skills.find((s) => s.name === 'help');
    assert.ok(help);
    const card = markdownOf(skills, version, help);
    assert.match(card, /^### `\/v2:help`/m);
    assert.match(card, /\| You type \| When \| You get \|/);
  });
});

// a skill passes a bare --html: a ${TMPDIR} or a quoted path in the command is refused by the
// permission rule of a session that runs without asking (2026-11-27, #74)
describe('the command', () => {
  it('a bare --html writes v2-help.html in the temporary folder of the system', () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'help-spec-'));
    try {
      const run = spawnSync(process.execPath, [path.join(root, 'scripts', 'help.ts'), 'help', '--html'], {
        encoding: 'utf8',
        env: { ...process.env, TMPDIR: folder },
      });
      assert.equal(run.status, 0, run.stderr);
      const file = path.join(folder, 'v2-help.html');
      assert.ok(existsSync(file), 'no page in the temporary folder');
      assert.match(run.stdout, new RegExp(`The page: ${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}#help$`, 'm'));
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
