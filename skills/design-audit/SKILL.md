---
name: design-audit
description: Audit an existing screen, component or change against Vittorio Vittori's design principles (UX, design systems, AI design) and the area's object model, and report every check as pass, fail or not verifiable, merged by place, closing with a summary of where to start and whether the view does its job. Use when asked to review, audit or check the UX or UI quality of something already built.
---

# Audit against the v2 principles

Target: $ARGUMENTS (a page, a component, a folder or the current diff). When it is empty, ask.

## 1. The mode

- **Screen**: a page or a flow people use. Run the checks as written.
- **Component**: a shared piece used by many screens, such as a design system component. The question becomes: does the component make the right thing the default? A check about behavior the component does not own (what happens after Delete) is not verifiable on it; say what the component should make easy instead.

Say which mode you picked and why.

## 2. The principles

Read the index in `../../principles/README.md`, from this skill's folder, and load every principle whose triggers match the target, across all sections. A principle with `status: draft` loads too: its rules are proposals that real work has not confirmed yet, so its checks ask instead of failing (section 3).

## 2b. The object model

When the area has an object model (`../../docs/object-model.md`, from this skill's folder, says what it is), check each screen of the target against it too:

- OM1 (must, runtime): the view has one focal entity, and its goal can be told from the screen.
- OM2 (must, code): every other entity shown is shown at the granularity the model sets for this view; nothing the model puts under "never here" appears.
- OM3 (must, runtime): deeper editing of another entity opens in a side panel, a menu, a dialog or its own page, never as a box nested in a box; leaving the view loses nothing typed.
- OM4 (must, runtime): the state of the focal entity, and what is running on it, is always visible.
- OM5 (should, code): the screen names things with the model's words; no word of the software (job, task, queue, record) names one of the person's things.
- OM6 (should, code): the view holds only the metadata of its own level.
- OM7 (must, code): the view is built with the patterns and blocks the model names for it, and composed by the domains of the design language it names; where it is not, the difference is either a defect or an open conflict in the model.

A rule of the model that the built screen breaks because the design system makes it break (a component that clears a help line on blur, a nested component that hides its parent's panels) is not a fail of the screen: report it as a conflict for the model's Conflicts section, with where the design system says it.

A screen that needs something the model does not have is an open question for `design-reframe`, not a fail.

## 3. The checks

- `code` checks by reading the code. `runtime` checks on the running page when you can open it: element sizes, keyboard, focus, the accessibility tree. A runtime check you could not run is not verifiable, never a pass.
- Read "Don't overdo it" before reporting a fail: it is there to stop false positives.
- When a check needs a stance the files do not take, report it as an open question, not as a fail.
- A check of a draft principle that fails is never a fail: it is a question for the person, defect or their choice, with what the rule asks and what the target does. Ask them all at the end, together. A defect becomes a Fail; a choice becomes a pass by choice, with their reason in one line.

## 4. The report

A table with #, checks, where and result. One row per problem, with every check id that caught it: a problem two principles catch is one row, not two. Results are **Fail** (with what to change), **Pass**, **Not verifiable** (with what would make it verifiable), **Open question** or, for a draft principle, **Draft: defect or choice?** until the person answers, then **Fail** or **Pass by choice** (with their reason). Defects first, passes last. For each fail, link the rule's example on the site: the file's `site` plus `#` and the rule title as a slug, when the file has a `site`.

### The Summary

The report ends with a **Summary**, apart from the table: the conclusions the table supports, for the person who will not read every row.

1. **Where to start.** The three defects that weigh most on the goal of the focal entity, by their row number (`#3`), each with why in a few words. Fewer when fewer fail; none when nothing fails.
2. **The goal.** Does the view do what it exists for, as the object model states it? One answer: **yes**; **yes, after the fixes**, naming the rows; **no, to rethink**, which hands over to `design-reframe`. When the area has no object model, the goal cannot be checked: say so, and point to `design-interview` to write it.
3. **What the checks do not cover.** Visual hierarchy, rhythm, coherence with the design language: what you saw that no check asks about. Each line is labelled **opinion**, never a Fail, never a Pass.

Every sentence of the Summary cites a row of the table (`#3`) or a section of the object model. A sentence that cites neither carries the label **opinion**. A summary that could be written without running the audit ("good overall, a few issues") is not one.

When the audit runs as the check at the end of `design-build` or `design-reframe`, the person has just seen the work: the Summary can be the goal line alone.

Change nothing unless asked: the audit reports. `docs/pilot-audit.md`, at the root of this plugin, is an example of the report, Summary included.
