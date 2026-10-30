# Principles

The principles of vittoriovittori.com, written so an agent can apply them while it builds or reviews a UI. One Markdown file per principle, in a folder per section, named after its id on the site.

Status: pilot, one principle per section. The rules come from the do and don't lists of the site's use cases; the checks, the "Don't overdo it" notes and the design system notes are proposals to review. The other principles follow as they are rewritten on the site.

## Index

The skills read this table to decide which files to load, so every new principle adds a row.

| Principle | Section | Load it when the work involves |
| --- | --- | --- |
| [Error Prevention](user-centered-design/error-prevention.md) | User-Centered Design | forms and inputs, actions that delete, overwrite, send, pay or publish, multi-step flows, defaults |
| [Consistency Over Uniformity](design-systems/consistency-over-uniformity.md) | Design Systems | a new component or variant, an element that looks or behaves like one already in the product, a visual change to a shared pattern |
| [Design for Uncertainty](human-centered-ai-design/design-for-uncertainty.md) | Human-Centered AI Design | any output produced by a model: answers, classifications, summaries, suggestions, extracted data |

## Format

Frontmatter:

- `id`, `title`, `section`, `category`: the same values as the site's data (`src/data/<section>.json` in the site's repository), so the two join by id. Description and sources stay on the site.
- `site`: the principle's page on the site. Each rule in the body has the same title as one of the page's use cases, so `<site>#<rule title as a slug>` (lowercase, every run of other characters turned into `-`) opens its interactive example, with the Do and the Don't.
- `applies_when`: concrete situations an agent can recognize in a task or in code. This is what decides whether the file gets loaded.
- `related`: principles from any section that usually apply together, as `section/id`, which is also their path in this folder. One without a file yet can still be read on the site.

Body:

- **Intent**: what must be true for the person using the UI, and why. The why is what lets the agent decide the cases the rules do not cover.
- **Rules**: one block per use case on the site, same titles, with Do and Avoid lines and the checks that verify them.
- **Checks**: a question with a yes or no answer, an id (`EP1`), a level and how to verify it.
  - `must`: a fail is a defect. `should`: a fail needs a reason.
  - `code`: answerable by reading the code. `runtime`: needs the rendered page or an interaction.
- **Don't overdo it**: where applying the rule literally makes the UI worse. Agents tend to over-apply, so this section matters as much as the rules.
- **With a design system**: what to ask the design system for. It never names a component, so the principles work with any design system and do not compete with its own guidance.
