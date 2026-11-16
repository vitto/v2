---
name: design-audit
description: Audit an existing screen, component or change against Vittorio Vittori's design principles (UX, design systems, AI design) and the area's object model, and report every check as pass, fail or not verifiable, merged by place. Use when asked to review, audit or check the UX or UI quality of something already built.
---

# Audit against the v2 principles

Target: $ARGUMENTS (a page, a component, a folder or the current diff). When it is empty, ask.

## 1. The mode

- **Screen**: a page or a flow people use. Run the checks as written.
- **Component**: a shared piece used by many screens, such as a design system component. The question becomes: does the component make the right thing the default? A check about behavior the component does not own (what happens after Delete) is not verifiable on it; say what the component should make easy instead.

Say which mode you picked and why.

## 2. The principles

Read the index in `../../principles/README.md`, from this skill's folder, and load every principle whose triggers match the target, across all sections.

## 2b. The object model

When the area has an object model (`../../docs/object-model.md`, from this skill's folder, says what it is), check each screen of the target against it too:

- OM1 (must, runtime): the view has one focal entity, and its goal can be told from the screen.
- OM2 (must, code): every other entity shown is shown at the granularity the model sets for this view; nothing the model puts under "never here" appears.
- OM3 (must, runtime): deeper editing of another entity opens in a side panel, a menu, a dialog or its own page, never as a box nested in a box; leaving the view loses nothing typed.
- OM4 (must, runtime): the state of the focal entity, and what is running on it, is always visible.
- OM5 (should, code): the screen names things with the model's words; no word of the software (job, task, queue, record) names one of the person's things.
- OM6 (should, code): the view holds only the metadata of its own level.

A screen that needs something the model does not have is an open question for `design-reframe`, not a fail.

## 3. The checks

- `code` checks by reading the code. `runtime` checks on the running page when you can open it: element sizes, keyboard, focus, the accessibility tree. A runtime check you could not run is not verifiable, never a pass.
- Read "Don't overdo it" before reporting a fail: it is there to stop false positives.
- When a check needs a stance the files do not take, report it as an open question, not as a fail.

## 4. The report

A table with #, checks, where and result. One row per problem, with every check id that caught it: a problem two principles catch is one row, not two. Results are **Fail** (with what to change), **Pass**, **Not verifiable** (with what would make it verifiable) or **Open question**. Defects first, passes last. For each fail, link the rule's example on the site: the file's `site` plus `#` and the rule title as a slug.

Change nothing unless asked: the audit reports. `docs/pilot-audit.md`, at the root of this plugin, is an example of the report.
