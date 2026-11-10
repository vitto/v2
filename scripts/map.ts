/*
  The map of a piece of work: what it is made of (its entities, methods, concepts, axes, what
  people see), grouped by where each thing lives, colored and shaped by kind, marked by what
  changes, breaking changes first. The skill /v2:map writes the facts as JSON and shows what this
  prints, before the work (planned) or after it (done).

    node scripts/map.ts <map.json | -> [--plan=<file>] [--html=<file>] [--into=<file>]
        print the map in Markdown: a line that sums it up, a Mermaid diagram, its legend, the
        table of what changes (the diagram in words, for whoever cannot see it) and, in a hidden
        comment, the map itself, so a later map can be compared with it; `-` reads it from stdin
        --plan=<file>  compare with an earlier map, the plan: a JSON file, or Markdown holding a
                       map, such as the body of the issue it was added to
        --html=<file>  also write a page that draws the diagram, to open in a browser
        --into=<file>  also write the map into a Markdown file (the body of an issue or of a pull
                       request): in place of the map it holds, else at its end

  The map, as JSON:

    {
      "title": "Add /v2:map",
      "mode": "planned" | "done",
      "source": "where the facts come from: the plan of the conversation, issue #12, the diff",
      "direction": "LR" | "TB",                       (optional, LR by default)
      "groups": [{ "id": "scripts", "label": "scripts/", "parent": "..." }],
      "nodes": [{
        "id": "map-script", "label": "map.ts", "group": "scripts",
        "kind": "entity" | "method" | "concept" | "axis" | "surface" | "external",
        "change": "new" | "changed" | "renamed" | "removed" | "unchanged",   (unchanged by default)
        "was": "the old name, when renamed",
        "breaking": true | "possible",                (optional)
        "note": "what changes, or who it breaks"     (optional)
      }],
      "edges": [{ "from": "map-skill", "to": "map-script", "label": "runs", "dashed": true }]
    }

  Where each answer comes from:

  - every thing, group and relation: the JSON given, which the skill writes from the plan or from
    the diff; nothing is guessed here;
  - the comparison with the plan: by id. A planned thing missing from the map is "not done", a
    changed thing missing from the plan is "not planned", one whose change or breaking differs is
    listed with both; things shown for context (unchanged) are never compared;
  - the page of --html: Mermaid from jsDelivr, its version pinned below; without a network it
    shows the source of the diagram instead.
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { isMain, parseArgs } from './lib/args.ts';
import { cell, plural, table } from './lib/markdown.ts';

export const KIND_NAMES = ['entity', 'method', 'concept', 'axis', 'surface', 'external'] as const;
export const CHANGE_NAMES = ['new', 'changed', 'renamed', 'removed', 'unchanged'] as const;

export type Kind = (typeof KIND_NAMES)[number];
export type Change = (typeof CHANGE_NAMES)[number];

export interface Group {
  id: string;
  label: string;
  parent?: string;
}

export interface Node {
  id: string;
  label: string;
  kind: Kind;
  change: Change;
  was?: string;
  breaking?: true | 'possible';
  group?: string;
  note?: string;
}

export interface Edge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface MapSpec {
  title: string;
  mode: 'planned' | 'done';
  source?: string;
  direction: 'LR' | 'TB' | 'RL' | 'BT';
  groups: Group[];
  nodes: Node[];
  edges: Edge[];
}

/** A thing as drawn: with the comparison, whether the plan had it and the work did it. */
export interface Shown extends Node {
  plan?: 'not done' | 'not planned';
}

/** How each kind looks: a shape and a color, so a kind reads without its color too. */
export const KINDS: Record<
  Kind,
  { square: string; shape: string; open: string; close: string; fill: string; stroke: string; what: string }
> = {
  entity: {
    square: '\u{1F7E6}',
    shape: 'rectangle',
    open: '["',
    close: '"]',
    fill: '#dbeafe',
    stroke: '#1d4ed8',
    what: 'holds data or state: a type, a model, a component, a schema, a config, a token',
  },
  method: {
    square: '\u{1F7E9}',
    shape: 'pill',
    open: '(["',
    close: '"])',
    fill: '#dcfce7',
    stroke: '#15803d',
    what: 'does something: a function, a command, a script, a skill, an endpoint, a hook',
  },
  concept: {
    square: '\u{1F7EA}',
    shape: 'hexagon',
    open: '{{"',
    close: '"}}',
    fill: '#ede9fe',
    stroke: '#6d28d9',
    what: 'an idea or a rule: a principle, a convention, a state, a decision',
  },
  axis: {
    square: '\u{1F7E8}',
    shape: 'parallelogram',
    open: '[/"',
    close: '"/]',
    fill: '#fef9c3',
    stroke: '#a16207',
    what: 'a dimension things vary along: a variant, a size, a theme, a mode, a locale',
  },
  surface: {
    square: '\u{1F7EB}',
    shape: 'flag',
    open: '>"',
    close: '"]',
    fill: '#f3e8dc',
    stroke: '#7c4a1e',
    what: 'what people see or read: a page, a screen, a message, an output, the docs',
  },
  external: {
    square: '\u2b1c',
    shape: 'rounded',
    open: '("',
    close: '")',
    fill: '#f1f5f9',
    stroke: '#64748b',
    what: 'outside the work, shown for context: a library, a service, another package',
  },
};

const INK = '#0f172a';
const RED = '#dc2626';
const GHOST = 'fill:#f8fafc,stroke:#94a3b8,stroke-width:1.5px,stroke-dasharray:3 3,color:#64748b';
const GROUP = 'fill:none,stroke:#94a3b8,stroke-width:1px';
const DOT = ' \u00b7 ';
export const MERMAID = 'mermaid@11.4.1';

export const START = '<!-- v2:map:start -->';
export const END = '<!-- v2:map:end -->';

/** What a change says on the thing. */
const changeMark = (node: Node): string | null => {
  switch (node.change) {
    case 'new':
      return '+ new';
    case 'changed':
      return '~ changed';
    case 'renamed':
      return node.was ? `~ renamed from ${node.was}` : '~ renamed';
    case 'removed':
      return '\u2212 removed';
    default:
      return null;
  }
};

/** Every mark of a thing: its change, whether it breaks, how it stands against the plan. */
export const marksOf = (node: Shown): string[] =>
  [
    changeMark(node),
    node.breaking === true ? '\u26a0 breaking' : node.breaking === 'possible' ? '\u26a0? maybe breaking' : null,
    node.plan === 'not done' ? '\u25cc not done' : node.plan === 'not planned' ? '\u25c6 not planned' : null,
  ].filter((mark): mark is string => mark !== null);

/** Whether a thing is part of the work, not only shown for context. */
const isWork = (node: Node): boolean => node.change !== 'unchanged' || node.breaking !== undefined;

// ---------------------------------------------------------------------------------------------
// The map given

const fail = (message: string): never => {
  throw new Error(`map: ${message}`);
};

const text = (value: unknown, what: string): string => {
  if (typeof value !== 'string' || !value.trim()) fail(`${what} must be a text`);
  return (value as string).trim();
};

const optional = (value: unknown, what: string): string | undefined =>
  value === undefined || value === null || value === '' ? undefined : text(value, what);

/** The map from its JSON, checked: every reference resolves, every kind and change is known. */
export const parseMap = (raw: unknown): MapSpec => {
  if (!raw || typeof raw !== 'object') fail('the map must be a JSON object');
  const input = raw as Record<string, unknown>;
  const mode = input.mode;
  if (mode !== 'planned' && mode !== 'done') fail('mode must be "planned" or "done"');
  const direction = input.direction ?? 'LR';
  if (!['LR', 'TB', 'RL', 'BT'].includes(direction as string)) fail('direction must be LR, TB, RL or BT');

  const groups: Group[] = ((input.groups ?? []) as Record<string, unknown>[]).map((g, i) => ({
    id: text(g?.id, `groups[${i}].id`),
    label: text(g?.label, `groups[${i}].label`),
    parent: optional(g?.parent, `groups[${i}].parent`),
  }));
  const groupIds = new Set<string>();
  for (const g of groups) {
    if (groupIds.has(g.id)) fail(`two groups have the id "${g.id}"`);
    groupIds.add(g.id);
  }
  for (const g of groups) {
    if (g.parent !== undefined && !groupIds.has(g.parent)) fail(`group "${g.id}": no group "${g.parent}"`);
    // a parent chain longer than the groups is a loop
    let at: Group | undefined = g;
    for (let steps = 0; at?.parent !== undefined; steps++) {
      if (steps > groups.length) fail(`group "${g.id}" is inside itself`);
      at = groups.find((other) => other.id === at!.parent);
    }
  }

  if (!Array.isArray(input.nodes) || input.nodes.length === 0) fail('the map needs at least one node');
  const nodes: Node[] = (input.nodes as Record<string, unknown>[]).map((n, i) => {
    const where = `nodes[${i}]`;
    const kind = n?.kind;
    if (!KIND_NAMES.includes(kind as Kind)) fail(`${where}.kind must be one of ${KIND_NAMES.join(', ')}`);
    const change = n?.change ?? 'unchanged';
    if (!CHANGE_NAMES.includes(change as Change)) fail(`${where}.change must be one of ${CHANGE_NAMES.join(', ')}`);
    const breaking = n?.breaking;
    if (breaking !== undefined && breaking !== false && breaking !== true && breaking !== 'possible')
      fail(`${where}.breaking must be true or "possible"`);
    const group = optional(n?.group, `${where}.group`);
    if (group !== undefined && !groupIds.has(group)) fail(`${where}: no group "${group}"`);
    const node: Node = {
      id: text(n?.id, `${where}.id`),
      label: text(n?.label, `${where}.label`),
      kind: kind as Kind,
      change: change as Change,
    };
    const was = optional(n?.was, `${where}.was`);
    if (was !== undefined) node.was = was;
    if (breaking === true || breaking === 'possible') node.breaking = breaking;
    if (group !== undefined) node.group = group;
    const note = optional(n?.note, `${where}.note`);
    if (note !== undefined) node.note = note;
    return node;
  });
  const nodeIds = new Set<string>();
  for (const n of nodes) {
    if (nodeIds.has(n.id)) fail(`two nodes have the id "${n.id}"`);
    nodeIds.add(n.id);
  }

  const edges: Edge[] = ((input.edges ?? []) as Record<string, unknown>[]).map((e, i) => {
    const edge: Edge = { from: text(e?.from, `edges[${i}].from`), to: text(e?.to, `edges[${i}].to`) };
    for (const end of [edge.from, edge.to]) if (!nodeIds.has(end)) fail(`edges[${i}]: no node "${end}"`);
    const label = optional(e?.label, `edges[${i}].label`);
    if (label !== undefined) edge.label = label;
    if (e?.dashed === true) edge.dashed = true;
    return edge;
  });

  const spec: MapSpec = {
    title: text(input.title, 'title'),
    mode: mode as MapSpec['mode'],
    direction: direction as MapSpec['direction'],
    groups,
    nodes,
    edges,
  };
  const source = optional(input.source, 'source');
  if (source !== undefined) spec.source = source;
  return spec;
};

/** The map a text holds: the text itself as JSON, or the map hidden in a Markdown body. */
export const extractMap = (content: string): unknown => {
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const hidden = /<!-- v2:map (\{[\s\S]*?\}) -->/.exec(content);
  if (!hidden) fail('no map in it: neither JSON nor a body holding a map of /v2:map');
  return JSON.parse(hidden![1]);
};

// ---------------------------------------------------------------------------------------------
// Against the plan

export interface Difference {
  node: Shown;
  planned: string;
  done: string;
}

export interface Compared {
  nodes: Shown[];
  groups: Group[];
  edges: Edge[];
  differences: Difference[];
  counts: { planned: number; done: number; notDone: number; notPlanned: number };
}

const sameWork = (a: Node, b: Node): boolean => a.change === b.change && a.breaking === b.breaking;

/** The work beside its plan, by id. */
export const compare = (plan: MapSpec, done: MapSpec): Compared => {
  const planned = new Map(plan.nodes.map((n) => [n.id, n]));
  const doneIds = new Set(done.nodes.map((n) => n.id));
  const differences: Difference[] = [];
  const marks = (node: Node) => marksOf(node).join(DOT) || 'for context';

  const nodes: Shown[] = done.nodes.map((n) => {
    const before = planned.get(n.id);
    const wasWork = before !== undefined && isWork(before);
    if (isWork(n) && !wasWork) {
      const shown: Shown = { ...n, plan: 'not planned' };
      differences.push({ node: shown, planned: before ? 'for context' : 'not planned', done: marks(n) });
      return shown;
    }
    if (wasWork && !isWork(n)) {
      // planned work the map shows only as context: drawn as planned, not done
      const shown: Shown = { ...before, plan: 'not done' };
      if (n.group !== undefined) shown.group = n.group;
      differences.push({ node: shown, planned: marks(before), done: 'not done' });
      return shown;
    }
    if (wasWork && !sameWork(before, n)) differences.push({ node: n, planned: marks(before), done: marks(n) });
    return n;
  });
  // what the plan had and the work has not, in the order of the plan, context left out
  for (const n of plan.nodes)
    if (!doneIds.has(n.id) && isWork(n)) {
      const shown: Shown = { ...n, plan: 'not done' };
      nodes.push(shown);
      differences.push({ node: shown, planned: marks(n), done: 'not done' });
    }

  const shownIds = new Set(nodes.map((n) => n.id));
  const groups = [...done.groups];
  const groupIds = new Set(groups.map((g) => g.id));
  const needed = new Set(nodes.map((n) => n.group).filter((g): g is string => !!g));
  // the groups of the plan that hold what is not done, with their parents
  const pending = plan.groups.filter((g) => !groupIds.has(g.id));
  let added = true;
  while (added) {
    added = false;
    for (const g of pending)
      if (!groupIds.has(g.id) && needed.has(g.id)) {
        groups.push(g);
        groupIds.add(g.id);
        if (g.parent) needed.add(g.parent);
        added = true;
      }
  }
  const key = (e: Edge) => `${e.from}\u0000${e.to}`;
  const edgeKeys = new Set(done.edges.map(key));
  const edges = [
    ...done.edges,
    ...plan.edges.filter((e) => !edgeKeys.has(key(e)) && shownIds.has(e.from) && shownIds.has(e.to)),
  ];

  const work = plan.nodes.filter(isWork);
  const notDone = nodes.filter((n) => n.plan === 'not done').length;
  return {
    nodes,
    groups,
    edges,
    differences,
    counts: {
      planned: work.length,
      done: work.length - notDone,
      notDone,
      notPlanned: nodes.filter((n) => n.plan === 'not planned').length,
    },
  };
};

// ---------------------------------------------------------------------------------------------
// The diagram

/**
 * A text inside a Mermaid label: its entity codes for what Mermaid or HTML would read
 * (`#` first, since every code starts with it).
 */
export const escapeLabel = (value: string): string =>
  value
    .replace(/#/g, '#35;')
    .replace(/&/g, '#38;')
    .replace(/"/g, '#34;')
    .replace(/</g, '#60;')
    .replace(/>/g, '#62;')
    .replace(/`/g, '#96;')
    .replace(/\r?\n/g, ' ');

/** Ids Mermaid accepts, the same for the same id, never a keyword (`end`, `class`). */
const idsOf = (prefix: string, ids: string[]): Map<string, string> => {
  const out = new Map<string, string>();
  const taken = new Set<string>();
  for (const id of ids) {
    const base = `${prefix}${id.replace(/[^A-Za-z0-9_]/g, '_')}`;
    let safe = base;
    for (let i = 2; taken.has(safe); i++) safe = `${base}_${i}`;
    taken.add(safe);
    out.set(id, safe);
  }
  return out;
};

/** The style of a thing: the color of its kind, the stroke of its change, red when it breaks. */
export const styleOf = (node: Shown): string => {
  if (node.plan === 'not done') return GHOST;
  const kind = KINDS[node.kind];
  let stroke = kind.stroke;
  let width = node.change === 'unchanged' ? '1px' : '2px';
  let dash = node.change === 'removed' ? '5 4' : '';
  if (node.breaking === true) {
    stroke = RED;
    width = '4px';
  } else if (node.breaking === 'possible') {
    stroke = RED;
    width = '3px';
    dash = '6 3';
  }
  return [`fill:${kind.fill}`, `stroke:${stroke}`, `stroke-width:${width}`, dash && `stroke-dasharray:${dash}`, `color:${INK}`]
    .filter(Boolean)
    .join(',');
};

/** The name of the class of a style: the same look, the same class. */
const classOf = (node: Shown): string =>
  [
    node.kind,
    node.change,
    node.breaking === true ? 'breaking' : node.breaking === 'possible' ? 'maybe' : '',
    node.plan === 'not done' ? 'notdone' : '',
  ]
    .filter(Boolean)
    .join('_');

/** The Mermaid flowchart of the things, inside their groups, with their relations. */
export const diagramOf = (spec: Pick<MapSpec, 'direction'>, groups: Group[], nodes: Shown[], edges: Edge[]): string => {
  const nodeIds = idsOf('n_', nodes.map((n) => n.id));
  const groupIds = idsOf('g_', groups.map((g) => g.id));
  const lines = [`flowchart ${spec.direction}`];

  const nodeLine = (node: Shown, indent: string) => {
    const marks = marksOf(node);
    const label = escapeLabel(node.label) + (marks.length ? `<br/><i>${marks.map(escapeLabel).join(DOT)}</i>` : '');
    const { open, close } = KINDS[node.kind];
    lines.push(`${indent}${nodeIds.get(node.id)}${open}${label}${close}`);
  };
  // a group with nothing inside, at any depth, is left out: Mermaid would draw an empty box
  const holds = (group: Group): boolean =>
    nodes.some((n) => n.group === group.id) || groups.some((g) => g.parent === group.id && holds(g));
  const drawn: string[] = [];
  const groupBlock = (group: Group, depth: number) => {
    if (!holds(group)) return;
    const indent = '  '.repeat(depth);
    lines.push(`${indent}subgraph ${groupIds.get(group.id)}["${escapeLabel(group.label)}"]`);
    for (const node of nodes) if (node.group === group.id) nodeLine(node, `${indent}  `);
    for (const child of groups) if (child.parent === group.id) groupBlock(child, depth + 1);
    lines.push(`${indent}end`);
    drawn.push(group.id);
  };

  const known = new Set(groups.map((g) => g.id));
  for (const node of nodes) if (node.group === undefined || !known.has(node.group)) nodeLine(node, '  ');
  for (const group of groups) if (group.parent === undefined) groupBlock(group, 1);
  for (const edge of edges) {
    const arrow = edge.dashed ? '-.->' : '-->';
    const label = edge.label ? `|"${escapeLabel(edge.label)}"|` : '';
    lines.push(`  ${nodeIds.get(edge.from)} ${arrow}${label} ${nodeIds.get(edge.to)}`);
  }

  const classes = new Map<string, { style: string; ids: string[] }>();
  for (const node of nodes) {
    const name = classOf(node);
    const entry = classes.get(name) ?? { style: styleOf(node), ids: [] };
    entry.ids.push(nodeIds.get(node.id)!);
    classes.set(name, entry);
  }
  for (const [name, { style }] of classes) lines.push(`  classDef ${name} ${style}`);
  for (const [name, { ids }] of classes) lines.push(`  class ${ids.join(',')} ${name}`);
  for (const id of drawn) lines.push(`  style ${groupIds.get(id)} ${GROUP}`);
  return lines.join('\n');
};

// ---------------------------------------------------------------------------------------------
// The words around it

/** `9 things: 5 new, 3 changed, 1 for context; 1 breaking.` */
export const summaryOf = (nodes: Shown[]): string => {
  const shown = nodes.filter((n) => n.plan !== 'not done');
  const count = (change: Change) => shown.filter((n) => n.change === change).length;
  const changes = [
    ['new', count('new')],
    ['changed', count('changed')],
    ['renamed', count('renamed')],
    ['removed', count('removed')],
    ['for context', count('unchanged')],
  ]
    .filter(([, n]) => n)
    .map(([what, n]) => `${n} ${what}`);
  const breaking = shown.filter((n) => n.breaking === true).length;
  const maybe = shown.filter((n) => n.breaking === 'possible').length;
  const risks = [breaking && `${breaking} breaking`, maybe && `${maybe} maybe breaking`].filter(Boolean);
  return `${plural(shown.length, 'thing')}: ${changes.join(', ')}${risks.length ? `; ${risks.join(', ')}` : ''}.`;
};

/** The legend of what the diagram uses, and only that. */
export const legendOf = (nodes: Shown[]): string => {
  const kinds = KIND_NAMES.filter((kind) => nodes.some((n) => n.kind === kind)).map(
    (kind) => `${KINDS[kind].square} ${kind} (${KINDS[kind].shape})`,
  );
  const marks = [
    nodes.some((n) => n.change === 'new') && '+ new',
    nodes.some((n) => n.change === 'changed' || n.change === 'renamed') && '~ changed',
    nodes.some((n) => n.change === 'removed') && '\u2212 removed (dashed)',
    nodes.some((n) => n.breaking === true) && '\u26a0 breaking (thick red border)',
    nodes.some((n) => n.breaking === 'possible') && '\u26a0? maybe breaking (dashed red border)',
    nodes.some((n) => n.plan === 'not done') && '\u25cc not done (grey, dotted)',
    nodes.some((n) => n.plan === 'not planned') && '\u25c6 not planned',
    nodes.some((n) => n.change === 'unchanged' && !n.breaking) && 'thin border: for context, unchanged',
  ].filter((mark): mark is string => !!mark);
  return `Legend: ${kinds.join(DOT)}. ${marks.join(DOT)}.`;
};

/** Where a thing lives: its group, inside its parents. */
const whereOf = (groups: Group[], id: string | undefined): string => {
  const path: string[] = [];
  for (let at = groups.find((g) => g.id === id); at; at = groups.find((g) => g.id === at!.parent)) path.unshift(at.label);
  return path.join(' / ');
};

/** What changes, breaking first and what was not done last: the diagram in words. */
export const changeRows = (groups: Group[], nodes: Shown[]): string[][] => {
  const rank = (n: Shown) =>
    n.plan === 'not done' ? 3 : n.breaking === true ? 0 : n.breaking === 'possible' ? 1 : 2;
  return nodes
    .filter((n) => isWork(n) || n.plan)
    .map((n, i) => ({ n, i }))
    .sort((a, b) => rank(a.n) - rank(b.n) || a.i - b.i)
    .map(({ n }) => [n.label, whereOf(groups, n.group) || '-', `${KINDS[n.kind].square} ${n.kind}`, marksOf(n).join(DOT), n.note ?? '']);
};

/** A cell of a Markdown table whose text is never read as HTML (`Map<string>`, `<b>`). */
const textCell = (value: string): string => cell(value).replace(/</g, '&lt;');

/** The map hidden in a comment: JSON whose `<`, `>` and `-` cannot end the comment. */
export const hiddenOf = (spec: MapSpec): string =>
  `<!-- v2:map ${JSON.stringify({ version: 1, ...spec })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/-/g, '\\u002d')} -->`;

export interface Rendered {
  markdown: string;
  diagram: string;
  summary: string;
  against: string | null;
  rows: string[][];
  differences: string[][];
  nodes: Shown[];
}

/** The map, compared with its plan when there is one. */
export const render = (spec: MapSpec, plan?: MapSpec): Rendered => {
  const compared = plan ? compare(plan, spec) : null;
  const nodes: Shown[] = compared?.nodes ?? spec.nodes;
  const groups = compared?.groups ?? spec.groups;
  const edges = compared?.edges ?? spec.edges;
  const diagram = diagramOf(spec, groups, nodes, edges);
  const summary = summaryOf(nodes);
  const against = compared
    ? `Against the plan: ${compared.counts.done} of ${plural(compared.counts.planned, 'planned thing')} done` +
      `, ${compared.counts.notDone} not done, ${compared.counts.notPlanned} not planned.`
    : null;
  const rows = changeRows(groups, nodes);
  const differences = (compared?.differences ?? []).map((d) => [d.node.label, `${KINDS[d.node.kind].square} ${d.node.kind}`, d.planned, d.done]);

  const markdown = [
    START,
    `### Map: ${spec.title} (${spec.mode})`,
    '',
    [summary, against, spec.source ? `From ${spec.source}.` : null].filter(Boolean).join(' '),
    '',
    '```mermaid',
    diagram,
    '```',
    '',
    legendOf(nodes),
    '',
    ...(rows.length
      ? table(['What', 'Where', 'Kind', 'Change', 'Note'], rows.map((row) => row.map(textCell)))
      : ['Nothing changes: every thing is shown for context.']),
    ...(differences.length
      ? ['', '**Plan against work**', '', ...table(['What', 'Kind', 'Planned', 'Done'], differences.map((row) => row.map(textCell)))]
      : []),
    '',
    hiddenOf(spec),
    END,
  ].join('\n');
  return { markdown, diagram, summary, against, rows, differences, nodes };
};

/** A Markdown body with the map in it: in place of the one it holds, else at its end. */
export const into = (body: string, block: string): string => {
  const start = body.indexOf(START);
  const end = start === -1 ? -1 : body.indexOf(END, start);
  if (start !== -1 && end !== -1) return body.slice(0, start) + block + body.slice(end + END.length);
  return `${body.trimEnd()}${body.trim() ? '\n\n' : ''}${block}\n`;
};

// ---------------------------------------------------------------------------------------------
// The page

const html = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const htmlTable = (header: string[], rows: string[][]): string =>
  `<table><thead><tr>${header.map((h) => `<th>${html(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((c) => `<td>${html(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

/** A page that draws the map: the diagram first, then its legend and its words. */
export const pageOf = (spec: MapSpec, rendered: Rendered): string => {
  const used = KIND_NAMES.filter((kind) => rendered.nodes.some((n) => n.kind === kind));
  const legend = used
    .map(
      (kind) =>
        `<li><span class="swatch" style="background:${KINDS[kind].fill};border-color:${KINDS[kind].stroke}"></span>` +
        `<b>${kind}</b> <span class="muted">(${KINDS[kind].shape})</span> ${html(KINDS[kind].what)}</li>`,
    )
    .join('');
  const source = JSON.stringify(rendered.diagram).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Map: ${html(spec.title)}</title>
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --fg: #0f172a; --muted: #475569; --line: #e2e8f0; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0b1120; --fg: #e2e8f0; --muted: #94a3b8; --line: #1e293b; } }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 1200px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: var(--muted); }
  #diagram { margin: 24px 0; overflow-x: auto; }
  #diagram svg { max-width: 100%; height: auto; }
  ul.legend { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 6px 24px; }
  .swatch { display: inline-block; width: 14px; height: 14px; border: 2px solid; border-radius: 3px; vertical-align: -2px; margin-right: 6px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0 24px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  pre { white-space: pre-wrap; font-size: 12px; }
</style>
</head>
<body>
<main>
  <h1>${html(spec.title)} <span class="muted">(${spec.mode})</span></h1>
  <p>${html([rendered.summary, rendered.against, spec.source ? `From ${spec.source}.` : null].filter(Boolean).join(' '))}</p>
  <div id="diagram" role="img" aria-label="${html(`Diagram of ${spec.title}; the table below says the same in words.`)}"><p class="muted">Drawing the diagram...</p></div>
  <ul class="legend">${legend}</ul>
  <p class="muted">${html(legendOf(rendered.nodes).replace(/^Legend: [^.]*\. /, ''))}</p>
  ${rendered.rows.length ? htmlTable(['What', 'Where', 'Kind', 'Change', 'Note'], rendered.rows) : '<p>Nothing changes.</p>'}
  ${rendered.differences.length ? `<h2>Plan against work</h2>${htmlTable(['What', 'Kind', 'Planned', 'Done'], rendered.differences)}` : ''}
</main>
<script type="module">
  const source = ${source};
  const box = document.getElementById('diagram');
  try {
    const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/${MERMAID}/dist/mermaid.esm.min.mjs');
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'strict' });
    const { svg } = await mermaid.render('map', source);
    box.innerHTML = svg;
  } catch (error) {
    box.innerHTML = '<p>The diagram could not be drawn here (' + String(error.message || error).replace(/</g, '&lt;') + '). Its source:</p><pre></pre>';
    box.querySelector('pre').textContent = source;
  }
</script>
</body>
</html>
`;
};

// ---------------------------------------------------------------------------------------------

const read = (file: string): string => (file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8'));

const main = () => {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const file = argv.find((arg) => arg === '-' || !arg.startsWith('--'));
  if (!file) fail('give the map: node scripts/map.ts <map.json | ->');
  const spec = parseMap(extractMap(read(file!)));
  const planFile = args.value('plan');
  const plan = planFile ? parseMap(extractMap(read(planFile))) : undefined;
  const rendered = render(spec, plan);
  const htmlFile = args.value('html');
  if (htmlFile) writeFileSync(htmlFile, pageOf(spec, rendered));
  const intoFile = args.value('into');
  if (intoFile) writeFileSync(intoFile, into(readFileSync(intoFile, 'utf8'), rendered.markdown));
  console.info(rendered.markdown);
};

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
