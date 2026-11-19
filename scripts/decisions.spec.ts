import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  due,
  entryOf,
  groups,
  HOW_TO_SET,
  logPath,
  main,
  parse,
  render,
  topics,
  units,
  viewPath,
  type Decision,
  type Entry,
} from './decisions.ts';
import { tempDir } from './lib/testing.ts';

/** A decision against VC7 in a tool, changed by `over`. */
const decision = (over: Partial<Decision> = {}): Decision =>
  entryOf({
    date: '2026-11-19',
    project: 'alpha',
    view: '/dashboard',
    kind: 'tool',
    source: 'check',
    rule: 'VC7',
    stance: 'departs',
    decided: 'two primary actions side by side',
    why: 'both are used all day',
    ...over,
  }) as Decision;

describe('decisions: an entry', () => {
  it('fills the type and the date, and keeps only the fields it knows', () => {
    const entry = entryOf({ project: 'a', view: 'v', kind: 'page', source: 'correction', topic: 'space-between-groups', stance: 'uncovered', decided: 'more space', why: 'reads as one block', extra: 1 });
    assert.equal(entry.type, 'decision');
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal('extra' in entry, false);
  });

  it('refuses what does not hold together, naming the field', () => {
    const refused = (over: Record<string, unknown>, reason: RegExp) =>
      assert.throws(() => entryOf({ ...decision(), ...over }), reason);
    refused({ topic: 'x' }, /^Error: rule and topic/);
    refused({ stance: 'uncovered' }, /^Error: topic: an uncovered decision names its topic/);
    refused({ rule: undefined, source: 'correction' }, /^Error: rule: a decision that departs names the check id/);
    refused({ rule: undefined, topic: 'x', stance: 'uncovered', source: 'check' }, /^Error: rule: a decision on a check/);
    refused({ rule: undefined, topic: 'Two Words', stance: 'uncovered', source: 'correction' }, /^Error: topic: "Two Words" is not kebab-case/);
    refused({ kind: 'screen' }, /^Error: kind: "screen" is not one of tool, task, page, component/);
    refused({ date: '19/11/2026' }, /^Error: date: "19\/11\/2026" is not YYYY-MM-DD/);
    refused({ why: 'one\ntwo' }, /^Error: why: one line/);
    refused({ why: ' ' }, /^Error: why: a line of text is missing/);
  });

  it('reads a proposal', () => {
    assert.deepEqual(entryOf({ type: 'proposal', date: '2026-11-20', group: 'VC7 · tool · departs' }), {
      type: 'proposal',
      date: '2026-11-20',
      group: 'VC7 · tool · departs',
      outcome: 'proposed',
    });
  });

  it('says which line of the log is wrong', () => {
    const good = JSON.stringify(decision());
    assert.throws(() => parse(`${good}\n\n{"kind":"tool"}\n`), /^Error: line 3: /);
  });
});

describe('decisions: counting', () => {
  it('counts one for the same project and the same view, or the same reason', () => {
    assert.equal(units([decision(), decision({ decided: 'again' })]), 1);
    assert.equal(units([decision(), decision({ view: '/reports', why: 'Both are used all day!' })]), 1);
    assert.equal(units([decision(), decision({ view: '/reports', why: 'the team asked for it' })]), 2);
    assert.equal(units([decision(), decision({ project: 'beta' })]), 2);
  });

  it('is due at three, or at once when the person says it is a rule', () => {
    const two = [decision(), decision({ project: 'beta' })];
    assert.deepEqual(due(two), []);
    assert.deepEqual(due([...two, decision({ project: 'gamma' })]).map((g) => g.key), ['VC7 · tool · departs']);
    assert.deepEqual(due([decision({ promote: true })]).map((g) => [g.key, g.units, g.promoted]), [['VC7 · tool · departs', 1, true]]);
  });

  it('keeps kinds and stances apart, so a tool and a page never look like a contradiction', () => {
    const entries = [decision(), decision({ project: 'beta', kind: 'page' }), decision({ project: 'gamma', stance: 'confirms' })];
    assert.deepEqual(groups(entries).map((g) => [g.key, g.units]), [
      ['VC7 · tool · departs', 1],
      ['VC7 · page · departs', 1],
      ['VC7 · tool · confirms', 1],
    ]);
  });

  it('counts again from zero after a proposal on the group', () => {
    const three = [decision(), decision({ project: 'beta' }), decision({ project: 'gamma' })];
    const proposal = entryOf({ type: 'proposal', date: '2026-11-20', group: 'VC7 · tool · departs' });
    const after: Entry[] = [...three, proposal, decision({ project: 'delta' })];
    assert.deepEqual(due(after), []);
    const [group] = groups(after);
    assert.equal(group.units, 1);
    assert.equal(group.proposals.length, 1);
  });

  it('lists the topics in use, most used first', () => {
    const uncovered = (topic: string, project: string) =>
      decision({ rule: undefined, topic, stance: 'uncovered', source: 'correction', project });
    assert.deepEqual(topics([uncovered('b-topic', 'a'), uncovered('a-topic', 'a'), uncovered('b-topic', 'b')]), [
      ['b-topic', 2],
      ['a-topic', 1],
    ]);
  });
});

describe('decisions: the log and its view', () => {
  it('takes --log, else V2_DECISIONS_LOG, with ~/ expanded; none is null', () => {
    assert.equal(logPath('/a.jsonl', { V2_DECISIONS_LOG: '/b.jsonl' }), '/a.jsonl');
    assert.equal(logPath(undefined, { V2_DECISIONS_LOG: '~/notes/d.jsonl' }, '/home/p'), '/home/p/notes/d.jsonl');
    assert.equal(logPath(undefined, {}), null);
    assert.equal(viewPath('/n/decisions.jsonl'), '/n/decisions.md');
  });

  it('renders by rule, then by kind and stance, with pipes escaped', () => {
    const view = render([decision({ decided: 'a | b' }), decision({ project: 'beta', kind: 'page' })], '/n/d.jsonl');
    assert.match(view, /^# Decisions log\n/);
    assert.match(view, /\n## VC7\n\n### tool · departs \(1 of 3\)\n/);
    assert.match(view, /\n### page · departs \(1 of 3\)\n/);
    assert.match(view, /a \\\| b/);
  });

  it('writes nothing without a log, and says how to set it', () => {
    assert.deepEqual(main(['add', `--entry=${JSON.stringify(decision())}`], {}), { out: HOW_TO_SET, code: 3 });
  });

  it('appends an entry, rewrites the view and says where the group stands', () => {
    const dir = tempDir('decisions');
    const log = path.join(dir, 'decisions.jsonl');
    const env = { V2_DECISIONS_LOG: log };
    writeFileSync(log, JSON.stringify(decision()) + '\n' + JSON.stringify(decision({ project: 'beta' })) + '\n');
    const added = main(['add', `--entry=${JSON.stringify({ ...decision({ project: 'gamma' }), date: undefined })}`], env);
    assert.equal(added.code, 0);
    assert.equal(added.out, `Recorded in ${log}: VC7 · tool · departs, due for a proposal.`);
    assert.equal(parse(readFileSync(log, 'utf8')).length, 3);
    assert.ok(existsSync(path.join(dir, 'decisions.md')));
    assert.match(main(['due'], env).out, /^Due for a proposal:\n- VC7 · tool · departs: 3 decisions that count$/);
  });

  it('refuses a wrong entry without touching the log', () => {
    const dir = tempDir('decisions-wrong');
    const log = path.join(dir, 'decisions.jsonl');
    assert.throws(() => main(['add', '--entry={"kind":"tool"}'], { V2_DECISIONS_LOG: log }), /stance/);
    assert.equal(existsSync(log), false);
  });

  it('creates the folder of the log on the first entry', () => {
    const log = path.join(tempDir('decisions-new'), 'decisions', 'decisions.jsonl');
    assert.equal(main(['add', `--entry=${JSON.stringify(decision())}`], { V2_DECISIONS_LOG: log }).code, 0);
    assert.equal(parse(readFileSync(log, 'utf8')).length, 1);
  });
});
