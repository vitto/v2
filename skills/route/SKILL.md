---
name: route
description: 'The model and the effort a piece of work needs, so the cheaper ones do what they can: before starting a piece of work or handing it to a subagent, weigh it (light, standard, heavy), keep it in the session when its model fits, else run it in a subagent with the model and the effort it needs; never switch the model of the session, and never use a model or a service billed per use beyond the person''s plan without their yes. Without arguments everything is automatic; the person can fix the effort (minimo, basso, medio, alto, massimo, auto) or the model. Use before starting or delegating a piece of work, and when the person names a model or an effort for it; in Italian "route", "che modello usi", "quale modello", "impegno basso", "impegno alto", "impegno massimo", "fallo con haiku", "fallo con opus", "risparmia token".'
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
  it is, within step 3: one their plan does not cover still needs their yes to what it costs.
  Without one, it is chosen in step 2.
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

## 3. Only what the plan covers

A model, a mode or a service is used only when the person's plan covers it: a flat subscription
that includes it, within its limits. One that would be billed per use on top of the plan (extra
usage, pay as you go, API credits, a paid service of the host or of another one) is no by default,
for every model and every service. Ask the person explicitly whether to turn it on, in their
language: what it is, why the work needs it, and that its cost is billed per use. No is the
default: offer it first (as the first option where the host has a question with choices), and
without a clear yes naming it, it stays off and the work goes on with what the plan covers. The
yes covers that piece of work only.

- **What the plan covers**: from the host, where it shows it (its model picker, its status or
  usage page); otherwise ask the person once, the first time a model or a service would be used,
  and keep the answer for the conversation. Never take it for included without knowing.
- **A tier whose model the plan does not cover**: the strongest covered model below it, at a
  higher effort, and one line that says so.
- **An account with no flat plan** (an API key, pay as you go): every use is billed; ask once
  whether routing may use other models in this conversation.
- **The model of the session** is the person's choice, made when they opened it: this step weighs
  only what the skill adds.

## 4. Here or in a subagent

The tier of the session is the tier of the model this conversation runs on, by the table of
step 5. A model the table does not name: ask the person once which tier it is. The effort of the
session is the one the person set when they opened it: from the host, where it shows it (its
model picker, its session details); otherwise ask the person once and keep the answer for the
conversation. Never take it for the one step 2 chose: nothing sets it by choosing it.

- **Keep it here** when its tier is the session's, the effort of the session is at least the one
  step 2 chose, and the person fixed nothing; when it is a handful of steps (a brief would cost
  more than it saves); when it leans on this conversation so much that a brief would have to
  retell most of it.
- **Otherwise run it in a subagent** with the model and the effort of steps 2 and 3: lighter work goes
  down, heavier work goes up. This skill is the explicit request a host may want before setting a
  subagent's effort. The brief stands alone: the goal, the files, what is ruled out, what to
  return. Check what comes back before calling it done: a cheaper model's mistakes come back as
  sure of themselves as its findings.
- **An effort the session does not have** (the person fixed it, or step 2 chose one above the
  session's) sends the work to a subagent with the model of the session and that effort, unless
  the person prefers it here: the effort of the session does not change by choosing it. Where
  the host has a tool that sets the effort of the session, use it only on the person's yes, for
  that piece of work, and set it back after; otherwise, when the work stays here, say in one
  line which effort it needs and where the person sets it (in Claude Code, the effort in the
  model picker).
- **Never switch the model of the session**, even where the host could. The cache holds for one
  model: the other would read the whole conversation again at full price, and so would the first
  one on the way back. The model of the session is the person's to choose, when they open it.
- **Heavier than the session, and no subagent possible** (the host has none, or the work leans on
  the whole conversation): say it in one line before starting, in the person's language: heavy
  work, a session on <model> at effort <level> would do it better. Lighter work on a stronger
  session needs no line; when the whole session is light work, say once that the next one could
  start on the lighter model.

Before the work, one line: `route: <tier> -> <model>, effort <level> (auto | fixed), <here |
subagent>`. The line says the effort the work runs at, not the one chosen: here, the effort of
the session; in a subagent, the one it is given. When the two differ, the line says both:
`route: heavy -> opus, effort medium (session; needs high), here`.

## 5. The hosts

| Host | light | standard | heavy | Effort levels | Another model for a piece of work |
|------|-------|----------|-------|---------------|-----------------------------------|
| Claude Code (terminal, desktop, web, IDE) | `haiku` | `sonnet` | `opus` | low, medium, high, xhigh, max; minimal is low | a subagent (the Agent tool) with `model` and `effort`; not a fork, which keeps the model and the effort of the session |

Aliases, not versions: each points to the latest model of its family, so the table outlives a new
release.

Above `opus`, Claude Code has `fable`: the most capable model, and costlier than `opus`. A session
on `fable` is of the heavy tier. Heavy work that resisted `opus` at `xhigh`, or that the person
sends to it, may go up to `fable`, by step 3: when the plan covers it; otherwise only on their yes.

**A host not in the table** (another agent harness, another AI service): find from its own docs
or tools its models for the three tiers, its effort levels, whether it can run a piece of work
on another model and how each is billed; propose its row to the person and add it here only on
their yes. Until then, weigh the work as in step 2 and say in one line which model and effort it
needs.

## 6. Once per machine

The skill acts when it is called or when its description matches the work. For it to weigh every
piece of work, the global instructions of the host need one line that calls it. The first time it
runs in a conversation, look for that line: Claude Code reads `~/.claude/CLAUDE.md`, a host that
reads AGENTS.md its global AGENTS.md. When no line names `route`, offer to add this one:

```markdown
Before starting a piece of work or handing it to a subagent, apply the v2 `route` skill: it picks the model and the effort the work needs.
```

Once the person has said what their plan covers (step 3), offer to add it after that line, in
their words, so it is not asked again: for example "My plan covers haiku, sonnet and opus; fable
and any other paid service are billed per use." It is theirs to change when the plan changes.

That file is the person's, outside the project: write it only on their yes. Once the lines are
there, the machine needs nothing more.
