import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  END,
  START,
  compare,
  diagramOf,
  escapeLabel,
  extractMap,
  into,
  legendOf,
  marksOf,
  pageOf,
  parseMap,
  render,
  styleOf,
  summaryOf,
  type MapSpec,
} from './map.ts';

const plan = (): MapSpec =>
  parseMap({
    title: 'Add /v2:map',
    mode: 'planned',
    source: 'the plan',
    groups: [
      { id: 'skills', label: 'skills/' },
      { id: 'scripts', label: 'scripts/' },
      { id: 'lib', label: 'lib/', parent: 'scripts' },
    ],
    nodes: [
      { id: 'skill', label: '/v2:map', kind: 'method', change: 'new', group: 'skills' },
      { id: 'status', label: '/v2:status', kind: 'method', change: 'changed', group: 'skills' },
      { id: 'script', label: 'map.ts', kind: 'method', change: 'new', group: 'scripts' },
      { id: 'markdown', label: 'markdown.ts', kind: 'external', group: 'lib' },
      { id: 'old', label: 'oldMap()', kind: 'method', change: 'removed', breaking: true, group: 'scripts' },
    ],
    edges: [
      { from: 'skill', to: 'script', label: 'runs' },
      { from: 'status', to: 'skill', dashed: true },
      { from: 'script', to: 'markdown' },
    ],
  });

const done = (): MapSpec => {
  const spec = plan();
  return {
    ...spec,
    mode: 'done',
    nodes: [
      ...spec.nodes.filter((n) => n.id !== 'status' && n.id !== 'markdown' && n.id !== 'old'),
      { id: 'old', label: 'oldMap()', kind: 'method', change: 'unchanged', group: 'scripts' },
      { id: 'page', label: 'the page', kind: 'surface', change: 'new' },
      { id: 'script-2', label: 'map.ts', kind: 'method', change: 'changed', breaking: 'possible', group: 'scripts' },
    ],
    edges: [{ from: 'skill', to: 'script', label: 'runs' }],
  };
};

describe('parseMap', () => {
  it('fills what is optional: unchanged, left to right, no groups, no edges', () => {
    const spec = parseMap({ title: 't', mode: 'done', nodes: [{ id: 'a', label: 'A', kind: 'entity' }] });
    assert.equal(spec.direction, 'LR');
    assert.deepEqual(spec.nodes, [{ id: 'a', label: 'A', kind: 'entity', change: 'unchanged' }]);
    assert.deepEqual(spec.groups, []);
    assert.deepEqual(spec.edges, []);
  });

  it('refuses what would draw a wrong map', () => {
    const node = { id: 'a', label: 'A', kind: 'entity' };
    const refuses = (raw: unknown, message: RegExp) => assert.throws(() => parseMap(raw), message);
    refuses({ title: 't', mode: 'later', nodes: [node] }, /mode must be/);
    refuses({ title: 't', mode: 'done', nodes: [] }, /at least one node/);
    refuses({ title: 't', mode: 'done', nodes: [{ ...node, kind: 'thing' }] }, /kind must be one of entity/);
    refuses({ title: 't', mode: 'done', nodes: [{ ...node, change: 'moved' }] }, /change must be one of/);
    refuses({ title: 't', mode: 'done', nodes: [{ ...node, breaking: 'yes' }] }, /breaking must be true or "possible"/);
    refuses({ title: 't', mode: 'done', nodes: [node, node] }, /two nodes have the id "a"/);
    refuses({ title: 't', mode: 'done', nodes: [{ ...node, group: 'g' }] }, /no group "g"/);
    refuses({ title: 't', mode: 'done', nodes: [node], edges: [{ from: 'a', to: 'b' }] }, /no node "b"/);
    refuses(
      { title: 't', mode: 'done', groups: [{ id: 'g', label: 'G', parent: 'h' }, { id: 'h', label: 'H', parent: 'g' }], nodes: [node] },
      /inside itself/,
    );
  });
});

describe('the marks', () => {
  it('say the change, whether it breaks and how it stands against the plan', () => {
    const [skill, , , markdown, old] = plan().nodes;
    assert.deepEqual(marksOf(skill), ['+ new']);
    assert.deepEqual(marksOf(markdown), []);
    assert.deepEqual(marksOf(old), ['\u2212 removed', '\u26a0 breaking']);
    assert.deepEqual(marksOf({ ...skill, change: 'renamed', was: 'plan' }), ['~ renamed from plan']);
    assert.deepEqual(marksOf({ ...skill, breaking: 'possible', plan: 'not done' }), ['+ new', '\u26a0? maybe breaking', '\u25cc not done']);
  });

  it('draw a breaking change red and thick, a removal dashed, context thin, what was not done grey', () => {
    const [skill, , , markdown, old] = plan().nodes;
    assert.match(styleOf(skill), /fill:#dcfce7,stroke:#15803d,stroke-width:2px/);
    assert.match(styleOf(markdown), /stroke-width:1px/);
    assert.match(styleOf(old), /stroke:#dc2626,stroke-width:4px,stroke-dasharray:5 4/);
    assert.match(styleOf({ ...skill, breaking: 'possible' }), /stroke:#dc2626,stroke-width:3px,stroke-dasharray:6 3/);
    assert.match(styleOf({ ...skill, plan: 'not done' }), /^fill:#f8fafc,stroke:#94a3b8/);
  });
});

describe('the diagram', () => {
  it('escapes what Mermaid or HTML would read, # first', () => {
    assert.equal(escapeLabel('a & <b>"#1"</b> `x`'), 'a #38; #60;b#62;#34;#35;1#34;#60;/b#62; #96;x#96;');
  });

  it('draws each kind with its shape, inside its groups, with safe ids and one class per look', () => {
    const spec = plan();
    const text = diagramOf(spec, spec.groups, spec.nodes, spec.edges);
    assert.match(text, /^flowchart LR$/m);
    assert.match(text, /^ {2}subgraph g_scripts\["scripts\/"\]$/m);
    assert.match(text, /^ {4}subgraph g_lib\["lib\/"\]$/m);
    assert.match(text, /^ {6}n_markdown\("markdown\.ts"\)$/m);
    assert.match(text, /^ {4}n_skill\(\["\/v2:map<br\/><i>\+ new<\/i>"\]\)$/m);
    assert.match(text, /^ {4}n_old\(\["oldMap\(\)<br\/><i>\u2212 removed \u00b7 \u26a0 breaking<\/i>"\]\)$/m);
    assert.match(text, /^ {2}n_skill -->\|"runs"\| n_script$/m);
    assert.match(text, /^ {2}n_status -\.-> n_skill$/m);
    assert.match(text, /^ {2}class n_skill,n_script method_new$/m);
    assert.match(text, /^ {2}classDef method_removed_breaking fill:#dcfce7,stroke:#dc2626/m);
    assert.match(text, /^ {2}style g_lib fill:none/m);
  });

  it('keeps ids apart when they differ only by punctuation, and leaves out empty groups', () => {
    const spec = parseMap({
      title: 't',
      mode: 'done',
      groups: [{ id: 'empty', label: 'Empty' }],
      nodes: [
        { id: 'a-b', label: 'one', kind: 'entity' },
        { id: 'a.b', label: 'two', kind: 'entity' },
        { id: 'end', label: 'three', kind: 'concept' },
      ],
    });
    const text = diagramOf(spec, spec.groups, spec.nodes, spec.edges);
    assert.match(text, /n_a_b\["one"\]/);
    assert.match(text, /n_a_b_2\["two"\]/);
    assert.match(text, /n_end\{\{"three"\}\}/);
    assert.doesNotMatch(text, /subgraph/);
  });
});

describe('compare', () => {
  it('shows what was not done, what was not planned and what changed from the plan, never context', () => {
    const result = compare(plan(), done());
    const byId = new Map(result.nodes.map((n) => [n.id, n]));
    assert.equal(byId.get('status')?.plan, 'not done');
    assert.equal(byId.get('old')?.plan, 'not done', 'planned work shown only as context is not done');
    assert.equal(byId.get('old')?.change, 'removed');
    assert.equal(byId.get('page')?.plan, 'not planned');
    assert.equal(byId.get('script-2')?.plan, 'not planned');
    assert.equal(byId.get('markdown'), undefined, 'context of the plan is not compared');
    assert.deepEqual(result.counts, { planned: 4, done: 2, notDone: 2, notPlanned: 2 });
    assert.deepEqual(
      result.differences.map((d) => [d.node.id, d.planned, d.done]),
      [
        ['old', '\u2212 removed \u00b7 \u26a0 breaking', 'not done'],
        ['page', 'not planned', '+ new'],
        ['script-2', 'not planned', '~ changed \u00b7 \u26a0? maybe breaking'],
        ['status', '~ changed', 'not done'],
      ],
    );
    // the edge of the plan comes back with what was not done; the group of the plan with it
    assert.ok(result.edges.some((e) => e.from === 'status' && e.to === 'skill'));
    assert.deepEqual(result.groups.map((g) => g.id), ['skills', 'scripts', 'lib']);
  });

  it('lists a change that differs from the plan', () => {
    const work = plan();
    work.nodes[2] = { ...work.nodes[2], breaking: true };
    const result = compare(plan(), work);
    assert.deepEqual(result.differences.map((d) => [d.node.id, d.planned, d.done]), [
      ['script', '+ new', '+ new \u00b7 \u26a0 breaking'],
    ]);
  });
});

describe('render', () => {
  it('sums the map up, then draws it, then says it in words, breaking first', () => {
    const { markdown } = render(plan());
    const lines = markdown.split('\n');
    assert.equal(lines[0], START);
    assert.equal(lines[1], '### Map: Add /v2:map (planned)');
    assert.equal(lines[3], '5 things: 2 new, 1 changed, 1 removed, 1 for context; 1 breaking. From the plan.');
    assert.equal(lines[5], '```mermaid');
    assert.ok(markdown.indexOf('```mermaid') < markdown.indexOf('| What | Where |'));
    const rows = lines.filter((line) => line.startsWith('| ') && !line.startsWith('| What'));
    assert.match(rows[0], /^\| oldMap\(\) \| scripts\/ \| .* method \| \u2212 removed \u00b7 \u26a0 breaking \|/);
    assert.equal(rows.length, 4, 'context is drawn, not listed');
    assert.equal(lines.at(-1), END);
  });

  it('never lets a label become HTML in a table', () => {
    const spec = parseMap({ title: 't', mode: 'done', nodes: [{ id: 'a', label: 'Map<string> | x', kind: 'entity', change: 'new' }] });
    assert.match(render(spec).markdown, /\| Map&lt;string> \\\| x \|/);
  });

  it('compares with the plan in the body of an issue', () => {
    const body = `The issue.\n\n${render(plan()).markdown}\n`;
    const { markdown } = render(done(), parseMap(extractMap(body)));
    assert.match(markdown, /Against the plan: 2 of 4 planned things done, 2 not done, 2 not planned\./);
    assert.match(markdown, /\*\*Plan against work\*\*/);
    assert.match(markdown, /\| \/v2:status \| .* method \| ~ changed \| not done \|/);
  });
});

describe('the hidden map', () => {
  it('comes back the same from a body, its comment never ended early', () => {
    const spec = parseMap({
      title: 'a --> b <!-- c -->',
      mode: 'planned',
      nodes: [{ id: 'x', label: '--flag', kind: 'method', change: 'new', note: '<b>' }],
    });
    const { markdown } = render(spec);
    const comment = markdown.split('\n').find((line) => line.startsWith('<!-- v2:map {'))!;
    assert.equal(comment.indexOf('-->'), comment.length - 3);
    assert.deepEqual(parseMap(extractMap(`text\n${markdown}\nmore`)), spec);
  });

  it('reads JSON as it is, and says when a text holds no map', () => {
    assert.deepEqual(extractMap(' {"a": 1} '), { a: 1 });
    assert.throws(() => extractMap('just an issue'), /no map in it/);
  });
});

describe('into', () => {
  it('replaces the map a body holds, else adds it at the end', () => {
    const block = `${START}\nnew map\n${END}`;
    assert.equal(into('', block), `${block}\n`);
    assert.equal(into('Text.\n', block), `Text.\n\n${block}\n`);
    assert.equal(into(`Text.\n\n${START}\nold map\n${END}\n\nAfter.`, block), `Text.\n\n${block}\n\nAfter.`);
  });
});

describe('the page', () => {
  it('draws the diagram from its source, keeps the words, and never lets a label close the script', () => {
    const spec = parseMap({ title: 'T <x>', mode: 'done', nodes: [{ id: 'a', label: '</script>', kind: 'entity', change: 'new' }] });
    const page = pageOf(spec, render(spec));
    assert.match(page, /<title>Map: T &lt;x&gt;<\/title>/);
    assert.match(page, /mermaid@\d+\.\d+\.\d+\/dist\/mermaid\.esm\.min\.mjs/);
    assert.equal(page.match(/<\/script>/g)?.length, 1, 'only the script of the page closes');
    assert.match(page, /<td>&lt;\/script&gt;<\/td>/);
  });
});

describe('the words', () => {
  it('count only what is shown and give the legend of what is used', () => {
    const nodes = compare(plan(), done()).nodes;
    assert.equal(summaryOf(nodes), '4 things: 3 new, 1 changed; 1 maybe breaking.');
    const legend = legendOf(plan().nodes);
    assert.match(legend, /method \(pill\)/);
    assert.match(legend, /external \(rounded\)/);
    assert.doesNotMatch(legend, /concept/);
    assert.match(legend, /\u26a0 breaking \(thick red border\)/);
  });
});
