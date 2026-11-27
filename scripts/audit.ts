/*
  The report of /v2:design-audit: a row per problem, merged by place, every check as pass, fail
  or not verifiable, then the Summary of where to start. The skill writes the facts as JSON; this
  checks what it can, prints the Markdown the skill shows in the chat and, with --html, writes the
  page, to keep open while fixing.

    node scripts/audit.ts <audit.json | -> [--html=<file>] [--root=<plugin folder>]
        print the report in Markdown: what was audited and how, the table (#, checks, where,
        result), the Summary, the questions for the person; `-` reads the JSON from stdin
        --html=<file>  also write the page: the Summary first, the counts by result, a filter by
                       result and by principle, the screenshots beside their rows, the rows the
                       Summary cites linked from it
        --root=<dir>   the plugin whose checks to read; the folder of this script's plugin by
                       default

  The audit, as JSON (the texts in the person's language):

    {
      "target": "src/pages/settings.html",
      "mode": "screen" | "component",
      "why": "why this mode, in one line",                                     (optional)
      "lang": "en" | "it",          (the words this script writes; en by default)
      "model": "docs/object-model.md, the view Settings" | null,     (null: the area has none)
      "ran": {
        "runtime": "the page opened and acted on, and where" | null,      (null: not run)
        "rendered": "the folder of rendered.ts, its widths and themes" | null
      },
      "after": "design-build" | "design-reframe",   (optional: the check at the end of one of
                                                     them, whose Summary may be the goal alone)
      "rows": [{
        "checks": ["EP1", "CU6"],           (every check id that caught this problem)
        "where": "settings.html:30, the delete",
        "result": "fail" | "draft" | "open" | "not-verifiable" | "pass-by-choice" | "pass",
        "note": "what the row found: the problem, the question, or what passes",
        "change": "what to change",                                         (fail: required)
        "answer": "the person's answer, defect",              (fail of draft checks: required)
        "resolution": "method-adapts" | "design-system-changes" | "product-decides",
                                                         (a gap of DS1 that fails: required)
        "verify": "what would make it verifiable",                (not-verifiable: required)
        "estimate": "what the code gives, to confirm",            (not-verifiable: optional)
        "reason": "the person's reason, or the exception of the model",
                                                                  (pass-by-choice: required)
        "question": "the question for the person",                 (draft, open: optional)
        "looked": "what was looked at: the code read, the page, the screenshot",
                                                            (pass: required; else optional)
        "shots": ["/tmp/r/360-light.png", { "file": "/tmp/r/1440-dark.png", "caption": "1440, dark" }]
      }],
      "summary": {
        "start": [{ "row": 1, "why": "why it weighs on the goal, in a few words" }],
        "goal": { "answer": "yes" | "after-fixes" | "rethink" | "no-model", "rows": [1, 3], "note": "..." },
        "beyond": ["what you saw that no check asks about"]          (each one an opinion)
      }
    }

  A row is numbered by its place in "rows", and the Summary cites it so (`#3`).

  What it refuses, every problem with its row, printing nothing (exit 1): a key it does not know,
  a check id no principle has, a field a result needs left out, a fail after a row that is not a
  fail or a row after a pass (defects first, passes last), a Pass on a runtime check when no
  runtime check ran or on a rendered one when rendered.ts did not run, a Not verifiable that
  calls itself a likely pass, a Fail whose every check is of a draft without the person's answer,
  a screenshot that is not there, a Summary that starts from a row that does not fail or cites a
  row that does not exist, a goal answered without the object model it needs.

  Where each answer comes from:

  - a check, its principle, its strength, its level, whether it is a draft, its rule and the
    example of the rule: the principles of the plugin (`principles/<section>/<id>.md`: the line
    `**EP1** . must . code.` under the `### ` title of its rule, `status: draft`, and `site`
    plus `#` plus the rule title as a slug, as principles/README.md says), the OM checks of
    skills/design-audit/SKILL.md (section 2b) and DS1 of docs/design-system.md;
  - the result a check may have: its level, as skills/design-audit/SKILL.md says (section 3): a
    `runtime` or `rendered` check that did not run is Not verifiable, never a pass; what ran is
    what "ran" says, the one claim this script cannot check, so the report shows it;
  - the order of the rows and what each result needs: skills/design-audit/SKILL.md, section 4;
  - everything else: the JSON given. Nothing is guessed here.
*/
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isMain, parseArgs } from './lib/args.ts';
import { cell, table } from './lib/markdown.ts';
import { escapeHtml, page } from './lib/page.ts';

export const RESULTS = ['fail', 'draft', 'open', 'not-verifiable', 'pass-by-choice', 'pass'] as const;
export const LEVELS = ['code', 'runtime', 'rendered'] as const;
export const GOALS = ['yes', 'after-fixes', 'rethink', 'no-model'] as const;
export const RESOLUTIONS = ['method-adapts', 'design-system-changes', 'product-decides'] as const;
export const LANGS = ['en', 'it'] as const;

export type Result = (typeof RESULTS)[number];
export type Level = (typeof LEVELS)[number];
export type GoalAnswer = (typeof GOALS)[number];
export type Resolution = (typeof RESOLUTIONS)[number];
export type Lang = (typeof LANGS)[number];

/** A check of the principles, of the object model or of the design system. */
export interface Check {
  id: string;
  strength: 'must' | 'should';
  level: Level;
  /** The id of its principle: `error-prevention`, or `object-model`, `design-system`. */
  principle: string;
  /** The title of its principle. */
  title: string;
  draft: boolean;
  /** The title of its rule, when it has one. */
  rule?: string;
  /** The example of its rule on the site: `site#<rule as a slug>`. */
  example?: string;
}

export interface Shot {
  file: string;
  caption?: string;
}

export interface Row {
  checks: string[];
  where: string;
  result: Result;
  note: string;
  change?: string;
  answer?: string;
  resolution?: Resolution;
  verify?: string;
  estimate?: string;
  reason?: string;
  question?: string;
  looked?: string;
  shots: Shot[];
}

export interface Summary {
  start: { row: number; why: string }[];
  goal: { answer: GoalAnswer; rows: number[]; note?: string };
  beyond: string[];
}

export interface Audit {
  target: string;
  mode: 'screen' | 'component';
  why?: string;
  lang: Lang;
  model: string | null;
  ran: { runtime: string | null; rendered: string | null };
  after?: 'design-build' | 'design-reframe';
  rows: Row[];
  summary: Summary;
}

// ---------------------------------------------------------------------------------------------
// The checks, from where they are written

/** A rule title as the anchor of its example: lowercase, every run of other characters a `-`. */
export const slug = (title: string): string => title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** `**EP1** . must . code.`, the dots being middle dots, as the principles write a check. */
const CHECK_LINE = /^\*\*([A-Z]{2,3}\d+)\*\* \u00b7 (must|should) \u00b7 (code|runtime|rendered)\./;

/** The plain `key: value` lines of a frontmatter; its lists are skipped. */
const fieldsOf = (text: string): Record<string, string> => {
  const block = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
  const fields: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const match = /^([a-z_]+):[ \t]+(.+?)\s*$/.exec(line);
    if (match) fields[match[1]] = match[2].replace(/\s+#.*$/, '').replace(/^(['"])(.*)\1$/, '$2');
  }
  return fields;
};

/** The checks of one principle file. */
export const checksOfPrinciple = (text: string): Check[] => {
  const fields = fieldsOf(text);
  const out: Check[] = [];
  let rule: string | undefined;
  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) rule = line.slice(4).trim();
    else if (line.startsWith('## ')) rule = undefined;
    const match = CHECK_LINE.exec(line);
    if (!match) continue;
    out.push({
      id: match[1],
      strength: match[2] as Check['strength'],
      level: match[3] as Level,
      principle: fields.id ?? '',
      title: fields.title ?? fields.id ?? '',
      draft: fields.status === 'draft',
      ...(rule ? { rule } : {}),
      ...(rule && fields.site ? { example: `${fields.site}#${slug(rule)}` } : {}),
    });
  }
  return out;
};

/** The OM checks of the skill: `- OM1 (must, rendered): ...`. */
export const checksOfModel = (skill: string): Check[] =>
  [...skill.matchAll(/^- (OM\d+) \((must|should), (code|runtime|rendered)\)/gm)].map((match) => ({
    id: match[1],
    strength: match[2] as Check['strength'],
    level: match[3] as Level,
    principle: 'object-model',
    title: 'Object model',
    draft: false,
  }));

/** DS1, as docs/design-system.md writes it. */
export const checksOfDesignSystem = (text: string): Check[] =>
  text
    .split('\n')
    .map((line) => CHECK_LINE.exec(line))
    .filter((match): match is RegExpExecArray => !!match)
    .map((match) => ({
      id: match[1],
      strength: match[2] as Check['strength'],
      level: match[3] as Level,
      principle: 'design-system',
      title: 'Design system',
      draft: false,
    }));

/** Every check the audit can name, by id, from the plugin at `root`. */
export const readChecks = (root: string): Map<string, Check> => {
  const checks = new Map<string, Check>();
  const add = (list: Check[]): void => {
    for (const check of list) if (!checks.has(check.id)) checks.set(check.id, check);
  };
  const principles = path.join(root, 'principles');
  for (const section of readdirSync(principles, { withFileTypes: true }).filter((e) => e.isDirectory()))
    for (const file of readdirSync(path.join(principles, section.name)).filter((f) => f.endsWith('.md')).sort())
      add(checksOfPrinciple(readFileSync(path.join(principles, section.name, file), 'utf8')));
  const skill = path.join(root, 'skills', 'design-audit', 'SKILL.md');
  if (existsSync(skill)) add(checksOfModel(readFileSync(skill, 'utf8')));
  const ds = path.join(root, 'docs', 'design-system.md');
  if (existsSync(ds)) add(checksOfDesignSystem(readFileSync(ds, 'utf8')));
  return checks;
};

// ---------------------------------------------------------------------------------------------
// The audit, read and checked

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

const ROW_KEYS = ['checks', 'where', 'result', 'note', 'change', 'answer', 'resolution', 'verify', 'estimate', 'reason', 'question', 'looked', 'shots'];
const TOP_KEYS = ['target', 'mode', 'why', 'lang', 'model', 'ran', 'after', 'rows', 'summary'];

/** Where each result goes: fails first, passes last (skills/design-audit/SKILL.md, section 4). */
const PLACE: Record<Result, number> = { fail: 0, draft: 1, open: 1, 'not-verifiable': 1, 'pass-by-choice': 2, pass: 2 };

/** A Not verifiable that calls itself a likely pass, in English or Italian. */
const LIKELY_PASS = /\b(?:likely|probabl[a-z]*|would|should)\s+(?:a\s+)?pass|\bprobabil[a-z]*\s+(?:un\s+)?(?:pass|superat)/i;

/**
 * The audit given, as the report needs it, and every problem found in it. `exists` says whether
 * a screenshot is there. When there is a problem, the audit is not to be drawn.
 */
export const validate = (
  value: unknown,
  checks: Map<string, Check>,
  exists: (file: string) => boolean = existsSync,
): { audit: Audit; problems: string[] } => {
  const problems: string[] = [];
  const v = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  if (v !== value) problems.push('the audit is a JSON object');
  for (const key of Object.keys(v)) if (!TOP_KEYS.includes(key)) problems.push(`unknown key "${key}"`);
  if (!isText(v.target)) problems.push('"target", what was audited, is missing');
  if (v.mode !== 'screen' && v.mode !== 'component') problems.push('"mode" is "screen" or "component"');
  if (v.lang !== undefined && !LANGS.includes(v.lang as Lang)) problems.push(`"lang" is ${LANGS.join(' or ')}, or absent`);
  if (v.model !== null && !isText(v.model)) problems.push('"model" names the object model of the area, or is null when it has none');
  if (v.after !== undefined && v.after !== 'design-build' && v.after !== 'design-reframe') problems.push('"after" is "design-build" or "design-reframe", or absent');
  const ranRaw = (v.ran && typeof v.ran === 'object' ? v.ran : {}) as Record<string, unknown>;
  if (!v.ran || typeof v.ran !== 'object') problems.push('"ran" says what ran: { "runtime": ... | null, "rendered": ... | null }');
  for (const key of Object.keys(ranRaw)) if (key !== 'runtime' && key !== 'rendered') problems.push(`unknown key "ran.${key}"`);
  for (const key of ['runtime', 'rendered'])
    if (ranRaw[key] !== null && !isText(ranRaw[key])) problems.push(`"ran.${key}" says what ran and where, or is null when it did not run`);
  const ran = { runtime: isText(ranRaw.runtime) ? ranRaw.runtime : null, rendered: isText(ranRaw.rendered) ? ranRaw.rendered : null };

  const rowsRaw = Array.isArray(v.rows) ? v.rows : [];
  if (!Array.isArray(v.rows) || !rowsRaw.length) problems.push('"rows" holds the rows of the report, at least one');
  const rows: Row[] = rowsRaw.map((raw, i) => {
    const n = i + 1;
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const ids = Array.isArray(r.checks) ? r.checks.filter(isText).map((id) => id.trim()) : [];
    const at = `row ${n}${ids.length ? ` (${ids.join(', ')})` : ''}`;
    for (const key of Object.keys(r)) if (!ROW_KEYS.includes(key)) problems.push(`${at}: unknown key "${key}"`);
    if (!ids.length || ids.length !== (r.checks as unknown[]).length) problems.push(`${at}: "checks" lists the check ids that caught it, at least one`);
    if (!isText(r.where)) problems.push(`${at}: "where" is missing`);
    if (!RESULTS.includes(r.result as Result)) problems.push(`${at}: "result" is one of ${RESULTS.join(', ')}`);
    if (!isText(r.note)) problems.push(`${at}: "note", what the row found, is missing`);
    for (const key of ['change', 'answer', 'verify', 'estimate', 'reason', 'question', 'looked'])
      if (r[key] !== undefined && !isText(r[key])) problems.push(`${at}: "${key}" is a text`);
    if (r.resolution !== undefined && !RESOLUTIONS.includes(r.resolution as Resolution))
      problems.push(`${at}: "resolution" is one of ${RESOLUTIONS.join(', ')}`);
    const shots: Shot[] = [];
    if (r.shots !== undefined && !Array.isArray(r.shots)) problems.push(`${at}: "shots" is a list of files`);
    for (const shot of Array.isArray(r.shots) ? r.shots : []) {
      const s = typeof shot === 'string' ? { file: shot } : ((shot && typeof shot === 'object' ? shot : {}) as Record<string, unknown>);
      if (!isText(s.file)) problems.push(`${at}: a screenshot names its "file"`);
      else if (!exists(s.file)) problems.push(`${at}: the screenshot ${s.file} is not there; a seen check without its screenshot is not verifiable`);
      else shots.push({ file: s.file, ...(isText(s.caption) ? { caption: s.caption } : {}) });
    }
    const text = (key: string): string | undefined => (isText(r[key]) ? (r[key] as string).trim() : undefined);
    return {
      checks: ids,
      where: text('where') ?? '',
      result: (RESULTS.includes(r.result as Result) ? r.result : 'open') as Result,
      note: text('note') ?? '',
      ...Object.fromEntries(
        ['change', 'answer', 'verify', 'estimate', 'reason', 'question', 'looked'].filter((k) => text(k)).map((k) => [k, text(k)]),
      ),
      ...(RESOLUTIONS.includes(r.resolution as Resolution) ? { resolution: r.resolution as Resolution } : {}),
      shots,
    };
  });

  // each row against the rules of its result and the levels of its checks
  rows.forEach((row, i) => {
    const n = i + 1;
    const at = `row ${n} (${row.checks.join(', ')})`;
    const known = row.checks.map((id) => checks.get(id)).filter((c): c is Check => !!c);
    for (const id of row.checks)
      if (!checks.has(id)) problems.push(`${at}: ${id} is no check of the principles, of the object model (OM) or of the design system (DS1)`);
    switch (row.result) {
      case 'fail':
        if (!row.change) problems.push(`${at}: a Fail says what to change ("change")`);
        if (known.length && known.every((c) => c.draft) && !row.answer)
          problems.push(`${at}: every check here is of a draft principle, so it is a question ("draft"), defect or choice, until the person answers; a Fail carries their answer ("answer")`);
        if (row.checks.includes('DS1') && !row.resolution)
          problems.push(`${at}: a gap of the design system carries the resolution proposed ("resolution": ${RESOLUTIONS.join(', ')})`);
        break;
      case 'draft':
        if (known.length && !known.some((c) => c.draft)) problems.push(`${at}: "draft" is the question of a check of a draft principle, and none of these is`);
        break;
      case 'not-verifiable':
        if (!row.verify) problems.push(`${at}: a Not verifiable says what would make it verifiable ("verify")`);
        if ([row.note, row.estimate, row.verify].some((t) => t && LIKELY_PASS.test(t)))
          problems.push(`${at}: a Not verifiable never calls itself a likely pass; write the estimate as what to confirm`);
        break;
      case 'pass-by-choice':
        if (!row.reason) problems.push(`${at}: a Pass by choice carries the person's reason, or the exception of the model ("reason")`);
        break;
      case 'pass':
        if (!row.looked) problems.push(`${at}: a Pass says what was looked at ("looked")`);
        for (const check of known) {
          if (check.level === 'runtime' && !ran.runtime)
            problems.push(`${at}: ${check.id} is a runtime check and no runtime check ran ("ran.runtime" is null): it is Not verifiable, never Pass; give it a Not verifiable row of its own, with the estimate and what would verify it`);
          if (check.level === 'rendered' && !ran.rendered)
            problems.push(`${at}: ${check.id} is a rendered check and rendered.ts did not run ("ran.rendered" is null): it is Not verifiable, never Pass; give it a Not verifiable row of its own, with the estimate and what would verify it`);
        }
        break;
      default:
        break;
    }
    if (i > 0) {
      const before = rows[i - 1];
      if (PLACE[row.result] < PLACE[before.result])
        problems.push(
          row.result === 'fail'
            ? `${at}: a Fail after row ${n - 1}, which is not one; the defects come first`
            : `${at}: after row ${n - 1}, a pass; the passes come last`,
        );
    }
  });

  // the Summary
  const s = (v.summary && typeof v.summary === 'object' ? v.summary : {}) as Record<string, unknown>;
  if (!v.summary || typeof v.summary !== 'object') problems.push('"summary" is missing: { "start", "goal", "beyond" }');
  for (const key of Object.keys(s)) if (!['start', 'goal', 'beyond'].includes(key)) problems.push(`unknown key "summary.${key}"`);
  const fails = new Set(rows.flatMap((row, i) => (row.result === 'fail' ? [i + 1] : [])));
  const startRaw = Array.isArray(s.start) ? s.start : [];
  if (s.start !== undefined && !Array.isArray(s.start)) problems.push('"summary.start" is a list');
  const start = startRaw.map((item, i) => {
    const it = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const row = Number(it.row);
    if (!fails.has(row))
      problems.push(`summary.start ${i + 1}: row ${JSON.stringify(it.row)} ${Number.isInteger(row) && row >= 1 && row <= rows.length ? 'does not fail' : 'is not a row'}; where to start names the defects (Fail) that weigh most`);
    if (!isText(it.why)) problems.push(`summary.start ${i + 1}: "why" it weighs on the goal, in a few words`);
    return { row, why: isText(it.why) ? it.why.trim() : '' };
  });
  if (start.length > 3) problems.push('summary.start names three defects at most');
  if (fails.size && !start.length && !v.after) problems.push('summary.start names the defects that weigh most: rows fail, and it names none');
  const g = (s.goal && typeof s.goal === 'object' ? s.goal : {}) as Record<string, unknown>;
  for (const key of Object.keys(g)) if (!['answer', 'rows', 'note'].includes(key)) problems.push(`unknown key "summary.goal.${key}"`);
  const answer = (GOALS.includes(g.answer as GoalAnswer) ? g.answer : 'no-model') as GoalAnswer;
  if (!GOALS.includes(g.answer as GoalAnswer)) problems.push(`summary.goal.answer is one of ${GOALS.join(', ')}`);
  else if (v.model === null && answer !== 'no-model')
    problems.push('summary.goal: the area has no object model ("model" is null), so the goal cannot be checked: "no-model"');
  else if (isText(v.model) && answer === 'no-model') problems.push('summary.goal: "no-model", but "model" names one');
  const goalRows = Array.isArray(g.rows) ? g.rows.map(Number) : [];
  if (g.rows !== undefined && !Array.isArray(g.rows)) problems.push('summary.goal.rows is a list of row numbers');
  if (answer === 'after-fixes') {
    if (!goalRows.length) problems.push('summary.goal: "after-fixes" names the rows to fix ("rows")');
    for (const row of goalRows) if (!fails.has(row)) problems.push(`summary.goal.rows: row ${row} does not fail`);
  }
  if (g.note !== undefined && !isText(g.note)) problems.push('summary.goal.note is a text');
  const beyondRaw = Array.isArray(s.beyond) ? s.beyond : [];
  if (s.beyond !== undefined && !Array.isArray(s.beyond)) problems.push('"summary.beyond" is a list of texts');
  if (beyondRaw.some((b) => !isText(b))) problems.push('"summary.beyond" is a list of texts');
  const beyond = beyondRaw.filter(isText).map((b) => b.trim());
  const note = isText(g.note) ? g.note.trim() : undefined;
  for (const text of [...start.map((x) => x.why), note ?? '', ...beyond])
    for (const match of text.matchAll(/(?:^|[^\w&])#(\d+)\b/g)) {
      const row = Number(match[1]);
      if (row < 1 || row > rows.length) problems.push(`the Summary cites #${row}, and the report has ${rows.length} rows`);
    }

  const audit: Audit = {
    target: isText(v.target) ? v.target.trim() : '',
    mode: v.mode === 'component' ? 'component' : 'screen',
    ...(isText(v.why) ? { why: v.why.trim() } : {}),
    lang: v.lang === 'it' ? 'it' : 'en',
    model: isText(v.model) ? v.model.trim() : null,
    ran,
    ...(v.after === 'design-build' || v.after === 'design-reframe' ? { after: v.after } : {}),
    rows,
    summary: { start, goal: { answer, rows: goalRows, ...(note ? { note } : {}) }, beyond },
  };
  return { audit, problems: [...new Set(problems)] };
};

// ---------------------------------------------------------------------------------------------
// The words this script writes, in the person's language

const WORDS = {
  en: {
    audit: 'Audit of',
    mode: { screen: 'screen mode', component: 'component mode' },
    principles: 'Principles',
    draft: 'draft',
    model: 'Object model',
    none: 'none',
    runtime: 'Runtime checks',
    rendered: 'Rendered checks',
    notRun: 'not run',
    head: ['#', 'Checks', 'Where', 'Result'],
    result: {
      fail: 'Fail',
      draft: 'Draft: defect or choice?',
      open: 'Open question',
      'not-verifiable': 'Not verifiable',
      'pass-by-choice': 'Pass by choice',
      pass: 'Pass',
    } as Record<Result, string>,
    group: { fail: 'Fail', question: 'Questions', 'not-verifiable': 'Not verifiable', pass: 'Pass' } as Record<Group, string>,
    change: 'Change',
    answer: 'Your answer',
    resolution: 'Resolution proposed',
    resolutions: {
      'method-adapts': 'the method adapts: rebuilt with what the design system has',
      'design-system-changes': 'the design system changes: an issue on its repository, on your yes',
      'product-decides': "the product decides: it stays in the product's own pattern layer",
    } as Record<Resolution, string>,
    verify: 'To verify',
    estimate: 'Estimate from the code',
    reason: 'Reason',
    question: 'Question',
    looked: 'Looked at',
    example: 'Example',
    summary: 'Summary',
    start: 'Where to start.',
    noStart: 'Nothing fails.',
    goal: 'The goal.',
    goals: {
      yes: '**Yes**: the view does what it exists for.',
      'after-fixes': '**Yes, after the fixes** of',
      rethink: '**No, to rethink**: `design-reframe` takes it from here.',
      'no-model': 'Cannot be checked: the area has no object model. Write it with `design-interview`.',
    } as Record<GoalAnswer, string>,
    beyond: 'What the checks do not cover.',
    nothingBeyond: 'Nothing beyond the checks.',
    opinion: 'Opinion',
    questions: 'Questions for you',
    defectOrChoice: 'Defect or your choice?',
    counts: (counts: Record<Group, number>): string =>
      [
        counts.fail && `${counts.fail} Fail`,
        counts.question && `${counts.question} ${counts.question === 1 ? 'question' : 'questions'}`,
        counts['not-verifiable'] && `${counts['not-verifiable']} Not verifiable`,
        counts.pass && `${counts.pass} Pass`,
      ]
        .filter(Boolean)
        .join(', '),
    all: 'All',
    byResult: 'Result',
    byPrinciple: 'Principle',
    shown: (n: number, of: number): string => (n === of ? `${of} rows` : `${n} of ${of} rows`),
    drawn: 'Drawn on',
    from: 'by <code>scripts/audit.ts</code> from the facts the audit wrote; the checks, their levels and the examples from the principles of the plugin.',
    zoom: 'Click a screenshot to enlarge it.',
  },
  it: {
    audit: 'Audit di',
    mode: { screen: 'modalit\u00e0 schermata', component: 'modalit\u00e0 componente' },
    principles: 'Principi',
    draft: 'bozza',
    model: 'Object model',
    none: 'nessuno',
    runtime: 'Check runtime',
    rendered: 'Check rendered',
    notRun: 'non eseguiti',
    head: ['#', 'Check', 'Dove', 'Risultato'],
    result: {
      fail: 'Fail',
      draft: 'Bozza: difetto o scelta?',
      open: 'Domanda aperta',
      'not-verifiable': 'Non verificabile',
      'pass-by-choice': 'Pass per scelta',
      pass: 'Pass',
    } as Record<Result, string>,
    group: { fail: 'Fail', question: 'Domande', 'not-verifiable': 'Non verificabili', pass: 'Pass' } as Record<Group, string>,
    change: 'Cosa cambiare',
    answer: 'La tua risposta',
    resolution: 'Risoluzione proposta',
    resolutions: {
      'method-adapts': 'si adatta il metodo: si ricostruisce con quello che il design system ha',
      'design-system-changes': 'cambia il design system: una issue sul suo repository, con il tuo s\u00ec',
      'product-decides': 'decide il prodotto: resta nel livello di pattern del prodotto',
    } as Record<Resolution, string>,
    verify: 'Per verificarlo',
    estimate: 'Stima dal codice',
    reason: 'Motivo',
    question: 'Domanda',
    looked: 'Visto',
    example: 'Esempio',
    summary: 'Sintesi',
    start: 'Da dove partire.',
    noStart: 'Non fallisce niente.',
    goal: "L'obiettivo.",
    goals: {
      yes: '**S\u00ec**: la vista fa quello per cui esiste.',
      'after-fixes': '**S\u00ec, dopo le correzioni** di',
      rethink: '**No, da ripensare**: prosegue `design-reframe`.',
      'no-model': "Non si pu\u00f2 verificare: l'area non ha un object model. Scrivilo con `design-interview`.",
    } as Record<GoalAnswer, string>,
    beyond: 'Cosa i check non coprono.',
    nothingBeyond: 'Niente oltre i check.',
    opinion: 'Opinione',
    questions: 'Le domande per te',
    defectOrChoice: 'Difetto o scelta tua?',
    counts: (counts: Record<Group, number>): string =>
      [
        counts.fail && `${counts.fail} Fail`,
        counts.question && `${counts.question} ${counts.question === 1 ? 'domanda' : 'domande'}`,
        counts['not-verifiable'] && `${counts['not-verifiable']} ${counts['not-verifiable'] === 1 ? 'non verificabile' : 'non verificabili'}`,
        counts.pass && `${counts.pass} Pass`,
      ]
        .filter(Boolean)
        .join(', '),
    all: 'Tutti',
    byResult: 'Risultato',
    byPrinciple: 'Principio',
    shown: (n: number, of: number): string => (n === of ? `${of} righe` : `${n} di ${of} righe`),
    drawn: 'Disegnata il',
    from: "da <code>scripts/audit.ts</code> con i fatti scritti dall'audit; i check, i loro livelli e gli esempi dai principi del plugin.",
    zoom: 'Clicca uno screenshot per ingrandirlo.',
  },
};

type Words = (typeof WORDS)['en'];

/** The four groups the counts and the filter show. */
export type Group = 'fail' | 'question' | 'not-verifiable' | 'pass';
export const GROUP_OF: Record<Result, Group> = {
  fail: 'fail',
  draft: 'question',
  open: 'question',
  'not-verifiable': 'not-verifiable',
  'pass-by-choice': 'pass',
  pass: 'pass',
};

export const countsOf = (audit: Audit): Record<Group, number> => {
  const counts: Record<Group, number> = { fail: 0, question: 0, 'not-verifiable': 0, pass: 0 };
  for (const row of audit.rows) counts[GROUP_OF[row.result]] += 1;
  return counts;
};

/** The principles the rows name, in the order they first appear. */
export const principlesOf = (audit: Audit, checks: Map<string, Check>): Check[] => {
  const seen = new Map<string, Check>();
  for (const row of audit.rows)
    for (const id of row.checks) {
      const check = checks.get(id);
      if (check && !seen.has(check.principle)) seen.set(check.principle, check);
    }
  return [...seen.values()];
};

/** The examples of the rules a row fails, each once. */
const examplesOf = (row: Row, checks: Map<string, Check>): { rule: string; url: string }[] => {
  const out = new Map<string, string>();
  for (const id of row.checks) {
    const check = checks.get(id);
    if (check?.example && check.rule && !out.has(check.example)) out.set(check.example, check.rule);
  }
  return [...out].map(([url, rule]) => ({ rule, url }));
};

const sentence = (text: string): string => (/[.!?:)]$/.test(text) ? text : `${text}.`);

// ---------------------------------------------------------------------------------------------
// Markdown

/** The Result cell of a row: the result, what it found, and what its result needs. */
export const resultCell = (row: Row, checks: Map<string, Check>, w: Words): string => {
  const parts = [`**${sentence(w.result[row.result])}**`, sentence(row.note)];
  if (row.result === 'fail') {
    if (row.change) parts.push(`**${w.change}:** ${sentence(row.change)}`);
    if (row.resolution) parts.push(`**${w.resolution}:** ${w.resolutions[row.resolution]}.`);
    if (row.answer) parts.push(`${w.answer}: ${sentence(row.answer)}`);
    const examples = examplesOf(row, checks);
    if (examples.length) parts.push(`${w.example}: ${examples.map((e) => `[${e.rule}](${e.url})`).join(', ')}.`);
  }
  if (row.result === 'not-verifiable') {
    if (row.estimate) parts.push(`${w.estimate}: ${sentence(row.estimate)}`);
    if (row.verify) parts.push(`${w.verify}: ${sentence(row.verify)}`);
  }
  if (row.result === 'pass-by-choice' && row.reason) parts.push(`${w.reason}: ${sentence(row.reason)}`);
  if (row.result === 'pass' && row.looked) parts.push(`${w.looked}: ${sentence(row.looked)}`);
  return cell(parts.join(' '));
};

/** What the report prints: what was audited and how, the table, the Summary, the questions. */
export const markdownOf = (audit: Audit, checks: Map<string, Check>): string => {
  const w = WORDS[audit.lang];
  const principles = principlesOf(audit, checks)
    .filter((c) => c.principle !== 'object-model' && c.principle !== 'design-system')
    .map((c) => (c.draft ? `${c.title} (${w.draft})` : c.title));
  const lines = [
    `**${w.audit} \`${audit.target}\`**, ${w.mode[audit.mode]}${audit.why ? `: ${audit.why.replace(/\.$/, '')}` : ''}. ${w.counts(countsOf(audit))}.`,
    '',
    [
      principles.length ? `${w.principles}: ${principles.join(', ')}.` : '',
      `${w.model}: ${audit.model ?? w.none}.`,
      `${w.runtime}: ${audit.ran.runtime ?? w.notRun}.`,
      `${w.rendered}: ${audit.ran.rendered ?? w.notRun}.`,
    ]
      .filter(Boolean)
      .map((t) => t.replace(/\.\.$/, '.'))
      .join(' '),
    '',
    ...table(
      w.head,
      audit.rows.map((row, i) => [String(i + 1), row.checks.join(', '), cell(row.where), resultCell(row, checks, w)]),
    ),
    '',
    `### ${w.summary}`,
    '',
  ];
  const { start, goal, beyond } = audit.summary;
  const short = !!audit.after && !start.length && !beyond.length;
  if (!short) {
    lines.push(`1. **${w.start}**${start.length ? '' : ` ${w.noStart}`}`);
    for (const item of start) lines.push(`   - **#${item.row}**: ${item.why}`);
  }
  const goalText = goal.answer === 'after-fixes' ? `${w.goals['after-fixes']} ${goal.rows.map((r) => `#${r}`).join(', ')}.` : w.goals[goal.answer];
  lines.push(`${short ? '' : '2. '}**${w.goal}** ${goalText}${goal.note ? ` ${goal.note}` : ''}`);
  if (!short) {
    lines.push(`3. **${w.beyond}**${beyond.length ? '' : ` ${w.nothingBeyond}`}`);
    for (const item of beyond) lines.push(`   - ${w.opinion}: ${item}`);
  }
  const asked = audit.rows.map((row, i) => ({ row, n: i + 1 })).filter(({ row }) => row.result === 'draft' || row.result === 'open');
  if (asked.length) {
    lines.push('', `### ${w.questions}`, '');
    for (const { row, n } of asked)
      lines.push(`- **#${n}** (${row.checks.join(', ')}): ${row.question ?? `${sentence(row.note)}${row.result === 'draft' ? ` ${w.defectOrChoice}` : ''}`}`);
  }
  return lines.join('\n');
};

// ---------------------------------------------------------------------------------------------
// The page

/** A text of the report as HTML: `code`, **bold**, links to http(s), and `#n` linked to its row. */
export const rich = (text: string, rows: number): string =>
  text
    .split('`')
    .map((part, i) =>
      i % 2 === 1
        ? `<code>${escapeHtml(part)}</code>`
        : escapeHtml(part)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
            .replace(/(^|[^\w&;])#(\d+)\b/g, (match, before: string, n: string) =>
              Number(n) >= 1 && Number(n) <= rows ? `${before}<a class="cite" href="#row-${n}">#${n}</a>` : match,
            ),
    )
    .join('');

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };

/** The most of screenshots a page holds inside itself; the rest are linked by their path. */
export const EMBED_BUDGET = 12 * 1024 * 1024;

/** A screenshot as the page shows it: inside the page while the budget lasts, else its path. */
export type ShotSource = (file: string) => { src: string; embedded: boolean };

export const shotSource = (budget = EMBED_BUDGET): ShotSource => {
  let left = budget;
  return (file) => {
    const mime = MIME[path.extname(file).toLowerCase()];
    const size = statSync(file).size;
    if (mime && size * 1.37 <= left) {
      left -= size * 1.37;
      return { src: `data:${mime};base64,${readFileSync(file).toString('base64')}`, embedded: true };
    }
    return { src: `file://${path.resolve(file)}`, embedded: false };
  };
};

const STYLES = `
header .kicker { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 6px; }
header h1 code { font-size: 26px; background: none; padding: 0; }
.lede { margin-top: 6px; max-width: 75ch; }
.meta { margin-top: 14px; }
.meta .chip b { color: var(--fg); font-weight: 600; }
.chip.off { border-style: dashed; }
.summary { margin-top: 24px; padding: 16px 20px; border-left: 4px solid var(--violet); }
.summary h2 { margin: 0 0 8px; }
.summary ol { margin: 0; padding-left: 22px; }
.summary > ol > li { margin: 10px 0; }
.summary ul { margin: 6px 0 0; padding-left: 18px; }
.summary li li { margin: 4px 0; }
.opinion { font-size: 12px; font-weight: 600; color: var(--amber); background: var(--amber-soft); border-radius: 999px; padding: 1px 8px; margin-right: 4px; }
a.cite { font-weight: 600; color: var(--violet); }
.counts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 10px; margin-top: 24px; }
.count { font: inherit; text-align: left; color: var(--fg); background: var(--surface); border: 1px solid var(--line); border-top: 4px solid var(--tone); border-radius: 10px; padding: 10px 14px; }
.count b { display: block; font-size: 26px; line-height: 1.1; color: var(--tone); }
.count[aria-pressed=true] { box-shadow: 0 0 0 2px var(--tone); }
button.count { cursor: pointer; }
.filters { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; margin-top: 16px; }
.filters .chips { gap: 6px; }
.filters .label { font-size: 13px; color: var(--muted); }
.filters button { font: inherit; font-size: 13px; color: var(--fg); background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; cursor: pointer; }
.filters button[aria-pressed=true] { background: var(--fg); color: var(--surface); border-color: var(--fg); }
.shown { font-size: 13px; color: var(--muted); }
.rows { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.row { background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--tone); border-radius: 10px; padding: 14px 16px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px 20px; scroll-margin-top: 16px; }
.row.has-shots { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
.row:target { box-shadow: 0 0 0 3px var(--violet); }
.row-head { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.row-head .n { font-weight: 700; text-decoration: none; }
.result { font-size: 13px; font-weight: 600; color: var(--tone); background: var(--tone-soft); border-radius: 999px; padding: 1px 10px; }
.check { font: 12px/1.4 ui-monospace, "SF Mono", Menlo, monospace; border: 1px solid var(--line); border-radius: 6px; padding: 1px 6px; color: var(--fg); }
.check small { color: var(--muted); font-family: system-ui, sans-serif; }
.where { margin-top: 6px; font-size: 14px; color: var(--muted); overflow-wrap: anywhere; }
.note { margin-top: 6px; }
.row dl { margin: 8px 0 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 12px; font-size: 14px; }
.row dt { color: var(--muted); }
.row dd { margin: 0; }
.shots { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; align-content: flex-start; }
.shot { margin: 0; max-width: 100%; cursor: zoom-in; }
.shot .frame { max-height: 300px; overflow: hidden; border: 1px solid var(--line); border-radius: 6px; background: #ffffff; }
.shot img { display: block; max-width: 100%; height: auto; }
.shot figcaption { font-size: 12px; color: var(--muted); margin-top: 4px; }
.row.zoomed { grid-template-columns: minmax(0, 1fr); }
.row.zoomed .shot { cursor: zoom-out; }
.row.zoomed .shot .frame { max-height: none; }
.questions { margin-top: 8px; padding: 12px 18px 12px 36px; }
.questions li { margin: 6px 0; }
.empty { padding: 16px; text-align: center; }
.tone-fail { --tone: var(--red); --tone-soft: var(--red-soft); }
.tone-question { --tone: var(--amber); --tone-soft: var(--amber-soft); }
.tone-not-verifiable { --tone: var(--teal); --tone-soft: var(--teal-soft); }
.tone-pass { --tone: var(--green); --tone-soft: var(--green-soft); }
@media (max-width: 640px) {
  .row.has-shots { grid-template-columns: minmax(0, 1fr); }
  .row dl { grid-template-columns: minmax(0, 1fr); }
  .row dd { margin-bottom: 4px; }
}
@media print {
  .filters, .shown { display: none; }
  .row { break-inside: avoid; }
}
`;

// Turns the counts into a filter by result and shows the filter by principle, where scripts run;
// the page reads complete without it.
const SCRIPT = `
const rows = [...document.querySelectorAll('.row')];
const state = { group: '', principle: '' };
const shown = document.querySelector('.shown');
const empty = document.querySelector('.empty');
document.querySelector('.filters').hidden = false;
for (const tile of document.querySelectorAll('.count[data-value]')) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = tile.className;
  button.dataset.filter = 'group';
  button.dataset.value = tile.dataset.value;
  button.innerHTML = tile.innerHTML;
  tile.replaceWith(button);
}
const apply = () => {
  let n = 0;
  for (const row of rows) {
    const show = (!state.group || row.dataset.group === state.group) && (!state.principle || row.dataset.principles.split(' ').includes(state.principle));
    row.hidden = !show;
    if (show) n += 1;
  }
  for (const button of document.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(state[button.dataset.filter] === button.dataset.value));
  shown.textContent = n === rows.length ? shown.dataset.all : shown.dataset.some.replace('{n}', n);
  empty.hidden = n > 0;
};
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (button) {
    const key = button.dataset.filter;
    state[key] = state[key] === button.dataset.value ? '' : button.dataset.value;
    apply();
    return;
  }
  const cite = event.target.closest('a.cite');
  if (cite) {
    const row = document.querySelector(cite.getAttribute('href'));
    if (row && row.hidden) { state.group = ''; state.principle = ''; apply(); }
    return;
  }
  const shot = event.target.closest('.shot');
  if (shot) shot.closest('.row').classList.toggle('zoomed');
});
apply();
`;

export interface PageFacts {
  /** The day the page was drawn, YYYY-MM-DD. */
  date: string;
  /** Where each screenshot comes from; reads the file by default. */
  source?: ShotSource;
}

/** The page of the report. */
export const pageOf = (audit: Audit, checks: Map<string, Check>, facts: PageFacts): string => {
  const w = WORDS[audit.lang];
  const total = audit.rows.length;
  const r = (text: string): string => rich(text, total);
  const counts = countsOf(audit);
  const principles = principlesOf(audit, checks);
  const source = facts.source ?? shotSource();

  const chip = (label: string, value: string | null): string =>
    `<span class="chip${value ? '' : ' off'}">${escapeHtml(label)}: <b>${value ? r(value) : escapeHtml(w.notRun)}</b></span>`;
  const meta = `<div class="meta chips">
<span class="chip">${escapeHtml(w.model)}: <b>${audit.model ? r(audit.model) : escapeHtml(w.none)}</b></span>
${chip(w.runtime, audit.ran.runtime)}
${chip(w.rendered, audit.ran.rendered)}
${principles
  .filter((c) => c.principle !== 'object-model' && c.principle !== 'design-system')
  .map((c) => `<span class="chip">${escapeHtml(c.title)}${c.draft ? ` <small>(${escapeHtml(w.draft)})</small>` : ''}</span>`)
  .join('\n')}
</div>`;

  const { start, goal, beyond } = audit.summary;
  const short = !!audit.after && !start.length && !beyond.length;
  const goalText =
    goal.answer === 'after-fixes' ? `${w.goals['after-fixes']} ${goal.rows.map((n) => `#${n}`).join(', ')}.` : w.goals[goal.answer];
  const goalHtml = `<strong>${escapeHtml(w.goal)}</strong> ${r(goalText)}${goal.note ? ` ${r(goal.note)}` : ''}`;
  const summary = `<section class="summary box" id="summary" aria-labelledby="summary-title"><h2 id="summary-title">${escapeHtml(w.summary)}</h2>
${
  short
    ? `<p>${goalHtml}</p>`
    : `<ol>
<li><strong>${escapeHtml(w.start)}</strong>${start.length ? `<ul>${start.map((s) => `<li>${r(`**#${s.row}**`)}: ${r(s.why)}</li>`).join('')}</ul>` : ` ${escapeHtml(w.noStart)}`}</li>
<li>${goalHtml}</li>
<li><strong>${escapeHtml(w.beyond)}</strong>${beyond.length ? `<ul>${beyond.map((b) => `<li><span class="opinion">${escapeHtml(w.opinion)}</span> ${r(b)}</li>`).join('')}</ul>` : ` ${escapeHtml(w.nothingBeyond)}`}</li>
</ol>`
}
</section>`;

  const groups: Group[] = ['fail', 'question', 'not-verifiable', 'pass'];
  const countTiles = `<div class="counts">
${groups
  .filter((g) => counts[g])
  .map((g) => `<div class="count tone-${g}" data-value="${g}"><b>${counts[g]}</b>${escapeHtml(w.group[g])}</div>`)
  .join('\n')}
</div>`;
  const filters = `<div class="filters" hidden>
<span class="label">${escapeHtml(w.byPrinciple)}</span>
<span class="chips"><button type="button" data-filter="principle" data-value="">${escapeHtml(w.all)}</button>${principles
    .map((c) => `<button type="button" data-filter="principle" data-value="${escapeHtml(c.principle)}">${escapeHtml(c.title)}</button>`)
    .join('')}</span>
<span class="shown" data-all="${escapeHtml(w.shown(total, total))}" data-some="${escapeHtml(w.shown(-1, total).replace('-1', '{n}'))}"></span>
</div>`;

  const rowHtml = (row: Row, i: number): string => {
    const n = i + 1;
    const group = GROUP_OF[row.result];
    const ids = row.checks.map((id) => {
      const c = checks.get(id);
      const title = c ? `${c.title}${c.rule ? `, ${c.rule}` : ''}: ${c.strength}, ${c.level}${c.draft ? `, ${w.draft}` : ''}` : id;
      return `<span class="check" title="${escapeHtml(title)}">${escapeHtml(id)} <small>${escapeHtml(c?.level ?? '')}</small></span>`;
    });
    const details: [string, string][] = [];
    if (row.change) details.push([w.change, row.change]);
    if (row.resolution) details.push([w.resolution, w.resolutions[row.resolution]]);
    if (row.answer) details.push([w.answer, row.answer]);
    if (row.estimate) details.push([w.estimate, row.estimate]);
    if (row.verify) details.push([w.verify, row.verify]);
    if (row.reason) details.push([w.reason, row.reason]);
    if (row.question && row.question !== row.note) details.push([w.question, row.question]);
    if (row.looked) details.push([w.looked, row.looked]);
    const examples = row.result === 'fail' ? examplesOf(row, checks) : [];
    if (examples.length) details.push([w.example, examples.map((e) => `[${e.rule}](${e.url})`).join(', ')]);
    const shots = row.shots.map((shot) => {
      const { src, embedded } = source(shot.file);
      const caption = shot.caption ?? path.basename(shot.file);
      return embedded
        ? `<figure class="shot"><div class="frame"><img src="${src}" alt="${escapeHtml(caption)}" loading="lazy"></div><figcaption>${escapeHtml(caption)}</figcaption></figure>`
        : `<figure class="shot"><a href="${escapeHtml(src)}">${escapeHtml(caption)}</a><figcaption>${escapeHtml(shot.file)}</figcaption></figure>`;
    });
    const principleIds = [...new Set(row.checks.map((id) => checks.get(id)?.principle).filter(Boolean))].join(' ');
    return `<article class="row tone-${group}${shots.length ? ' has-shots' : ''}" id="row-${n}" data-group="${group}" data-principles="${escapeHtml(principleIds)}">
<div>
<div class="row-head"><a class="n" href="#row-${n}">#${n}</a><span class="result">${escapeHtml(w.result[row.result])}</span>${ids.join('')}</div>
<p class="where">${r(row.where)}</p>
<p class="note">${r(row.note)}</p>
${details.length ? `<dl>${details.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${r(v)}</dd>`).join('')}</dl>` : ''}
</div>
${shots.length ? `<div class="shots">${shots.join('')}</div>` : ''}
</article>`;
  };

  const asked = audit.rows.map((row, i) => ({ row, n: i + 1 })).filter(({ row }) => row.result === 'draft' || row.result === 'open');
  const questions = asked.length
    ? `<h2>${escapeHtml(w.questions)}</h2>
<ol class="questions box">${asked
        .map(({ row, n }) => `<li>${r(`**#${n}**`)} (${escapeHtml(row.checks.join(', '))}): ${row.question ? r(row.question) : `${r(sentence(row.note))}${row.result === 'draft' ? ` <strong>${escapeHtml(w.defectOrChoice)}</strong>` : ''}`}</li>`)
        .join('')}</ol>`
    : '';

  const hasShots = audit.rows.some((row) => row.shots.length);
  const body = `<header>
<p class="kicker">${escapeHtml(w.audit.replace(/ (of|di)$/, ''))} &middot; ${escapeHtml(w.mode[audit.mode])}</p>
<h1><code>${escapeHtml(audit.target)}</code></h1>
${audit.why ? `<p class="lede muted">${r(audit.why)}</p>` : ''}
${meta}
</header>
${summary}
${countTiles}
${filters}
<section class="rows" aria-label="${escapeHtml(w.head[3])}">
${audit.rows.map(rowHtml).join('\n')}
<p class="empty muted box" hidden>0</p>
</section>
${questions}
<footer class="muted">${escapeHtml(w.drawn)} ${escapeHtml(facts.date)} ${w.from}${hasShots ? ` ${escapeHtml(w.zoom)}` : ''}</footer>
<script type="application/json" id="facts">${JSON.stringify(audit).replace(/</g, '\\u003c')}</script>`;
  return page({ title: `${w.audit} ${path.basename(audit.target)}`, body, lang: audit.lang, styles: STYLES, script: SCRIPT });
};

// ---------------------------------------------------------------------------------------------

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.value('root') ?? path.join(import.meta.dirname, '..'));
  const from = args.words;
  if (!from) {
    console.error('Usage: node scripts/audit.ts <audit.json | -> [--html=<file>]: the audit as JSON, from a file or from stdin (-).');
    process.exit(2);
  }
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(from === '-' ? 0 : from, 'utf8'));
  } catch (error) {
    console.error(`The audit was not read: ${(error as Error).message}. Nothing was written.`);
    process.exit(1);
  }
  const checks = readChecks(root);
  const { audit, problems } = validate(value, checks);
  if (problems.length) {
    console.error(['The audit is refused, nothing was written. Fix the JSON and run it again:', ...problems.map((p) => `- ${p}`)].join('\n'));
    process.exit(1);
  }
  console.log(markdownOf(audit, checks));
  const htmlFile = args.value('html');
  if (htmlFile) {
    try {
      writeFileSync(htmlFile, pageOf(audit, checks, { date: new Date().toISOString().slice(0, 10) }));
      console.log(`\nThe page: ${path.resolve(htmlFile)}`);
    } catch (error) {
      console.log(`\nThe page was not written: ${(error as Error).message}`);
    }
  }
}
