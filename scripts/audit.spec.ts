import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  checksOfPrinciple,
  countsOf,
  markdownOf,
  pageOf,
  readChecks,
  rich,
  shotSource,
  slug,
  validate,
  type Audit,
} from './audit.ts';
import { tempDir } from './lib/testing.ts';

const root = path.join(import.meta.dirname, '..');
const AUDIT = path.join(import.meta.dirname, 'audit.ts');
const checks = readChecks(root);
const temp = tempDir('audit');

/** The audit of the settings page of the eval case, as the skill would write it. */
const sample = (): Record<string, any> => ({
  target: 'impostazioni.html',
  mode: 'screen',
  why: 'a page people use',
  lang: 'en',
  model: null,
  ran: { runtime: null, rendered: null },
  rows: [
    {
      checks: ['EP1', 'EP7', 'CU6'],
      where: '`impostazioni.html:30`, the delete',
      result: 'fail',
      note: 'A clickable `div`: no role, no Tab, and the DELETE runs at once.',
      change: 'a `<button>` in the danger style that asks first',
    },
    { checks: ['EP14'], where: 'the `public` checkbox', result: 'fail', note: 'Public is preselected.', change: 'start private' },
    { checks: ['EP3', 'EP4'], where: 'the project name', result: 'fail', note: 'Only a placeholder | no label.', change: 'a visible label' },
    { checks: ['AB2'], where: '`styles.css:5`', result: 'draft', note: 'The borders give 1.9:1 by the stylesheet.' },
    { checks: ['EP2'], where: 'the search field', result: 'open', note: 'A preview?', question: 'Is the search a preview?' },
    {
      checks: ['AB1', 'EP12'],
      where: 'the whole page',
      result: 'not-verifiable',
      note: 'Needs the page as drawn and running.',
      estimate: '`#222` on white gives about 16:1 by the stylesheet',
      verify: 'measure it with rendered.ts',
    },
    { checks: ['EP3'], where: 'the search and the description', result: 'pass', note: 'Both have a name.', looked: 'lines 11 and 20' },
  ],
  summary: {
    start: [
      { row: 1, why: 'the only irreversible action' },
      { row: 2, why: 'it shares data for the person' },
    ],
    goal: { answer: 'no-model', note: 'It needs the focal entity.' },
    beyond: ['the page never names the project (see #1)'],
  },
});

const ok = (value: unknown): Audit => {
  const { audit, problems } = validate(value, checks, () => true);
  assert.deepEqual(problems, []);
  return audit;
};

const problemsOf = (change: (a: Record<string, any>) => void): string[] => {
  const a = sample();
  change(a);
  return validate(a, checks, (file) => !file.includes('missing')).problems;
};

describe('the checks, from the principles', () => {
  it('reads each check with its principle, strength, level, draft and the example of its rule', () => {
    assert.deepEqual(checks.get('EP1'), {
      id: 'EP1',
      strength: 'must',
      level: 'code',
      principle: 'error-prevention',
      title: 'Error Prevention',
      draft: false,
      rule: 'Clear Affordances',
      example: 'https://vittoriovittori.com/user-centered-design/error-prevention#clear-affordances',
    });
    assert.equal(checks.get('AB1')?.level, 'rendered');
    assert.equal(checks.get('AB1')?.draft, true);
    assert.equal(checks.get('EP7')?.level, 'runtime');
    assert.deepEqual(
      ['OM1', 'OM2', 'OM3', 'OM7'].map((id) => [id, checks.get(id)?.level, checks.get(id)?.principle]),
      [['OM1', 'rendered', 'object-model'], ['OM2', 'code', 'object-model'], ['OM3', 'runtime', 'object-model'], ['OM7', 'code', 'object-model']],
    );
    assert.equal(checks.get('DS1')?.principle, 'design-system');
  });

  it('reads every check the principles write', () => {
    const dir = path.join(root, 'principles');
    let written = 0;
    for (const section of readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()))
      for (const file of readdirSync(path.join(dir, section.name)))
        written += (readFileSync(path.join(dir, section.name, file), 'utf8').match(/^\*\*[A-Z]{2,3}\d+\*\* /gm) ?? []).length;
    assert.ok(written > 40, `${written} checks`);
    assert.equal([...checks.values()].filter((c) => !['object-model', 'design-system'].includes(c.principle)).length, written);
  });

  it('a rule title as the anchor of its example, as principles/README.md says', () => {
    assert.equal(slug('Semantic Consistency, Over Visual Sameness'), 'semantic-consistency-over-visual-sameness');
    const [check] = checksOfPrinciple('---\nid: x\ntitle: X\nsite: https://s/x\nstatus: draft\n---\n\n### Do it (now)\n\n**XX1** \u00b7 should \u00b7 rendered. Q?\n');
    assert.equal(check.example, 'https://s/x#do-it-now-');
    assert.equal(check.draft, true);
    assert.equal(check.strength, 'should');
  });

  it('the grader no-unrun-pass of the eval names every runtime and rendered check, and no other', () => {
    const grader = readFileSync(path.join(root, 'evals/audit-project-settings/graders/no-unrun-pass.md'), 'utf8');
    const pattern = new RegExp(/^pattern: '(.+)'$/m.exec(grader)?.[1] ?? 'none', 'm');
    for (const check of checks.values()) {
      const line = `| 1 | ${check.id} | x | **Pass.** y |`;
      assert.equal(pattern.test(line), check.level !== 'code', `${check.id} (${check.level})`);
    }
  });
});

describe('the audit, checked', () => {
  it('takes a sound audit as it is, with the defaults', () => {
    const audit = ok(sample());
    assert.equal(audit.rows.length, 7);
    assert.deepEqual(audit.rows[0].shots, []);
    assert.deepEqual(countsOf(audit), { fail: 3, question: 2, 'not-verifiable': 1, pass: 1 });
    const rest = sample();
    delete rest.lang;
    assert.equal(ok(rest).lang, 'en');
  });

  const refused: [string, (a: Record<string, any>) => void, RegExp][] = [
    ['an unknown key', (a) => (a.verdict = 1), /unknown key "verdict"/],
    ['an unknown key of a row', (a) => (a.rows[0].level = 'code'), /row 1 \(EP1, EP7, CU6\): unknown key "level"/],
    ['a check no principle has', (a) => a.rows[1].checks.push('EP99'), /EP99 is no check/],
    ['a row without checks', (a) => (a.rows[1].checks = []), /row 2: "checks" lists/],
    ['an unknown result', (a) => (a.rows[1].result = 'warning'), /"result" is one of/],
    ['a Fail without what to change', (a) => delete a.rows[1].change, /a Fail says what to change/],
    ['a Fail of draft checks only, unanswered', (a) => a.rows.splice(3, 0, { checks: ['AB2'], where: 'x', result: 'fail', note: 'n', change: 'c' }), /draft principle.*"answer"/],
    ['a Draft of checks in force', (a) => (a.rows[3].checks = ['EP4']), /none of these is/],
    ['a gap of the design system without its resolution', (a) => a.rows[0].checks.push('DS1'), /resolution proposed/],
    ['a Not verifiable without what would verify it', (a) => delete a.rows[5].verify, /what would make it verifiable/],
    ['a Not verifiable called a likely pass', (a) => (a.rows[5].estimate = 'likely passes, #222 on white'), /likely pass/],
    ['a Non verificabile "probabilmente superato"', (a) => (a.rows[5].note = 'probabilmente superato'), /likely pass/],
    ['a Pass by choice without its reason', (a) => (a.rows[6].result = 'pass-by-choice'), /the person's reason/],
    ['a Pass without what was looked at', (a) => delete a.rows[6].looked, /what was looked at/],
    ['a Pass of a rendered check rendered.ts did not run', (a) => a.rows[6].checks.push('AB1'), /AB1 is a rendered check and rendered.ts did not run.*never Pass/],
    ['a Pass of a runtime check that did not run', (a) => a.rows[6].checks.push('OM3'), /OM3 is a runtime check and no runtime check ran/],
    ['a Fail after a question', (a) => a.rows.splice(4, 0, { checks: ['EP9'], where: 'x', result: 'fail', note: 'n', change: 'c' }), /row 5 \(EP9\): a Fail after row 4/],
    ['a row after a pass', (a) => a.rows.push({ checks: ['EP12'], where: 'x', result: 'open', note: 'n' }), /row 8 \(EP12\): after row 7, a pass/],
    ['a screenshot that is not there', (a) => (a.rows[0].shots = ['/tmp/missing.png']), /the screenshot \/tmp\/missing.png is not there/],
    ['a start from a row that does not fail', (a) => (a.summary.start[0].row = 5), /summary.start 1: row 5 does not fail/],
    ['a start from a row that does not exist', (a) => (a.summary.start[0].row = 12), /row 12 is not a row/],
    ['four places to start', (a) => (a.summary.start = [1, 2, 3, 1].map((row) => ({ row, why: 'w' }))), /three defects at most/],
    ['no place to start while rows fail', (a) => (a.summary.start = []), /names the defects that weigh most/],
    ['a goal answered with no object model', (a) => (a.summary.goal = { answer: 'yes' }), /no object model.*"no-model"/],
    ['no-model with a model', (a) => (a.model = 'docs/model.md'), /"no-model", but "model" names one/],
    ['after the fixes without the rows', (a) => ((a.model = 'm'), (a.summary.goal = { answer: 'after-fixes' })), /names the rows to fix/],
    ['a citation of a row that does not exist', (a) => (a.summary.beyond = ['see #9']), /cites #9, and the report has 7 rows/],
    ['what ran left out', (a) => delete a.ran, /"ran" says what ran/],
    ['no rows', (a) => (a.rows = []), /"rows" holds the rows/],
  ];
  for (const [name, change, expected] of refused)
    it(`refuses ${name}`, () => {
      const problems = problemsOf(change);
      assert.ok(problems.some((p) => expected.test(p)), problems.join('\n') || 'no problem found');
    });

  it('lets a Pass hold a rendered check when rendered.ts ran, and a runtime one when the page was run', () => {
    const a = sample();
    a.ran = { runtime: 'the page in the browser of the session', rendered: 'rendered.ts at 360 and 1440' };
    a.rows[6].checks.push('AB1', 'EP2');
    ok(a);
  });

  it('lets a code check prove a runtime check fails, and a draft fail with the answer', () => {
    const a = sample();
    a.rows.splice(3, 0, { checks: ['AB2'], where: 'x', result: 'fail', note: 'n', change: 'c', answer: 'defect' });
    ok(a);
  });

  it('lets the check at the end of design-build keep the goal alone', () => {
    const a = sample();
    a.after = 'design-build';
    a.summary = { goal: { answer: 'no-model' } };
    ok(a);
  });
});

/** The regex graders of the eval case, as `claude plugin eval` reads them. */
const grader = (name: string): RegExp => {
  const text = readFileSync(path.join(root, 'evals/audit-project-settings/graders', `${name}.md`), 'utf8');
  return new RegExp(/^pattern: '(.+)'$/m.exec(text)?.[1] ?? 'none', /^flags: (\w+)$/m.exec(text)?.[1] ?? '');
};

describe('the Markdown', () => {
  const audit = ok(sample());
  const md = markdownOf(audit, checks);

  it('says what was audited and how, then the table the skill printed by hand', () => {
    assert.match(md, /^\*\*Audit of `impostazioni.html`\*\*, screen mode: a page people use\. 3 Fail, 2 questions, 1 Not verifiable, 1 Pass\./);
    assert.match(md, /Principles: Error Prevention, Consistency Over Uniformity, Accessibility as a Baseline \(draft\)\. Object model: none\. Runtime checks: not run\. Rendered checks: not run\./);
    assert.match(md, /^\| # \| Checks \| Where \| Result \|$/m);
    assert.match(md, /^\| 1 \| EP1, EP7, CU6 \| `impostazioni.html:30`, the delete \| \*\*Fail\.\*\* A clickable `div`.+\*\*Change:\*\* a `<button>` in the danger style that asks first\. Example: \[Clear Affordances\]\(https:\/\/vittoriovittori.com\/user-centered-design\/error-prevention#clear-affordances\), \[Destructive Action Protection\]\(.+\), \[.+\]\(https:\/\/vittoriovittori.com\/design-systems\/consistency-over-uniformity#.+\)\. \|$/m);
    assert.match(md, /Only a placeholder \\\| no label\./, 'a pipe stays in its cell');
    assert.match(md, /^\| 6 \| AB1, EP12 \| the whole page \| \*\*Not verifiable\.\*\* .+ Estimate from the code: `#222` on white gives about 16:1 by the stylesheet\. To verify: measure it with rendered.ts\. \|$/m);
    assert.match(md, /^\| 7 \| EP3 \| .+ \| \*\*Pass\.\*\* Both have a name\. Looked at: lines 11 and 20\. \|$/m);
  });

  it('closes with the Summary, every point in its place, and the questions', () => {
    assert.match(
      md,
      /### Summary\n\n1\. \*\*Where to start\.\*\*\n {3}- \*\*#1\*\*: the only irreversible action\n {3}- \*\*#2\*\*: it shares data for the person\n2\. \*\*The goal\.\*\* Cannot be checked: the area has no object model\. Write it with `design-interview`\. It needs the focal entity\.\n3\. \*\*What the checks do not cover\.\*\*\n {3}- Opinion: the page never names the project \(see #1\)/,
    );
    assert.match(md, /### Questions for you\n\n- \*\*#4\*\* \(AB2\): The borders give 1\.9:1 by the stylesheet\. Defect or your choice\?\n- \*\*#5\*\* \(EP2\): Is the search a preview\?$/);
  });

  it('passes the regex graders of the eval case', () => {
    for (const name of ['ep1-fail', 'ep3-fail', 'ep14-fail', 'goal-needs-model']) assert.match(md, grader(name), name);
    assert.doesNotMatch(md, grader('no-unrun-pass'));
  });

  it('writes its words in Italian for an Italian audit, and the graders still read it', () => {
    const it = markdownOf(ok({ ...sample(), lang: 'it' }), checks);
    assert.match(it, /^\*\*Audit di `impostazioni.html`\*\*, modalit\u00e0 schermata/);
    assert.match(it, /^\| # \| Check \| Dove \| Risultato \|$/m);
    assert.match(it, /\*\*Cosa cambiare:\*\*/);
    assert.match(it, /\| \*\*Bozza: difetto o scelta\?\*\* The borders/);
    assert.match(it, /### Sintesi\n\n1\. \*\*Da dove partire\.\*\*/);
    assert.match(it, /\*\*L'obiettivo\.\*\* Non si pu\u00f2 verificare: l'area non ha un object model\. Scrivilo con `design-interview`\./);
    assert.match(it, /- Opinione: /);
    for (const name of ['ep1-fail', 'ep3-fail', 'ep14-fail', 'goal-needs-model']) assert.match(it, grader(name), name);
  });

  it('says the goal with a model: after the fixes of the rows named', () => {
    const a = sample();
    a.model = 'docs/model.md, the view Settings';
    a.summary.goal = { answer: 'after-fixes', rows: [1, 3] };
    assert.match(markdownOf(ok(a), checks), /2\. \*\*The goal\.\*\* \*\*Yes, after the fixes\*\* of #1, #3\./);
  });

  it('keeps the Summary to the goal at the end of design-build', () => {
    const a = sample();
    a.after = 'design-build';
    a.summary = { goal: { answer: 'no-model' } };
    const out = markdownOf(ok(a), checks);
    assert.match(out, /### Summary\n\n\*\*The goal\.\*\* Cannot be checked/);
    assert.doesNotMatch(out, /Where to start/);
  });

  it('writes the resolution of a gap of the design system and the answer of a draft', () => {
    const a = sample();
    a.rows[0].checks.push('DS1');
    a.rows[0].resolution = 'design-system-changes';
    a.rows.splice(3, 0, { checks: ['AB2'], where: 'x', result: 'fail', note: 'n', change: 'c', answer: 'a defect, said the person' });
    const out = markdownOf(ok(a), checks);
    assert.match(out, /\*\*Resolution proposed:\*\* the design system changes: an issue on its repository, on your yes\./);
    assert.match(out, /Your answer: a defect, said the person\./);
  });
});

describe('the page', () => {
  const shot = path.join(temp, 'shot.png');
  // a PNG of one white pixel
  writeFileSync(shot, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC', 'base64'));
  const a = sample();
  a.rows[3].shots = [{ file: shot, caption: '360, light' }];
  a.rows[0].note = 'A `<div>` and <script>alert(1)</script>.';
  const audit = ok(a);
  const html = pageOf(audit, checks, { date: '2026-11-27' });

  it('puts the Summary first, then the counts, the filter, the rows and the questions', () => {
    const at = (s: string): number => html.indexOf(s);
    assert.ok(at('id="summary"') > 0);
    assert.ok(at('id="summary"') < at('class="counts"'));
    assert.ok(at('class="counts"') < at('class="filters"'));
    assert.ok(at('class="filters"') < at('id="row-1"'));
    assert.ok(at('id="row-7"') < at('Questions for you'));
  });

  it('counts the rows by result, each count a filter where scripts run', () => {
    assert.match(html, /<div class="count tone-fail" data-value="fail"><b>3<\/b>Fail<\/div>/);
    assert.match(html, /<div class="count tone-question" data-value="question"><b>2<\/b>Questions<\/div>/);
    assert.match(html, /<div class="count tone-pass" data-value="pass"><b>1<\/b>Pass<\/div>/);
    assert.match(html, /<div class="filters" hidden>/, 'the filter shows only where its script runs');
    assert.match(html, /data-filter="principle" data-value="error-prevention">Error Prevention</);
    assert.match(html, /data-filter="principle" data-value="accessibility-as-a-baseline">Accessibility as a Baseline</);
    assert.match(html, /id="row-1" data-group="fail" data-principles="error-prevention consistency-over-uniformity"/);
  });

  it('links the rows the Summary cites, and says which points are opinions', () => {
    assert.match(html, /<a class="cite" href="#row-1">#1<\/a><\/strong>: the only irreversible action/);
    assert.match(html, /<span class="opinion">Opinion<\/span> the page never names the project \(see <a class="cite" href="#row-1">#1<\/a>\)/);
    assert.match(html, /Write it with <code>design-interview<\/code>/);
  });

  it('shows each check with its level, the example of a failed rule, and the screenshot beside its row', () => {
    assert.match(html, /<span class="check" title="Error Prevention, Clear Affordances: must, code">EP1 <small>code<\/small><\/span>/);
    assert.match(html, /<dt>Example<\/dt><dd><a href="https:\/\/vittoriovittori.com\/user-centered-design\/error-prevention#clear-affordances">Clear Affordances<\/a>/);
    assert.match(html, /<article class="row tone-question has-shots" id="row-4"[\s\S]*?<img src="data:image\/png;base64,iVBOR[^"]+" alt="360, light"/);
  });

  it('escapes what the audit says, keeps its code, and holds the facts', () => {
    assert.match(html, /A <code>&lt;div&gt;<\/code> and &lt;script&gt;alert\(1\)&lt;\/script&gt;\./);
    assert.doesNotMatch(html, /<script>alert/);
    const facts = /<script type="application\/json" id="facts">(.+?)<\/script>/.exec(html)?.[1] ?? '';
    assert.doesNotMatch(facts, /</);
    assert.equal(JSON.parse(facts).rows.length, 7);
  });

  it('is in the language of the audit, with the shell of every report page', () => {
    const it = pageOf(ok({ ...sample(), lang: 'it' }), checks, { date: '2026-11-27' });
    assert.match(it, /<html lang="it">/);
    assert.match(it, /<title>Audit di impostazioni.html<\/title>/);
    assert.match(it, /<h2 id="summary-title">Sintesi<\/h2>/);
    assert.match(it, /:root\[data-theme="dark"\]/);
    assert.match(it, /@media \(max-width: 640px\)/);
  });

  it('holds a screenshot inside itself while its budget lasts, then links it by its path', () => {
    const source = shotSource(Math.ceil(readFileSync(shot).length * 1.37) + 1);
    assert.equal(source(shot).embedded, true);
    assert.equal(source(shot).embedded, false);
    assert.equal(source(shot).src, `file://${shot}`);
  });
});

describe('rich text', () => {
  it('reads `code`, **bold**, links and #n', () => {
    assert.equal(rich('`a<b` **c** [d](https://e.f/g?h=1&i=2) #2 #9', 3), '<code>a&lt;b</code> <strong>c</strong> <a href="https://e.f/g?h=1&amp;i=2">d</a> <a class="cite" href="#row-2">#2</a> #9');
    assert.equal(rich("[x](javascript:alert(1)) it's #1", 3), '[x](javascript:alert(1)) it&#39;s <a class="cite" href="#row-1">#1</a>');
    assert.equal(rich('`#1` and a#1', 3), '<code>#1</code> and a#1');
  });
});

describe('the command', () => {
  const run = (args: string[], input?: string) =>
    spawnSync('node', [AUDIT, ...args], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

  it('reads the audit from stdin, prints the report and writes the page', () => {
    const html = path.join(temp, 'audit.html');
    const result = run(['-', `--html=${html}`], JSON.stringify(sample()));
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^\*\*Audit of `impostazioni.html`\*\*/);
    assert.match(result.stdout, /\nThe page: .+audit\.html\n$/);
    assert.ok(existsSync(html));
    assert.match(readFileSync(html, 'utf8'), /^<!doctype html>/);
  });

  it('reads it from a file too', () => {
    const file = path.join(temp, 'audit.json');
    writeFileSync(file, JSON.stringify(sample()));
    const result = run([file]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\| 7 \| EP3 \|/);
  });

  it('refuses an audit with every problem, printing no report and writing no page', () => {
    const a = sample();
    a.rows[6].checks.push('AB1');
    delete a.rows[0].change;
    const html = path.join(temp, 'refused.html');
    const result = run(['-', `--html=${html}`], JSON.stringify(a));
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^The audit is refused, nothing was written/);
    assert.match(result.stderr, /row 1 \(EP1, EP7, CU6\): a Fail says what to change/);
    assert.match(result.stderr, /row 7 \(EP3, AB1\): AB1 is a rendered check/);
    assert.ok(!existsSync(html));
  });

  it('says what is wrong with JSON that does not parse, and how to call it without one', () => {
    const bad = run(['-'], '{ "target": ');
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /^The audit was not read: /);
    const none = run([]);
    assert.equal(none.status, 2);
    assert.match(none.stderr, /^Usage: node scripts\/audit.ts <audit.json \| ->/);
  });
});

