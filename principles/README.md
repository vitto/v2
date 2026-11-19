# Principles

The principles of vittoriovittori.com, written so an agent can apply them while it builds or reviews a UI. One Markdown file per principle, in a folder per section, named after its id on the site.

Status: pilot, one principle per section, and two drafts. The rules come from the do and don't lists of the site's use cases; the checks, the "Don't overdo it" notes and the design system notes are proposals to review. The other principles follow as they are rewritten on the site.

## Index

The skills read this table to decide which files to load, so every new principle adds a row. A row marked draft loads like the others, but its checks ask instead of failing (see `status` below).

| Principle | Section | Load it when the work involves |
| --- | --- | --- |
| [Error Prevention](user-centered-design/error-prevention.md) | User-Centered Design | forms and inputs, actions that delete, overwrite, send, pay or publish, multi-step flows, defaults |
| [Consistency Over Uniformity](design-systems/consistency-over-uniformity.md) | Design Systems | a new component or variant, an element that looks or behaves like one already in the product, a visual change to a shared pattern |
| [Design for Uncertainty](human-centered-ai-design/design-for-uncertainty.md) | Human-Centered AI Design | any output produced by a model: answers, classifications, summaries, suggestions, extracted data |
| [Accessibility as a Baseline](design-systems/accessibility-as-a-baseline.md) (draft, #38) | Design Systems | a component of a design system, its colour roles or its states; anything shown with colour (a status, a selection, a category, a chart series); text on a coloured or tinted background, themes and dark mode; icon-only buttons, small controls, touch targets; images, and messages that appear after an action; animations |
| [Visual Composition](user-centered-design/visual-composition.md) (draft, #23) | User-Centered Design | placing the elements of a view, section, card, dialog or form; several groups of content, fields or actions; choosing the main action and where actions sit; hiding content behind a menu, tab or accordion; a layout that must hold from narrow to wide and with long data; an icon, a glyph or a logo alone in a frame (a button, a tile, an app icon) |

## Format

Frontmatter:

- `id`, `title`, `section`, `category`: the same values as the site's data (`src/data/<section>.json` in the site's repository), so the two join by id. Description and sources stay on the site.
- `status` (optional): `draft` while the rules are proposals that real work has not confirmed yet. Without it, the principle is in force. A draft is followed while building like any principle, but a check of it that fails is never a Fail: it is a question for the person, defect or their choice, asked at the end with the others, and the answer is the evidence that confirms or corrects the rule. A rule loses the draft mark once real work has confirmed it enough. The answers go to the person's decisions log (`../docs/decisions-log.md`) with the choices made against rules in force and the corrections no rule covers; it says when a principle has enough to change or to lose the mark.
- `site`: the principle's page on the site. Each rule in the body has the same title as one of the page's use cases, so `<site>#<rule title as a slug>` (lowercase, every run of other characters turned into `-`) opens its interactive example, with the Do and the Don't. A draft may have none yet: then no rule links to an example.
- `applies_when`: concrete situations an agent can recognize in a task or in code. This is what decides whether the file gets loaded.
- `related`: principles from any section that usually apply together, as `section/id`, which is also their path in this folder. One without a file yet can still be read on the site.
- `inspired_by` (drafts only, until the site keeps the sources): the books, authors and laws the rules draw on, cited as inspiration. A rule with no bibliographic source is Vittorio Vittori's own practice: it says so in this list and in a `Source` line under its title, until a source is found.

Body:

- **Intent**: what must be true for the person using the UI, and why. The why is what lets the agent decide the cases the rules do not cover.
- **Rules**: one block per use case on the site, same titles, with Do and Avoid lines and the checks that verify them.
- **Checks**: a question with a yes or no answer, an id (`EP1`), a level and how to verify it.
  - `must`: a fail is a defect. `should`: a fail needs a reason. In a draft, either kind of fail is a question for the person instead.
  - Where the answer comes from. `code`: reading the code. `runtime`: the running page and an action on it: the keyboard, the focus, what reaches the accessibility tree, a state reached by acting. `rendered`: the page as drawn, measured (its computed styles against the tokens of the design system, contrast, targets) and seen (its screenshots, blurred and in greyscale), at the narrowest and the widest width it supports and in each theme. `../docs/rendered.md` says how to run them; a `rendered` check that could not run is not verifiable, never a pass.
- **Don't overdo it**: where applying the rule literally makes the UI worse. Agents tend to over-apply, so this section matters as much as the rules.
- **With a design system**: what to ask the design system for. It never names a component, so the principles work with any design system and do not compete with its own guidance.
