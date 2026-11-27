/*
  The cheatsheet of the plugin: every skill, what it is for, how to call it, the words that call
  it and examples of use. The skill /v2:help shows what this prints and opens its page.

    node scripts/help.ts [skill] [--html[=<file>]] [--root=<plugin folder>]
        print the table "Which skill for the job" in Markdown: a row per job of every skill
        skill            a skill by its name (`work-map` or `/v2:work-map`): its card instead of
                         the table, and the page opened on it
        --html[=<file>]  also write the page: the ways to call a skill, the same table, a card
                         per skill with its examples, the rules of the workflow; without a file,
                         `v2-help.html` in the temporary folder of the system
        --root=<dir>     the plugin to read; the folder of this script's plugin by default

  The examples of a skill, `skills/<name>/examples.md`, written by hand:

    ---
    group: design | workflow | sharing
    order: 1                       (its place in the group: the order a person meets the skills)
    loads-by-itself: true          (optional: the skill joins a request without being called)
    ---

    ## <The job, as a person says it after "I want to">

    Changes: <what the job changes; "nothing" when it only reads>.
    Say: "<phrase>", "<phrase>"    (optional: the words of the description that call this job)

    | You type | When | You get |
    | --- | --- | --- |
    | `/v2:<name> <options>` or "<what a person says>" | <the situation> | <what comes back> |

  One section per job: a skill with one job has one. A cell keeps to `code` and "words in double
  quotes"; it never holds a bare `|`.

  Where each answer comes from:

  - a skill, its name, the options of its command, whether it is called by words: its
    `SKILL.md` (`name`, `argument-hint`, `disable-model-invocation`), read by the frontmatter
    reader of the plugin (scripts/lib/frontmatter.ts);
  - what it is for: the description up to its "Use when" (or "Use whenever", "Use before",
    "Use to", "Use for"), the part that says what the skill does;
  - the words that call it: the phrases in double quotes of its description, the only words the
    listing of every session shows; a job shows those of its `Say:`, else the first two;
  - its group, its order, its jobs, what each changes and the examples: its `examples.md`;
  - the command of a job, when a skill has more than one: the mode its examples type after the
    command (`/v2:work test 1320` -> `/v2:work test`), among those `argument-hint` opens with;
  - the rules of the workflow: the `## <n>. <title>` headings of GOVERNANCE.md;
  - the version: `.claude-plugin/plugin.json`;
  - nothing else: no example is made up here, and a skill without its examples.md shows its
    description alone (scripts/plugin.spec.ts fails on it before a release).
*/
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isMain, parseArgs } from './lib/args.ts';
import { frontmatter } from './lib/frontmatter.ts';
import { cell, table } from './lib/markdown.ts';
import { escapeHtml, inline, page } from './lib/page.ts';

export const GROUPS = [
  { id: 'design', title: 'Design', blurb: 'Before, while and after building an interface.', hue: 'violet' },
  { id: 'workflow', title: 'Workflow', blurb: 'What the work touches, where it stands, how to try it, the merges you approve.', hue: 'teal' },
  { id: 'sharing', title: 'Sharing', blurb: 'Once it ships.', hue: 'amber' },
] as const;

export type Group = (typeof GROUPS)[number]['id'];

export const EXAMPLES_HEADER = '| You type | When | You get |';

export interface Example {
  type: string;
  when: string;
  get: string;
}

export interface Job {
  title: string;
  changes: string;
  /** The phrases of its `Say:` line; empty when it has none. */
  say: string[];
  examples: Example[];
}

export interface Examples {
  group: Group;
  order: number;
  loadsByItself: boolean;
  jobs: Job[];
}

export interface Skill {
  name: string;
  description: string;
  /** The options of the command, from `argument-hint`. */
  args: string;
  /** What it is for: the description up to its "Use ...". */
  purpose: string;
  /** The phrases in double quotes of the description. */
  phrases: string[];
  /** False when `disable-model-invocation` keeps it to its command. */
  byWords: boolean;
  /** Null when the skill has no examples.md, or one that does not parse. */
  examples: Examples | null;
  /** Why its examples.md does not parse, with its line. */
  error?: string;
}

/** The part of a description that says what the skill does, before when to use it. */
export const purposeOf = (description: string): string =>
  description.split(/\s+Use (?:when|whenever|before|to|for)\b/)[0].trim();

/** The phrases in double quotes of a description, in its order. */
export const phrasesOf = (description: string): string[] =>
  [...description.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

/** The cells of a Markdown table row; `\|` stays a pipe inside its cell. */
const cellsOf = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));

/**
 * An examples.md, read as strictly as its format: a line that is none of its parts is refused
 * with its line, so a typo never drops an example silently. `file` names it in the errors.
 */
export const parseExamples = (text: string, file = 'examples.md'): Examples => {
  const fields = frontmatter(text);
  const fail = (line: number | null, reason: string): never => {
    throw new Error(`${file}${line ? `:${line}` : ''}: ${reason}`);
  };
  const group = fields.group as Group;
  if (!GROUPS.some((g) => g.id === group)) fail(null, `group is ${JSON.stringify(fields.group)}, not one of ${GROUPS.map((g) => g.id).join(', ')}`);
  const order = Number(fields.order);
  if (!/^[1-9]\d*$/.test(fields.order ?? '')) fail(null, `order is ${JSON.stringify(fields.order)}, not a whole number from 1`);
  if (fields['loads-by-itself'] !== undefined && fields['loads-by-itself'] !== 'true') fail(null, 'loads-by-itself is true, or absent');
  const known = new Set(['group', 'order', 'loads-by-itself']);
  for (const key of Object.keys(fields)) if (!known.has(key)) fail(null, `unknown key ${key}`);

  const lines = text.split('\n');
  const start = lines.indexOf('---', 1) + 1;
  const jobs: Job[] = [];
  let job: Job | null = null;
  let inTable = 0; // 0 no table, 1 header seen, 2 separator seen
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    const at = i + 1;
    if (!line.trim()) {
      if (inTable) inTable = 0;
      continue;
    }
    if (line.startsWith('## ')) {
      job = { title: line.slice(3).trim(), changes: '', say: [], examples: [] };
      jobs.push(job);
      inTable = 0;
      continue;
    }
    if (!job) fail(at, 'text before the first `## <job>` heading');
    const current = job as Job;
    if (line.startsWith('Changes: ')) {
      if (current.changes) fail(at, 'a second Changes: line');
      current.changes = line.slice(9).trim().replace(/\.$/, '');
    } else if (line.startsWith('Say: ')) {
      const rest = line.slice(5).trim();
      if (!/^"[^"]+"(?:, "[^"]+")*$/.test(rest)) fail(at, 'Say: holds "phrases" in double quotes, separated by commas');
      current.say = phrasesOf(rest);
    } else if (line.startsWith('|')) {
      if (inTable === 0) {
        if (line.trim() !== EXAMPLES_HEADER) fail(at, `the table of examples opens with ${EXAMPLES_HEADER}`);
        inTable = 1;
      } else if (inTable === 1) {
        if (!/^\|(?:\s*:?-{3,}:?\s*\|){3}$/.test(line.trim())) fail(at, 'the second line of the table is its separator, | --- | --- | --- |');
        inTable = 2;
      } else {
        const cells = cellsOf(line);
        if (cells.length !== 3 || cells.some((c) => !c)) fail(at, 'an example has three cells, none empty: You type, When, You get');
        current.examples.push({ type: cells[0], when: cells[1], get: cells[2] });
      }
    } else {
      fail(at, 'a line that is no heading, Changes:, Say: or row of the table');
    }
  }
  for (const j of jobs) {
    if (!j.changes) fail(null, `the job "${j.title}" has no Changes: line`);
    if (!j.examples.length) fail(null, `the job "${j.title}" has no examples`);
  }
  if (!jobs.length) fail(null, 'no `## <job>` section');
  return { group, order, loadsByItself: fields['loads-by-itself'] === 'true', jobs };
};

/** One skill of the plugin at `root`, from its folder. */
export const readSkill = (root: string, name: string): Skill => {
  const dir = path.join(root, 'skills', name);
  const fields = frontmatter(readFileSync(path.join(dir, 'SKILL.md'), 'utf8'));
  const description = fields.description ?? '';
  const file = path.join(dir, 'examples.md');
  let examples: Examples | null = null;
  let error: string | undefined;
  // a file that does not parse leaves its skill on the page with its description alone: the
  // cheatsheet of an installed plugin still draws, and scripts/plugin.spec.ts fails on it
  if (existsSync(file))
    try {
      examples = parseExamples(readFileSync(file, 'utf8'), `skills/${name}/examples.md`);
    } catch (e) {
      error = (e as Error).message;
    }
  return {
    name: fields.name ?? name,
    description,
    args: fields['argument-hint'] ?? '',
    purpose: purposeOf(description),
    phrases: phrasesOf(description),
    byWords: fields['disable-model-invocation'] !== 'true',
    examples,
    ...(error ? { error } : {}),
  };
};

const groupIndex = (skill: Skill): number => {
  const index = GROUPS.findIndex((g) => g.id === skill.examples?.group);
  return index < 0 ? GROUPS.length : index;
};

/** Every skill of the plugin at `root`, by group, then by order, then by name. */
export const readSkills = (root: string): Skill[] =>
  readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(root, 'skills', entry.name, 'SKILL.md')))
    .map((entry) => readSkill(root, entry.name))
    .sort(
      (a, b) =>
        groupIndex(a) - groupIndex(b) ||
        (a.examples?.order ?? 0) - (b.examples?.order ?? 0) ||
        a.name.localeCompare(b.name),
    );

/** What a skill of the plugin breaks in the rules of examples.md that its parser cannot see. */
export const problemsOf = (skill: Skill): string[] => {
  const file = `skills/${skill.name}/examples.md`;
  if (skill.error) return [skill.error];
  if (!skill.examples) return [`${file} is missing`];
  const out: string[] = [];
  for (const job of skill.examples.jobs) {
    const n = job.examples.length;
    if (n < 2 || n > 4) out.push(`${file}, "${job.title}": ${n} examples, not 2 to 4`);
    for (const example of job.examples) {
      const command = /^`(\/v2:[\w-]+)/.exec(example.type)?.[1];
      if (command && command !== `/v2:${skill.name}`) out.push(`${file}, "${job.title}": the example ${example.type} calls ${command}, not /v2:${skill.name}`);
    }
    for (const phrase of job.say)
      if (!skill.phrases.includes(phrase)) out.push(`${file}, "${job.title}": "${phrase}" is not a phrase of the description`);
    if (!skill.byWords && job.say.length) out.push(`${file}, "${job.title}": Say: on a skill called only by its command`);
  }
  if (skill.purpose === skill.description.trim()) out.push(`skills/${skill.name}/SKILL.md: the description says no "Use when ..."`);
  return out;
};

/** The command of a job: with more than one job, the mode its examples type after the command. */
export const commandOf = (skill: Skill, job: Job): string => {
  const base = `/v2:${skill.name}`;
  if ((skill.examples?.jobs.length ?? 0) < 2) return base;
  const modes = (/^\[([^\]]+)\]/.exec(skill.args)?.[1] ?? '').split('|').map((m) => m.trim());
  for (const example of job.examples) {
    const word = new RegExp(`^\`/v2:${skill.name} (\\w+)`).exec(example.type)?.[1];
    if (word && modes.includes(word)) return `${base} ${word}`;
  }
  return base;
};

/** The words that call a job, or how the skill is called when no words do. */
const sayOf = (skill: Skill, job: Job): { phrases: string[]; note: string | null } => {
  if (!skill.byWords) return { phrases: [], note: 'by command only' };
  if (skill.examples?.loadsByItself) return { phrases: [], note: 'loads by itself' };
  const phrases = job.say.length ? job.say : skill.phrases.slice(0, 2);
  return phrases.length ? { phrases, note: null } : { phrases: [], note: 'in your words' };
};

const jobsOf = (skill: Skill): Job[] =>
  skill.examples?.jobs ?? [{ title: skill.purpose, changes: '', say: [], examples: [] }];

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// ---------------------------------------------------------------------------------------------
// Markdown

/** The table "Which skill for the job": a row per job of every skill. */
export const jobsTable = (skills: Skill[]): string[] =>
  table(
    ['I want to', 'Command', 'Say'],
    skills.flatMap((skill) =>
      jobsOf(skill).map((job) => {
        const say = sayOf(skill, job);
        return [cell(capital(job.title)), `\`${commandOf(skill, job)}\``, say.note ?? say.phrases.map((p) => `"${cell(p)}"`).join(', ')];
      }),
    ),
  );

/** One skill as Markdown: what it is for, the words that call it, each job with its examples. */
export const cardMarkdown = (skill: Skill): string[] => {
  const lines = [`### \`/v2:${skill.name}\`${skill.args ? ` \`${skill.args}\`` : ''}`, '', cell(skill.purpose)];
  const say = !skill.byWords ? 'by command only' : skill.phrases.map((p) => `"${p}"`).join(', ');
  if (say) lines.push('', `Say: ${say}${skill.examples?.loadsByItself ? '; it also loads by itself' : ''}`);
  for (const job of skill.examples?.jobs ?? []) {
    lines.push('', `**${cell(capital(job.title))}**. Changes: ${cell(job.changes)}.`, '');
    lines.push(...table(['You type', 'When', 'You get'], job.examples.map((e) => [e.type, e.when, e.get])));
  }
  return lines;
};

/** What the script prints: the table, or the card of the skill asked for. */
export const markdownOf = (skills: Skill[], version: string, focus?: Skill): string =>
  [
    `**v2 ${version}**: ${skills.length} skills.`,
    '',
    ...(focus ? cardMarkdown(focus) : ['### Which skill for the job', '', ...jobsTable(skills)]),
  ].join('\n');

// ---------------------------------------------------------------------------------------------
// The page

const STYLES = `
.lede { margin-top: 6px; max-width: 70ch; }
nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; align-items: center; }
nav a { text-decoration: none; border: 1px solid var(--line); background: var(--surface); padding: 4px 12px; border-radius: 999px; font-size: 14px; }
input[type=search] { font: inherit; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--fg); min-width: min(100%, 240px); }
.ways { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 12px; margin-top: 24px; }
.way { padding: 14px 16px; }
.way b { display: block; margin-bottom: 4px; }
.jobs { margin-top: 12px; overflow-x: auto; }
@media (min-width: 641px) { .jobs td:first-child { width: 50%; } }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 560px), 1fr)); gap: 16px; margin-top: 12px; }
.card { min-width: 0; background: var(--surface); border: 1px solid var(--line); border-top: 4px solid var(--accent); border-radius: 10px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; scroll-margin-top: 16px; }
.card:target, .card.focus { box-shadow: 0 0 0 3px var(--accent); }
.card h3 code { font-size: 15px; background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.args { font: 13px ui-monospace, "SF Mono", Menlo, monospace; color: var(--muted); overflow-wrap: anywhere; }
.job { font-weight: 600; }
.changes { font-size: 13px; color: var(--muted); }
.changes b { color: var(--fg); font-weight: 600; }
.subjob { border-top: 1px solid var(--line); padding-top: 12px; }
.subjob h4 { color: var(--accent); margin-bottom: 4px; }
ul.examples { list-style: none; margin: 4px 0 0; padding: 0; border-top: 1px solid var(--line); }
.subjob ul.examples { border-top: 0; }
ul.examples li { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 2px 16px; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
ul.examples li:last-child { border-bottom: 0; padding-bottom: 0; }
ul.examples .type { grid-column: 1 / -1; }
ul.examples .type code, ul.examples .type q { font-size: 13.5px; }
ul.examples .when { color: var(--muted); }
ul.examples .get::before { content: "\\2192\\00a0"; color: var(--accent); font-weight: 700; }
.rules { padding: 8px 18px 8px 40px; margin: 12px 0 0; }
.rules li { margin: 6px 0; }
@media (max-width: 640px) { ul.examples li { grid-template-columns: 1fr; } }
${GROUPS.map((g) => `.card[data-group=${g.id}] { --accent: var(--${g.hue}); --accent-soft: var(--${g.hue}-soft); }`).join('\n')}
.card[data-group=none] { --accent: var(--muted); --accent-soft: var(--code); }
`;

// Filters the cards where scripts run; the page reads complete without it.
const SCRIPT = `
const box = document.querySelector('input[type=search]');
box.hidden = false;
box.addEventListener('input', () => {
  const words = box.value.toLowerCase().trim();
  for (const card of document.querySelectorAll('.card')) card.hidden = !!words && !card.textContent.toLowerCase().includes(words);
  for (const section of document.querySelectorAll('section.group')) section.hidden = ![...section.querySelectorAll('.card')].some((card) => !card.hidden);
});
const focus = document.querySelector('.card.focus');
if (focus) focus.scrollIntoView();
`;

const chipsOf = (skill: Skill): string =>
  [
    skill.examples?.loadsByItself ? '<span class="chip">loads by itself</span>' : '',
    `<span class="chip">${skill.byWords ? 'by command or by words' : 'by command only'}</span>`,
    ...skill.phrases.map((p) => `<q>${escapeHtml(p)}</q>`),
  ].join('');

const examplesList = (job: Job): string =>
  `<ul class="examples" aria-label="Examples">${job.examples
    .map(
      (e) =>
        `<li><div class="type">${inline(e.type)}</div><div class="when">${inline(capital(e.when))}</div><div class="get">${inline(e.get)}</div></li>`,
    )
    .join('')}</ul>`;

const cardHtml = (skill: Skill, focus: boolean): string => {
  const jobs = skill.examples?.jobs ?? [];
  const lead =
    jobs.length === 1
      ? `<p class="job">${escapeHtml(capital(jobs[0].title))}.</p>`
      : jobs.length > 1
        ? `<p class="job">${jobs.length} jobs in one skill: ${jobs.map((j) => escapeHtml(j.title.toLowerCase())).join('; ')}.</p>`
        : '';
  const body =
    jobs.length === 1
      ? `<p class="changes"><b>Changes:</b> ${inline(jobs[0].changes)}</p>${examplesList(jobs[0])}`
      : jobs
          .map(
            (j) =>
              `<section class="subjob"><h4>${escapeHtml(capital(j.title))}</h4><p class="changes"><b>Changes:</b> ${inline(j.changes)}</p>${examplesList(j)}</section>`,
          )
          .join('');
  return `<article class="card${focus ? ' focus' : ''}" id="${escapeHtml(skill.name)}" data-group="${skill.examples?.group ?? 'none'}">
<h3><code>/v2:${escapeHtml(skill.name)}</code> <span class="args">${escapeHtml(skill.args)}</span></h3>
${lead}<p>${escapeHtml(skill.purpose)}</p>
<div class="chips">${chipsOf(skill)}</div>
${body}
</article>`;
};

export interface PageFacts {
  version: string;
  rules: { n: string; title: string }[];
  /** The day the page was drawn, YYYY-MM-DD. */
  date: string;
  focus?: string;
}

/** The page of the cheatsheet. */
export const pageOf = (skills: Skill[], facts: PageFacts): string => {
  const byItself = skills.filter((s) => s.examples?.loadsByItself).map((s) => `<code>${escapeHtml(s.name)}</code>`);
  const commandOnly = skills.filter((s) => !s.byWords).map((s) => `<code>${escapeHtml(s.name)}</code>`);
  const ways = `<div class="ways">
<div class="way box"><b>Type the command</b><code>/v2:&lt;skill&gt; [options]</code><p class="muted">Options in words after it: <code>&lt;&gt;</code> required, <code>[]</code> optional.</p></div>
<div class="way box"><b>Say it</b><p>Write what you want in your words: the green phrases on each card call the skill without the command.</p></div>
<div class="way box"><b>It loads by itself</b><p>${byItself.length ? `${byItself.join(', ')} joins the requests it is for, uncalled.` : 'No skill loads uncalled.'}${commandOnly.length ? ` <span class="muted">Only by command: ${commandOnly.join(', ')}.</span>` : ''}</p></div>
</div>`;
  const rows = skills
    .flatMap((skill) =>
      jobsOf(skill).map((job) => {
        const say = sayOf(skill, job);
        return `<tr><td>${escapeHtml(capital(job.title))}</td><td><a href="#${escapeHtml(skill.name)}"><code>${escapeHtml(commandOf(skill, job))}</code></a></td><td>${
          say.note ? `<span class="muted">${say.note}</span>` : say.phrases.map((p) => `<q>${escapeHtml(p)}</q>`).join(' ')
        }</td></tr>`;
      }),
    )
    .join('\n');
  const jobs = `<div class="jobs box"><table class="stack"><thead><tr><th>I want to</th><th>Command</th><th>Say</th></tr></thead><tbody>
${rows}
</tbody></table></div>`;
  const ungrouped = skills.filter((s) => !s.examples);
  const groups = [
    ...GROUPS.map((g) => ({ id: g.id, title: g.title, blurb: g.blurb, skills: skills.filter((s) => s.examples?.group === g.id) })),
    { id: 'other', title: 'Without examples', blurb: 'These skills have no examples.md yet.', skills: ungrouped },
  ]
    .filter((g) => g.skills.length)
    .map(
      (g) => `<section class="group" id="g-${g.id}"><h2>${g.title} <span class="muted">(${g.skills.length})</span></h2><p class="muted">${escapeHtml(g.blurb)}</p>
<div class="cards">
${g.skills.map((s) => cardHtml(s, s.name === facts.focus)).join('\n')}
</div></section>`,
    )
    .join('\n');
  const rules = facts.rules.length
    ? `<section id="rules"><h2>The rules the workflow skills follow</h2><p class="muted">GOVERNANCE.md, by number: the skills cite them.</p>
<ol class="rules box">${facts.rules.map((r) => `<li value="${escapeHtml(r.n)}">${escapeHtml(r.title)}</li>`).join('')}</ol></section>`
    : '';
  const nav = [
    ...GROUPS.filter((g) => skills.some((s) => s.examples?.group === g.id)).map((g) => `<a href="#g-${g.id}">${g.title}</a>`),
    rules ? '<a href="#rules">The rules</a>' : '',
    '<input type="search" placeholder="Find a skill or a job" aria-label="Find a skill or a job" hidden>',
  ].join('');
  const body = `<header>
<h1>v2 cheatsheet</h1>
<p class="lede muted">The ${skills.length} skills of the plugin v2 ${escapeHtml(facts.version)}: what each is for, how to call it, and examples of use.</p>
<nav>${nav}</nav>
</header>
${ways}
<h2>Which skill for the job</h2>
${jobs}
${groups}
${rules}
<footer class="muted">Drawn on ${escapeHtml(facts.date)} by <code>scripts/help.ts</code> from <code>skills/*/SKILL.md</code>, <code>skills/*/examples.md</code> and <code>GOVERNANCE.md</code>. Run <code>/v2:help</code> again after an update of the plugin.</footer>`;
  return page({ title: 'v2 cheatsheet', body, styles: STYLES, script: SCRIPT });
};

/** The rules of GOVERNANCE.md: its `## <n>. <title>` headings. */
export const rulesOf = (governance: string): { n: string; title: string }[] =>
  [...governance.matchAll(/^## (\d+)\. (.+)$/gm)].map((match) => ({ n: match[1], title: match[2].trim() }));

// ---------------------------------------------------------------------------------------------

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.value('root') ?? path.join(import.meta.dirname, '..'));
  const skills = readSkills(root);
  const asked = args.words.replace(/^\/v2:/, '');
  const focus = asked ? skills.find((s) => s.name === asked) : undefined;
  if (asked && !focus) {
    console.error(`No skill ${asked}. The skills: ${skills.map((s) => s.name).join(', ')}.`);
    process.exit(1);
  }
  const version = JSON.parse(readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8')).version as string;
  const governance = path.join(root, 'GOVERNANCE.md');
  const rules = existsSync(governance) ? rulesOf(readFileSync(governance, 'utf8')) : [];
  console.log(markdownOf(skills, version, focus));
  const notes: string[] = [];
  const missing = skills.filter((s) => !s.examples && !s.error).map((s) => s.name);
  if (missing.length) notes.push(`Without examples.md: ${missing.join(', ')}.`);
  for (const s of skills.filter((s) => s.error)) notes.push(`Not read: ${s.error}`);
  // a bare --html writes in the temporary folder of the system: a skill passes no ${TMPDIR} or
  // quoted path, which the permission rule of a session in dontAsk mode refuses (seen 2026-11-27)
  const htmlFile = args.value('html') ?? (args.flag('html') ? path.join(tmpdir(), 'v2-help.html') : undefined);
  if (htmlFile) {
    try {
      writeFileSync(htmlFile, pageOf(skills, { version, rules, date: new Date().toISOString().slice(0, 10), focus: focus?.name }));
      notes.push(`The page: ${path.resolve(htmlFile)}${focus ? `#${focus.name}` : ''}`);
    } catch (error) {
      notes.push(`The page was not written: ${(error as Error).message}`);
    }
  }
  if (notes.length) console.log(['', ...notes].join('\n'));
}
