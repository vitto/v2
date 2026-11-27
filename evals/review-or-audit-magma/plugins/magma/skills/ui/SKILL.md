---
name: ui
description: How to write interface code in a project that uses Magma (mds-* components, the React and Angular wrappers, the Tailwind classes and roles) - find the component, read its API, paint with roles, check the markup. Use whenever building or changing UI in a Magma project.
license: MIT
compatibility: A project with @maggioli-design-system/magma installed. Uses the magma MCP server of this plugin; without it, the guides installed with the package.
metadata:
  source: https://github.com/magma-design-system/magma/tree/main/projects/claude-plugin
---

<!-- Generated from projects/claude-plugin/templates/ui.md by scripts/skills.ts: edit the template. -->

# Write UI with Magma

Magma answers from the version installed in this project: ask the magma MCP server instead of guessing, and never invent a prop, a value, an event, a role or an icon slug. Arguments given with the command, if any: $ARGUMENTS.

## Before you start

Once per session, before the first change, call `check_setup`: when it reports the Magma block missing from the project's agent file (`agent-context`), propose to write it as the guide it names says, so the agents of the colleagues know Magma is there; mention what else it reports.

## Pick your path

1. **Build or change an interface with what Magma has**, such as a form, a settings page, a list with its filters or the message after an action: read [references/compose.md](references/compose.md).
2. **Magma lacks what the job needs**: no component holds the role, one holds it and does not fit, or no pattern covers the task: read [references/gap.md](references/gap.md).
3. **The person has to decide** on an interface, such as a layout, where a message goes or which of two components: read [references/show.md](references/show.md).

Most jobs take path 1. When one part of it meets path 2 or 3, follow that path for that part, then go back. Every path ends the same way: "When you are done", below.

The tools of the server, and what each one answers: [references/tools.md](references/tools.md).

## Rules for every path

- Use the `mds-*` component, never the raw element it replaces
- Never put an interactive component inside another interactive element
- Write only the values a prop accepts: `tone`, `variant` and `size` take different values on each component (lint: `magma/valid-attribute-values`)
- Turn a boolean prop off by removing its attribute, never with `"false"` (lint: `magma/no-false-boolean`)
- Never write a deprecated prop (lint: `magma/no-deprecated`)
- Give every control a name: `label` or `aria-label` on a component shown with its icon alone, `alt` on an image (lint: `magma/accessible-name`)
- Pass text through the `label` prop when the component documents one
- Listen to the documented `mds*` events, not to the native `change` or `input`
- Style a component only through its public custom properties and its documented parts (lint: `magma/no-internal-tokens`)
- Paint with the semantic roles (`bg-surface-default`, `text-fg-muted`), never with Tailwind's palette or a literal colour (lint: `magma/no-raw-palette-classes`, `magma/no-raw-color`)
- Never write dark mode by hand with a `prefers-color-scheme` query (lint: `magma/no-color-scheme-override`)
- Set text with the semantic typography utilities (`text-title-h3`, `text-info-detail`), never composed from `font-*` and `text-*` primitives
- Write the Magma spacing steps in full: `p-400` is 1rem, while Tailwind's `p-4` is 0.01rem
- Space two elements by the step of their relation, never by a value picked by eye
- Reference an icon by a slug of the sets the project serves, never an inline `<svg>` or an imported icon package
- Keep Magma's focus styles (`focus-bounce`, `focus-zoom`), never hand-rolled ones

A rule marked lint is caught, in full or in part, by that rule of the Magma lint: `check_markup` runs it on a snippet. The others are yours to keep. Each rule is explained in the guide of the mistakes to avoid with any component (`get_guide` mistakes, section "The rules"), which links the guide that decides it; read that one with `get_guide` when a rule is not clear (conventions, color, typography, theming, or a domain of the design language such as rhythm).

## When you are done

1. `check_markup` on each template and stylesheet you wrote; fix what it reports.
2. Run the project's lint (ESLint and Stylelint with the Magma presets) and, when it has one, its type check; read the exit code, not only the output.
3. Report to the person, in this order:
   - what you used: the pattern and its case, the components; the prototype you proposed (path 2); the option the person chose (path 3);
   - each command you ran, with its exit code;
   - what you could not check, such as a page you did not render;
   - what Magma did not give you: a tool or an answer you lacked (you read Magma's files by hand or guessed, or an answer carried `gap`), a component that does not fit, a component or a pattern that is missing. Propose an issue on Magma for each, as path 2 says, and open it only once the person agrees.

## Without the server

The paths and the rules hold: where a path calls a tool, read the guide it answers from. The guides installed with the package: `node_modules/@maggioli-design-system/magma/AGENTS.md`, its `agents/*.md` (mistakes, conventions, color, typography, theming, lint, reporting), the domains of the design language in its `agents/patterns/` (the files of `kind: design-language`, or `kind: foundation` with magma 2.11 and before, such as `rhythm.md`) and, for one component, `dist/collection/components/<tag>/AGENTS.md`, which links the files of its examples and mistakes beside it.
