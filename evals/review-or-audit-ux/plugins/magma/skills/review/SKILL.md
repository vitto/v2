---
name: review
description: Review code that uses Magma against its rules - the Magma lint, the checks of the magma MCP server, the rules of the installed guides - each finding with its fix. Use when asked to review, check or audit UI code in a Magma project, or after finishing UI work there.
license: MIT
compatibility: A project with @maggioli-design-system/magma installed. Uses the magma MCP server of this plugin and the project's ESLint and Stylelint.
metadata:
  source: https://github.com/magma-design-system/magma/tree/main/projects/claude-plugin
---

<!-- Generated from projects/claude-plugin/templates/review.md by scripts/skills.ts: edit the template. -->

# Review Magma code

What to review, if given with the command: $ARGUMENTS. Without it, the files changed on this branch against its base (`git diff --name-only`), keeping templates, components and stylesheets.

## 1. The lint

Run the project's ESLint and Stylelint on those files. When the Magma presets are not configured, call `check_markup` of the magma server on each template and stylesheet instead, and note in the report that the lint is missing (`check_setup` says what to add). The rules:

| Rule | Catches |
| --- | --- |
| `magma/valid-attribute-values` | A prop whose type is a union of literals takes one of them (the values each prop takes are in the component's `AGENTS.md`). |
| `magma/no-false-boolean` | A boolean prop is turned off by removing its attribute (`conventions.md`): a form-associated component reads any value as on, `"false"` included. |
| `magma/accessible-name` | A component that takes an `icon` next to a `label` or a default slot, shown with its icon alone, needs a name: without `label` or `aria-label`, `mds-button` is announced by the slug of its icon, which names the icon and not the action. |
| `magma/no-deprecated` | A deprecated prop still works, and the next major removes it. |
| `magma/no-raw-palette-classes` | A colour class names a role (`color.md`), never Tailwind's palette (`bg-white`, `text-gray-700`), which ignores Magma, nor a raw Magma step (`bg-tone-neutral-03`, `border-surface-neutral-default`), which follows the mode only. |
| `magma/no-color-scheme-override` | A `prefers-color-scheme` media query follows the OS, not the mode the user picked (`mds-pref-mode`). |
| `magma/no-raw-color` | A hex, `rgb()`, `hsl()`, `oklch()` or other colour literal where a role belongs. |
| `magma/no-internal-tokens` | An `--mds-*` custom property, set or read, that no component promises. |

## 2. What the lint does not see

For each Magma component in the changed code:

- `get_component`: are the events listened to the ones it emits, the slots the ones it has, the parts the documented ones? Is it styled only through its public custom properties (the ones `get_component` lists) and documented parts? Does the code follow the rules of the design language that govern it (its `rules`), without adding again what it draws by itself?
- Its usage files, the right forms and the mistakes to avoid (the paths `get_component` lists under `files`, named by the installed version): does the code follow them?
- Classes and colours: `explain_class` on the doubtful ones, `suggest_role` for a literal colour.
- `get_guide` on conventions (booleans, events, compound components, accessibility) and on the mistakes shared by every component (`get_guide` with no arguments lists the installed guides).

For each flow in the changed code that tells the person something or makes them wait or decide (a message, a confirmation, an empty, a loading or a failed part): `get_pattern` with the values of its variables, then check that the code follows the case it returns, the rules of the design language it lists in `rules`, and the "Always true" rules of the pattern. A flow that no pattern covers is a decision to report, not a finding.

For the composition (the space between elements, and the other rules of how the parts stand together): the domains of the design language, which `get_pattern` lists first (kind `design-language`; `foundation` with magma 2.11 and before), each read with `get_guide` by its id (`rhythm`). A space that is not the step of its relation, or a value of its own, is a finding, with the rule (`rhythm/<id>`) and the step to write.

## 3. The report

Group the findings by file, most severe first; for each one: the line, what is wrong, the rule or the guide section, and the fix. Change the code only if the person asks to.
