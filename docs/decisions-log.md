# The decisions log

The principles are written up front, from practice and from the sources they name. Then they meet real work, where the person decides things they do not cover, or decides against them for a reason. The decisions log keeps those decisions, so a principle changes when they agree: never on one case, always on the person's yes.

`design-build` and `design-audit` write to it at the end of a session; `scripts/decisions.ts` checks each entry, counts, and says when a principle has enough to change.

## Where it lives

A JSON Lines file of the person's, outside v2 and outside the projects. It may hold client names and project reasons, which never reach v2: v2 only knows the path the person's settings give it, in the `V2_DECISIONS_LOG` variable, set once in the `env` of `~/.claude/settings.json`:

```json
{ "env": { "V2_DECISIONS_LOG": "~/notes/decisions.jsonl" } }
```

A file in a private repository of the person's gives it a history and a backup. Beside it the script writes a Markdown view, grouped by rule (`decisions.md` beside `decisions.jsonl`). Nobody edits either by hand: an entry goes in through the script, which refuses one that does not hold together.

Without the variable nothing is written. The decisions of the session stay in the project, in its object model's Exceptions (`object-model.md`, section 11), and the skill says once how to set the variable.

## What a session captures

Two signals:

- **A check that fails, and the person says it is their choice.** A `must` check of a principle in force that the person calls a choice, not a defect; and every answer to a check of a draft, defect or choice: a defect confirms the rule, a choice departs from it.
- **A correction the person asks for on what was built**: "move that button", "more space here". Corrections are the richest signal: the checks see only the rules that exist, the corrections show what is missing. A correction that only fixes a bug of the build is not a decision.

Three conditions, or the practice dies:

- **Ask few, ask at the end.** The questions gather at the end of the session, in one message, never mid-flow, and only for what counts: a `must` that fails, a check of a draft, a correction. For each, ask why in one line when the person has not said it. Asked every time, the answer becomes "my choice" without a thought, or the skill stops being used.
- **Corrections, not only checks.** Capture starts from both, not from the audit alone.
- **The sources stay as a counterweight.** The person's practice comes before the sources, but it sees them: otherwise the rules drift into habits, the less good ones included.

## An entry

One JSON object per line, written in English whatever the language of the session:

| Field | What |
| --- | --- |
| `type` | `decision`, the default; `proposal` for a proposal (below) |
| `date` | `YYYY-MM-DD`; today when missing |
| `project` | the project, as the person calls it |
| `view` | the view, by its address, or the component, by its name |
| `kind` | the kind of view: `tool` (used all day, dense), `task` (a flow done now and then), `page` (read once, content first), `component` (a shared piece of a design system) |
| `source` | `check` (a check that failed) or `correction` (a change the person asked for) |
| `rule` | the check id (`VC7`), when the decision touches a rule |
| `topic` | when no rule covers it: a short tag in kebab-case (`space-between-groups`); reuse one of `decisions.ts topics` when it fits |
| `stance` | `departs` (against the rule), `confirms` (a check of a draft answered "defect"), `uncovered` (no rule covers it: a `topic`, no `rule`) |
| `decided` | what was decided, one line |
| `why` | the person's reason, one line |
| `promote` | `true` when the person says "this is a rule": it is proposed at once |

```json
{"date":"2026-11-19","project":"Ledger","view":"/invoices","kind":"tool","source":"check","rule":"VC7","stance":"departs","decided":"New invoice and Import side by side, both primary","why":"both start the day's work, at the same rate"}
```

An exception that holds only for this project goes into its object model's Exceptions too, so the next audit does not flag the same screen again.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/decisions.ts add --entry='<the entry>'
```

## When a principle changes

A **group** is one rule (or one topic), one kind of view and one stance: a dense tool and a page read once ask for opposite choices, and mixed together they look like a contradiction. Within a group:

- decisions of the same project for the same reason count as one: the same view, or the same why;
- the group is due at **three** that count, so from different views; or at once when an entry says `promote`;
- once a proposal on the group is recorded, it counts again from zero.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/decisions.ts due
```

The script counts; the agent reads the decisions of each group due and proposes only when they agree, going the same way. The proposal:

- **a diff of the principle in our own words**, with no client and no project: what the rule says today, what it would say, and the kinds of view it holds for;
- for `confirms` on a draft: the evidence to remove the draft mark, once each rule of the principle has its own;
- where it goes against the sources the principle names in `inspired_by`, it says so, so the person decides knowing it;
- **only on the person's yes**, through a pull request on the plugin's repository and a new version (GOVERNANCE.md rule 1). A skill never edits the installed plugin. Outside the plugin's repository, the proposal goes there as an issue, opened on the person's yes.

Each proposal is recorded, then its outcome when it is known:

```json
{"type":"proposal","group":"VC7 · tool · departs","outcome":"proposed","where":"https://github.com/vitto/v2/issues/50"}
```

Proposals have two fixed moments: the end of a session that made a group due, and before each release of the plugin. A log nobody rereads dies.
