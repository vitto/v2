---
name: design-build
description: Vittorio Vittori's design principles for building or changing UI. Which UX, design system and AI design principles apply to the task, the rules to follow while building, the checks to run before handing over. Use whenever building or changing an interface, a component, a form, a flow, or anything that shows AI output, beside the project's own design system; a new view starts from the object model that design-interview writes.
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/decisions.ts *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/rendered.ts *)
---

# Design with the v2 principles

The principles say what must be true for the people using the interface. They never name a component: how to build it is the project's design system's call. Arguments given with the command, if any: $ARGUMENTS.

Where the answer starts: put a horizontal rule (`---` on a line of its own, with an empty line
before and after it, or Markdown reads the line above as a heading) right above what this skill
answers - its report, tables, map or questions - so the person sees where it starts. The
one-line notes before each step stay above it.

## Before building

0. Find the object model of the area (`../../docs/object-model.md`, from this skill's folder, says what it is). A new view, section or tool with no model: run `design-interview` first. A request that adds an entity, a field, a state or an action to a view: run `design-reframe` first. Build each view around its focal entity, with the entities around it at the granularity the model sets, with the patterns and blocks the model names for it. A conflict between the model and the design system found while building is added to the model's Conflicts section and told to the person; until it is resolved, follow the design system.
1. Read the index in `../../principles/README.md`, from this skill's folder, and load every principle whose row matches the task, across all sections. Then check `applies_when` in each file: it is more precise than the row. A form that sends AI-generated text loads Error Prevention and Design for Uncertainty.
2. Say in one line which principles you loaded, marking the drafts (`status: draft`), before writing code.

## While building

3. Follow the Do and Avoid lines of the loaded files. The Intent says why: use it for the cases the rules do not cover.
4. When the project has a design system, ask it for what each file lists under "With a design system" before building anything yourself, through its tools for agents when it has them (an MCP server, a skill, its guides). Build nothing it already has. When it sets a rule that differs from a principle, follow the design system and report the difference.
5. Read "Don't overdo it" before adding a confirmation, an indicator or a warning: applying a rule everywhere is a failure too.

## Before handing over

6. Run the `code` checks of every loaded principle on what you wrote. When you can open the page (a dev server, a browser), run the `runtime` checks, and the `rendered` checks as `../../docs/rendered.md`, from this skill's folder, says: `node ${CLAUDE_PLUGIN_ROOT}/scripts/rendered.ts --url=<page> --widths=<narrowest>,<widest>`, at the widths and in the themes the view supports, then fix and run it again, for two rounds of fixing at most. What still fails after the second round is handed over as failing, with its screenshot, never hidden. Show the person the screenshots of the last round. When you cannot open the page, list the `runtime` and `rendered` checks as not verified.
7. Report each check as pass, fail or not verifiable, with its id (`EP7`). Fix every `must` that fails. A failing `should` stays only with a written reason.
8. A check of a draft principle that fails is not yours to fix or to excuse: it is a question for the person. Ask them all at the end, together, never one by one while building: what the rule asks, what the build does, and whether it is a defect or their choice. A defect you fix; a choice stays, with their reason in one line. Report each one with its answer.
9. The person's answers, and the corrections they asked for on what you built ("move that button", "more space here"), are decisions the principles learn from. With the questions of step 8, in the same message, ask why for each correction they have not explained, in one line; a correction that only fixes a bug of yours is not one. Record them as `../../docs/decisions-log.md`, from this skill's folder, says; a choice that holds for this project only also goes into the object model's Exceptions, on their yes. Then run its `due`, and propose a change to a principle only as that file says.

For a full review of UI that already exists, use `/v2:design-audit`.
