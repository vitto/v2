/*
  The person's decisions log: what they decided in real work against a rule of the principles,
  beyond them, or confirming a draft, so a principle changes when the decisions agree, never on
  one case and always on the person's yes. The format and the moments: docs/decisions-log.md.

    node scripts/decisions.ts add --entry='<json>' [--log=<file>]
        check one entry (a decision, or a proposal), append it, rewrite the view, say what is due
    node scripts/decisions.ts due [--log=<file>]
        the groups of decisions that reached the threshold since their last proposal
    node scripts/decisions.ts topics [--log=<file>]
        the topics already used for what no rule covers, to reuse one
    node scripts/decisions.ts view [--log=<file>]
        rewrite the view

  Where each answer comes from:

  - the log: `--log`, else the V2_DECISIONS_LOG variable (the `env` of ~/.claude/settings.json),
    a JSON Lines file, `~/` expanded. Without either, nothing is written and the script says how
    to set it: the log is the person's, private, and never lives in v2 or in a project;
  - the view: the same path with `.md` instead of `.jsonl`, written by this script only;
  - the date of an entry: today on this computer, unless the entry gives one;
  - a group: one rule (or topic), one kind of view, one stance. Within it, decisions of the same
    project for the same reason (the same view, or the same why) count as one; a group is due at
    three, or at once when an entry says `promote`, and counts again after a proposal on it.
*/
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isMain, parseArgs } from './lib/args.ts';
import { cell, plural, table } from './lib/markdown.ts';

export const KINDS = ['tool', 'task', 'page', 'component'] as const;
export const STANCES = ['departs', 'confirms', 'uncovered'] as const;
export const SOURCES = ['check', 'correction'] as const;
export const OUTCOMES = ['proposed', 'accepted', 'declined'] as const;
export const THRESHOLD = 3;

export interface Decision {
  type: 'decision';
  date: string;
  project: string;
  view: string;
  kind: (typeof KINDS)[number];
  source: (typeof SOURCES)[number];
  rule?: string;
  topic?: string;
  stance: (typeof STANCES)[number];
  decided: string;
  why: string;
  promote?: boolean;
}

export interface Proposal {
  type: 'proposal';
  date: string;
  group: string;
  outcome: (typeof OUTCOMES)[number];
  where?: string;
}

export type Entry = Decision | Proposal;

export const HOW_TO_SET =
  'No decisions log: set V2_DECISIONS_LOG to a .jsonl file of yours, outside v2 and outside the ' +
  'projects, in the env of ~/.claude/settings.json ({"env": {"V2_DECISIONS_LOG": ' +
  '"~/notes/decisions.jsonl"}}), then start a new session. Until then the decision stays in the ' +
  "project only, in its object model's Exceptions.";

/** The log: `--log`, else V2_DECISIONS_LOG, `~/` expanded; null when neither is set. */
export const logPath = (option: string | undefined, env = process.env, home = os.homedir()): string | null => {
  const raw = (option ?? env.V2_DECISIONS_LOG ?? '').trim();
  if (!raw) return null;
  return raw === '~' || raw.startsWith('~/') ? home + raw.slice(1) : raw;
};

/** The view beside the log. */
export const viewPath = (log: string): string => (log.endsWith('.jsonl') ? log.slice(0, -6) : log) + '.md';

const today = (): string => new Date().toLocaleDateString('sv-SE');

const oneOf = <T extends string>(values: readonly T[], value: unknown, field: string): T => {
  if (typeof value !== 'string' || !(values as readonly string[]).includes(value))
    throw new Error(`${field}: ${JSON.stringify(value)} is not one of ${values.join(', ')}`);
  return value as T;
};

const text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}: a line of text is missing`);
  if (/\r|\n/.test(value)) throw new Error(`${field}: one line, no line break`);
  return value.trim();
};

const optional = (value: unknown, field: string): string | undefined =>
  value === undefined || value === null || value === '' ? undefined : text(value, field);

const date = (value: unknown): string => {
  const found = value === undefined ? today() : text(value, 'date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(found)) throw new Error(`date: ${JSON.stringify(found)} is not YYYY-MM-DD`);
  return found;
};

/** One entry, checked and normalized; throws with the field that is wrong. */
export const entryOf = (raw: unknown): Entry => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('an entry is a JSON object');
  const o = raw as Record<string, unknown>;
  const type = o.type ?? 'decision';
  if (type === 'proposal') {
    const where = optional(o.where, 'where');
    return {
      type,
      date: date(o.date),
      group: text(o.group, 'group'),
      outcome: oneOf(OUTCOMES, o.outcome ?? 'proposed', 'outcome'),
      ...(where ? { where } : {}),
    };
  }
  if (type !== 'decision') throw new Error(`type: ${JSON.stringify(type)} is not decision or proposal`);
  const rule = optional(o.rule, 'rule');
  const topic = optional(o.topic, 'topic');
  const stance = oneOf(STANCES, o.stance, 'stance');
  const source = oneOf(SOURCES, o.source, 'source');
  if (rule && topic) throw new Error('rule and topic: one or the other, a topic is for what no rule covers');
  if (stance === 'uncovered' && !topic) throw new Error('topic: an uncovered decision names its topic');
  if (stance === 'uncovered' && rule) throw new Error('rule: an uncovered decision touches no rule');
  if (stance !== 'uncovered' && !rule) throw new Error(`rule: a decision that ${stance} names the check id`);
  if (source === 'check' && !rule) throw new Error('rule: a decision on a check names the check id');
  if (topic && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(topic)) throw new Error(`topic: ${JSON.stringify(topic)} is not kebab-case`);
  if (o.promote !== undefined && typeof o.promote !== 'boolean') throw new Error('promote: true or false');
  return {
    type,
    date: date(o.date),
    project: text(o.project, 'project'),
    view: text(o.view, 'view'),
    kind: oneOf(KINDS, o.kind, 'kind'),
    source,
    ...(rule ? { rule } : {}),
    ...(topic ? { topic } : {}),
    stance,
    decided: text(o.decided, 'decided'),
    why: text(o.why, 'why'),
    ...(o.promote ? { promote: true } : {}),
  };
};

/** The entries of a log, in the order they were written; throws with the line that is wrong. */
export const parse = (content: string): Entry[] =>
  content.split('\n').flatMap((line, i) => {
    if (!line.trim()) return [];
    try {
      return [entryOf(JSON.parse(line))];
    } catch (error) {
      throw new Error(`line ${i + 1}: ${(error as Error).message}`);
    }
  });

export const read = (log: string): Entry[] => (existsSync(log) ? parse(readFileSync(log, 'utf8')) : []);

/** What a decision is about: its rule, or its topic. */
export const subjectOf = (d: Decision): string => d.rule ?? `topic:${d.topic}`;

/** `VC4 · tool · departs`. */
export const groupOf = (d: Decision): string => `${subjectOf(d)} · ${d.kind} · ${d.stance}`;

const reason = (why: string): string => why.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** How many decisions count: the same project for the same reason (same view, or same why) is one. */
export const units = (decisions: Decision[]): number => {
  const found: { project: string; views: Set<string>; whys: Set<string> }[] = [];
  for (const d of decisions) {
    const unit = found.find((u) => u.project === d.project && (u.views.has(d.view) || u.whys.has(reason(d.why))));
    if (unit) {
      unit.views.add(d.view);
      unit.whys.add(reason(d.why));
    } else found.push({ project: d.project, views: new Set([d.view]), whys: new Set([reason(d.why)]) });
  }
  return found.length;
};

export interface Group {
  key: string;
  /** The decisions since the last proposal on this group. */
  decisions: Decision[];
  units: number;
  promoted: boolean;
  due: boolean;
  /** The proposals on this group, oldest first. */
  proposals: Proposal[];
}

/** Every group, in the order its first decision was written. */
export const groups = (entries: Entry[]): Group[] => {
  const byKey = new Map<string, Group>();
  const of = (key: string): Group => {
    let group = byKey.get(key);
    if (!group) byKey.set(key, (group = { key, decisions: [], units: 0, promoted: false, due: false, proposals: [] }));
    return group;
  };
  for (const entry of entries) {
    if (entry.type === 'proposal') {
      const group = of(entry.group);
      group.proposals.push(entry);
      group.decisions = [];
    } else of(groupOf(entry)).decisions.push(entry);
  }
  for (const group of byKey.values()) {
    group.units = units(group.decisions);
    group.promoted = group.decisions.some((d) => d.promote);
    group.due = group.units >= THRESHOLD || group.promoted;
  }
  return [...byKey.values()].filter((g) => g.decisions.length || g.proposals.length);
};

/** The groups due for a proposal. */
export const due = (entries: Entry[]): Group[] => groups(entries).filter((g) => g.due);

/** The topics in use, with how many decisions each. */
export const topics = (entries: Entry[]): [string, number][] => {
  const counts = new Map<string, number>();
  for (const e of entries) if (e.type === 'decision' && e.topic) counts.set(e.topic, (counts.get(e.topic) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

const decisionRows = (decisions: Decision[]): string[] =>
  table(
    ['Date', 'Project', 'View', 'Source', 'Decided', 'Why'],
    decisions.map((d) => [d.date, cell(d.project), cell(d.view), d.source + (d.promote ? ', promote' : ''), cell(d.decided), cell(d.why)]),
  );

/** The Markdown view: by rule or topic, then by kind and stance. */
export const render = (entries: Entry[], source: string): string => {
  const all = groups(entries);
  const decisions = entries.filter((e): e is Decision => e.type === 'decision');
  const lines = [
    '# Decisions log',
    '',
    `Written by \`scripts/decisions.ts\` from \`${source}\`; do not edit by hand.`,
    '',
    `${plural(decisions.length, 'decision')}, ${plural(entries.length - decisions.length, 'proposal')}; ` +
      `${plural(all.filter((g) => g.due).length, 'group')} due.`,
  ];
  const subjects = [...new Set(all.map((g) => g.key.split(' · ')[0]))];
  for (const subject of subjects) {
    lines.push('', `## ${subject.replace(/^topic:/, 'Topic: ')}`);
    for (const group of all.filter((g) => g.key.split(' · ')[0] === subject)) {
      const [, kind, stance] = group.key.split(' · ');
      const state = group.due ? (group.promoted && group.units < THRESHOLD ? 'due, promoted' : 'due') : `${group.units} of ${THRESHOLD}`;
      lines.push('', `### ${kind} · ${stance} (${state})`);
      for (const p of group.proposals)
        lines.push('', `Proposal of ${p.date}: ${p.outcome}${p.where ? `, ${p.where}` : ''}. Counted again from then.`);
      if (group.decisions.length) lines.push('', ...decisionRows(group.decisions));
    }
  }
  return lines.join('\n') + '\n';
};

const dueLine = (g: Group): string =>
  `- ${g.key}: ${plural(g.units, 'decision')} that count${g.promoted ? ', one says it is a rule' : ''}`;

export const main = (argv: string[], env = process.env): { out: string; code: number } => {
  const args = parseArgs(argv.slice(1));
  const command = argv[0];
  const log = logPath(args.value('log'), env);
  if (!['add', 'due', 'topics', 'view'].includes(command ?? ''))
    return { out: 'Usage: decisions.ts add --entry=<json> | due | topics | view [--log=<file>]', code: 2 };
  if (!log) return { out: HOW_TO_SET, code: 3 };
  const entries = read(log);
  if (command === 'add') {
    const raw = args.value('entry');
    if (!raw) return { out: 'add: --entry=<json> is missing', code: 2 };
    const entry = entryOf(JSON.parse(raw));
    mkdirSync(path.dirname(log), { recursive: true });
    appendFileSync(log, JSON.stringify(entry) + '\n');
    const after = [...entries, entry];
    writeFileSync(viewPath(log), render(after, log));
    const key = entry.type === 'decision' ? groupOf(entry) : entry.group;
    const group = groups(after).find((g) => g.key === key);
    const state = group?.due ? 'due for a proposal' : `${group?.units ?? 0} of ${THRESHOLD}`;
    return { out: `Recorded in ${log}: ${key}, ${entry.type === 'decision' ? state : entry.outcome}.`, code: 0 };
  }
  if (command === 'due') {
    const found = due(entries);
    return { out: found.length ? ['Due for a proposal:', ...found.map(dueLine)].join('\n') : 'Nothing due.', code: 0 };
  }
  if (command === 'topics') {
    const found = topics(entries);
    return { out: found.length ? found.map(([t, n]) => `- ${t} (${n})`).join('\n') : 'No topic yet.', code: 0 };
  }
  writeFileSync(viewPath(log), render(entries, log));
  return { out: `Written: ${viewPath(log)}`, code: 0 };
};

if (isMain(import.meta.url)) {
  try {
    const { out, code } = main(process.argv.slice(2));
    console.log(out);
    process.exitCode = code;
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
