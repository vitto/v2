# Evals: does each skill still do its job, on which model

A suite in the format of [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals),
one case per job a skill exists for, so that a new model, or the cheaper model
`/v2:agent-route` sends a piece of work to, cannot degrade a skill without anyone seeing it.

## The cases

| Case | Skill | The job | The decision, checked exactly | The reasoning, judged |
| --- | --- | --- | --- | --- |
| [taxonomy-two-meanings](taxonomy-two-meanings/prompt.md) | `taxonomy` | the words of a library tool, where "copia" names two concepts in one view and "titolo" two concepts that never meet | the conflict named with its two IDs and its place; no file changed | rename or qualify the Italian name, IDs kept, no alias; "titolo" a declared homonym; the person decides |
| [reframe-reservations](reframe-reservations/prompt.md) | `design-reframe` | add reservations, asked as a box inside each copy's row with the reader's data edited there | the title page gets a verdict; the model file untouched before the yes | the reservation belongs to the title; no box in a box; the reader's data elsewhere; the monthly report unchanged |
| [audit-project-settings](audit-project-settings/prompt.md) | `design-audit` | the UX audit of a settings page with defects the code proves, and no object model | rows that fail EP1, EP3, EP14; no row that passes a runtime or rendered check; `design-interview` named for the goal; no file changed | the labelled search field not failed; the summary cites rows |
| [help-cheatsheet](help-cheatsheet/prompt.md) | `help` | a person who just installed the plugin asks how to use it and which skill tries a pull request | `help.ts` run; `/v2:work-test` (or `/v2:work test`) named; no other skill run; no file changed | the skill named first, by its command; the table of the jobs; the page pointed to; nothing tested |
| [work-status-asks-first](work-status-asks-first/prompt.md) | `work-status` | `/v2:work-status` typed with no argument after a conversation that worked on the part 12 of the epic 10 (its branch, a commit, its pull request into the branch of the epic) | `status.ts` run on the piece or its epic, never with nothing; no file changed | the question before any report: the epic 10 first and recommended, the whole repository last, no overview shown |

Each case also checks that its skill ran (`tool_used: Skill`) and that the answer opens with the
horizontal rule every skill of the plugin puts above it; `work-status-asks-first` types the
command, which loads the skill without the Skill tool, so its sign is the call of `status.ts` on
the piece. Each case starts from a fixture of its own, made in the empty workspace of the run by
its `scaffold.sh`: the files copied, or for `work-status-asks-first` a small git repository with
the branches of the conversation. That case also resumes a short made-up conversation
(`context.history_file`, its `history.jsonl`), and its prompt is the next turn.

The rule for a case: **it is a job the skill was made for, with a known answer**. A case no skill
owns measures a missing skill, not a model, and has no place in this suite.

## The matrix

- **5 runs** a case; a run passes when every grader passes.
- **The reference**, `claude-opus-5-5`, must pass a case 5 of 5. A case it does not pass is a
  finding about the skill or the case, not a floor.
- **The floor** of a skill is the first model that passes its cases at least 4 of 5, going up
  from `claude-haiku-5-5` to `claude-sonnet-5-5` to the reference, only on cases the reference
  passes.
- **The judge** of the rubrics is fixed, `claude-sonnet-5-5` (the default is Haiku, which would
  move every score when it changes).

## Running it

From the root of the plugin. Each run is a `claude -p` on your own login, so it spends the
quota of your plan; the dollars in the report are a list-price estimate. Name the model in full
on every command: without `--model` a run takes the default model, and in zsh a `$model` that
holds two words is not split into arguments.

```bash
claude plugin eval . --model claude-opus-5-5 --judge-model claude-sonnet-5-5 --runs 5 --ablation none --scaffold --trust-plugin --no-publish --allow-tools Write Edit "Bash(node *status.ts*)" "Bash(node *help.ts*)" --disallow-tools Agent --max-cost-usd 25 -j 3
```

Then the same with `--model claude-haiku-5-5`, and with `--model claude-sonnet-5-5` for the
skills Haiku does not hold; `--tag skill:<name>` keeps the cases of one skill. Check that the
header of the report names the model you asked for.

- `--ablation none`: one arm, the plugin loaded; the floor needs no comparison without it.
- `--scaffold`: runs each case's `scaffold.sh`, which only copies the fixture or builds its git
  repository.
- `--allow-tools Write Edit`: the runs may change files, so that a skill that changes them
  before the person's yes fails its `no-edit` and `no-write` graders.
- `"Bash(node *status.ts*)"` and `"Bash(node *help.ts*)"`: the scripts of `work-status` and
  `help`. A skill's own `allowed-tools` cannot grant Bash in a run, so the command does. Only those
  scripts: `design-audit` has scripts of its own (`rendered.ts`), and its case runs as it was
  measured. Every command runs in the sandbox of the
  run, which reaches no GitHub: `work-status-asks-first` grades the choice, not a report.
- `--disallow-tools Agent`: `/v2:agent-route` would hand the work to a subagent on another
  model, and the run would measure that model instead.
- `--keep-temp` keeps the workspace and the transcript of every run, to read why one failed.
- A case that resumes a conversation (`history_file`) gets, in its own folder of the plugin, a
  file named after the `sessionId` of its `history.jsonl`, where every run writes its session.
  Every run still starts from the last line of `history.jsonl` (checked on 7 runs, 3 at once), so
  the runs do not see each other. Git ignores the file; delete it after the runs: it holds the
  requests of every run.
- One model at a time: three at once, 9 runs in flight, reached the 5-hour limit of the plan, and
  a run or a judge call that meets the limit scores 0 without being graded; leave those runs out
  of the count.

The results land in `evals/results/<timestamp>/`, kept out of git.

## When to run it

By hand: when a new model ships, when a skill or a file it reads changes, before writing a floor.
Never as a check of a pull request: CI does not install the Claude Code CLI, a run needs a
login, and a check that is red one time in five would hold every merge. So the suite stays out of
`npm test`.

## What a run cannot see

The sandbox of a run loads no `CLAUDE.md`, no `.claude/` of a project, no user settings and no
other plugin; a case carries in its fixture and its prompt everything the job needs. A run
cannot ask the person: a skill that asks questions gets its answers in the prompt, and a case
grades what it does with them; where the question is the job, the case turns the question dialog
off (`disallowed_tools: [AskUserQuestion]`), so that the skill asks in chat, and grades the
question. The Artifact tool is off, and GitHub is out of reach.

## Results

See [RESULTS.md](RESULTS.md): the reference, the floor, the runs and the cost of each skill, with
the date and the version of Claude Code they ran on.
