---
name: route
description: 'The model and the effort a piece of work needs, so the cheaper ones do what they can: before starting a piece of work or handing it to a subagent, weigh it (light, standard, heavy), keep it in the session when its model fits, else run it in a subagent with the model and the effort it needs; never switch the model of the session. Without arguments everything is automatic; the person can fix the effort (minimo, basso, medio, alto, massimo, auto) or the model. Use before starting or delegating a piece of work, and when the person names a model or an effort for it; in Italian "route", "che modello usi", "quale modello", "impegno basso", "impegno alto", "impegno massimo", "fallo con haiku", "fallo con opus", "risparmia token".'
argument-hint: "[auto | minimo | basso | medio | alto | massimo] [model] [the work]"
---

# The model and the effort of the work

What to route, and what the person fixed: $ARGUMENTS. Nothing given, or `auto`: the model and
the effort are chosen here. The point is to spend less: the cheaper model does what it does well,
the stronger one only what needs it.

## 1. What the person fixed

| The person says | Effort |
|-----------------|--------|
| `minimo`, `minimal` | minimal |
| `basso`, `low` | low |
| `medio`, `medium` | medium |
| `alto`, `high` | high |
| `massimo`, `max` | max |
| `auto`, or nothing | chosen in step 2 |

- **A model** the person names (`haiku`, `sonnet`, `opus`, or a model of another host) is used as
  it is. Without one, it is chosen in step 2.
- The same can come in words instead of arguments: "fallo con impegno alto", "usa haiku per
  questo".
- What the person fixed holds for this piece of work only.

## 2. Weigh the work

One tier per piece of work, by what it asks for, not by how long it is:

- **light**: finding and reading (search the code, list, collect); summing up (a log, a diff, a
  page, a thread); mechanical changes (rename, move, reformat, bump a version, fill a template);
  running commands and reporting what they print.
- **standard**: writing or changing code along a pattern the project already has, its tests and
  its docs; a bug with a clear way to reproduce it; reviewing a small change.
- **heavy**: design and architecture; a choice between approaches; a request still vague; a bug
  with no reproduction, or one that resisted a first attempt; security; a change across many
  parts; text published in the person's name.

Between two tiers, take the higher one: doing the work again costs more than the difference.

The effort, when the person fixed none: light `low`, standard `medium`, heavy `high`; heavy work
that already failed once at `high` gets `xhigh` where the host has it. `max` only when the person
asks for it: it is the costliest.

## 3. Here or in a subagent

The tier of the session is the tier of the model this conversation runs on, by the table of
step 4. A model the table does not name: ask the person once which tier it is.

- **Keep it here** when its tier is the session's and the person fixed nothing; when it is a
  handful of steps (a brief would cost more than it saves); when it leans on this conversation so
  much that a brief would have to retell most of it.
- **Otherwise run it in a subagent** with the model and the effort of step 2: lighter work goes
  down, heavier work goes up. This skill is the explicit request a host may want before setting a
  subagent's effort. The brief stands alone: the goal, the files, what is ruled out, what to
  return. Check what comes back before calling it done: a cheaper model's mistakes come back as
  sure of themselves as its findings.
- **An effort the person fixed** sends the work to a subagent with that effort, even when the
  model stays the same, unless the person prefers it here: the effort of the session cannot
  change from inside.
- **Never switch the model of the session**, even where the host could. The cache holds for one
  model: the other would read the whole conversation again at full price, and so would the first
  one on the way back. The model of the session is the person's to choose, when they open it.
- **Heavier than the session, and no subagent possible** (the host has none, or the work leans on
  the whole conversation): say it in one line before starting, in the person's language: heavy
  work, a session on <model> at effort <level> would do it better. Lighter work on a stronger
  session needs no line; when the whole session is light work, say once that the next one could
  start on the lighter model.

Before the work, one line: `route: <tier> -> <model>, effort <level> (auto | fixed), <here |
subagent>`.

## 4. The hosts

| Host | light | standard | heavy | Effort levels | Another model for a piece of work |
|------|-------|----------|-------|---------------|-----------------------------------|
| Claude Code (terminal, desktop, web, IDE) | `haiku` | `sonnet` | `opus` | low, medium, high, xhigh, max; minimal is low | a subagent (the Agent tool) with `model` and `effort` |

Aliases, not versions: each points to the latest model of its family, so the table outlives a new
release.

**A host not in the table** (another agent harness, another AI service): find from its own docs
or tools its models for the three tiers, its effort levels, and whether it can run a piece of work
on another model; propose its row to the person and add it here only on their yes. Until then,
weigh the work as in step 2 and say in one line which model and effort it needs.

## 5. Once per machine

The skill acts when it is called or when its description matches the work. For it to weigh every
piece of work, the global instructions of the host need one line that calls it. The first time it
runs in a conversation, look for that line: Claude Code reads `~/.claude/CLAUDE.md`, a host that
reads AGENTS.md its global AGENTS.md. When no line names `route`, offer to add this one:

```markdown
Before starting a piece of work or handing it to a subagent, apply the v2 `route` skill: it picks the model and the effort the work needs.
```

That file is the person's, outside the project: write it only on their yes. Once the line is
there, the machine needs nothing more.
