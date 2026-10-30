---
name: design
description: Vittorio Vittori's design principles for building or changing UI. Which UX, design system and AI design principles apply to the task, the rules to follow while building, the checks to run before handing over. Use whenever building or changing an interface, a component, a form, a flow, or anything that shows AI output, beside the project's own design system.
---

# Design with the v2 principles

The principles say what must be true for the people using the interface. They never name a component: how to build it is the project's design system's call. Arguments given with the command, if any: $ARGUMENTS.

## Before building

1. Read the index in `../../principles/README.md`, from this skill's folder, and load every principle whose row matches the task, across all sections. Then check `applies_when` in each file: it is more precise than the row. A form that sends AI-generated text loads Error Prevention and Design for Uncertainty.
2. Say in one line which principles you loaded, before writing code.

## While building

3. Follow the Do and Avoid lines of the loaded files. The Intent says why: use it for the cases the rules do not cover.
4. When the project has a design system, ask it for what each file lists under "With a design system" before building anything yourself, through its tools for agents when it has them (an MCP server, a skill, its guides). Build nothing it already has. When it sets a rule that differs from a principle, follow the design system and report the difference.
5. Read "Don't overdo it" before adding a confirmation, an indicator or a warning: applying a rule everywhere is a failure too.

## Before handing over

6. Run the `code` checks of every loaded principle on what you wrote. Run the `runtime` checks too when you can open the page (a dev server, a browser); otherwise list them as not verified.
7. Report each check as pass, fail or not verifiable, with its id (`EP7`). Fix every `must` that fails. A failing `should` stays only with a written reason.

For a full review of UI that already exists, use `/v2:audit`.
