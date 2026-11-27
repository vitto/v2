---
name: design-audit
description: 'Audit a screen, a component or a change already built against Vittorio Vittori''s design principles and the area''s object model: every check pass, fail or not verifiable, then where to start. Use when asked to review, audit or check the UX or UI quality of something built.'
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/decisions.ts *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/rendered.ts *)
---

# Audit against the v2 principles

Target: $ARGUMENTS (a page, a component, a folder or the current diff). When it is empty, ask.

Where the answer starts: put a horizontal rule (`---` on a line of its own, with an empty line
before and after it, or Markdown reads the line above as a heading) right above what this skill
answers - its report, tables, map or questions - so the person sees where it starts. The
one-line notes before each step stay above it.

## 1. The mode

- **Screen**: a page or a flow people use. Run the checks as written.
- **Component**: a shared piece used by many screens, such as a design system component. The question becomes: does the component make the right thing the default? A check about behavior the component does not own (what happens after Delete) is not verifiable on it; say what the component should make easy instead.

Say which mode you picked and why.

## 2. The principles

Read the index in `../../principles/README.md`, from this skill's folder, and load every principle whose triggers match the target, across all sections. A principle with `status: draft` loads too: its rules are proposals that real work has not confirmed yet, so its checks ask instead of failing (section 3).

## 2b. The object model

When the area has an object model (`../../docs/object-model.md`, from this skill's folder, says what it is), check each screen of the target against it too:

- OM1 (must, rendered): the view has one focal entity, and its goal can be told from the screen.
- OM2 (must, code): every other entity shown is shown at the granularity the model sets for this view; nothing the model puts under "never here" appears.
- OM3 (must, runtime): deeper editing of another entity opens in a side panel, a menu, a dialog or its own page, never as a box nested in a box; leaving the view loses nothing typed.
- OM4 (must, rendered): the state of the focal entity, and what is running on it, is always visible.
- OM5 (should, code): the screen names things with the model's words; no word of the software (job, task, queue, record) names one of the person's things.
- OM6 (should, code): the view holds only the metadata of its own level.
- OM7 (must, code): the view is built with the patterns and blocks the model names for it, and composed by the domains of the design language it names; where it is not, the difference is either a defect or an open conflict in the model.

A rule of the model that the built screen breaks because the design system makes it break (a component that clears a help line on blur, a nested component that hides its parent's panels) is not a fail of the screen: report it as a conflict for the model's Conflicts section, with where the design system says it.

A screen that needs something the model does not have is an open question for `design-reframe`, not a fail.

## 2c. The design system

When the project has a design system, find it and the tools it ships for agents, as `../../docs/design-system.md`, from this skill's folder, says (steps 1 and 2). When it ships tools that are not loaded in this session, stop before the checks. Tell the person what is missing, what it would give, and the ways to enable it, then ask whether to enable it or audit with the guides only. Never fall back to the guides silently: an audit that reads the guides by hand cannot tell which components the installed version has.

Then run DS1 of that file on the target. Every piece made without a component, building block or pattern of the design system, and not already a gap the person resolved, is a row of the report. The row carries the resolution you propose, one of the three of that file (step 3).

## 3. The checks

- `code` checks by reading the code. `runtime` checks on the running page when you can open it: keyboard, focus, the accessibility tree, a state reached by acting. A runtime check you could not run is not verifiable, never a pass.
- `rendered` checks on the page as drawn, as `../../docs/rendered.md`, from this skill's folder, says: `node ${CLAUDE_PLUGIN_ROOT}/scripts/rendered.ts --url=<page> --widths=<narrowest>,<widest>`, at the widths and in the themes the view supports. The measured tables answer some checks; the others are read on the screenshots, each with what you looked at. The screenshots go in the report, beside the table, so the person sees what you saw. A seen check without its screenshot is not verifiable, never a pass.
- The level of a check decides its result, not the evidence at hand. The level is the one its principle writes after the id and the strength (AB1: must, rendered). A `runtime` or `rendered` check you did not run is **Not verifiable** even when the code gives an estimate: a contrast computed from the hex colours of the stylesheet, a size read from the px of the CSS, "no animations" found in the code for a motion check, a name read from an `aria-label` for a check of the accessibility tree. The estimate goes in the row, as what to confirm; the result stays Not verifiable. The code can prove such a check fails (a delete whose handler runs with no confirm and no undo); it never proves one passes.
- Read "Don't overdo it" before reporting a fail: it is there to stop false positives.
- When a check needs a stance the files do not take, report it as an open question, not as a fail.
- A check of a draft principle that fails is never a fail: it is a question for the person, defect or their choice, with what the rule asks and what the target does. Ask them all at the end, together. A defect becomes a Fail; a choice becomes a pass by choice, with their reason in one line.
- A check the object model lists under Exceptions for this view is a **Pass by choice**, citing the exception: do not ask again. A Fail of a principle in force that the person calls their choice becomes a Pass by choice too, with their reason, and an exception for the model on their yes.

## 4. The report

A table with #, checks, where and result. One row per problem, with every check id that caught it: a problem two principles catch is one row, not two. Results are **Fail** (with what to change), **Pass** (only for checks run at their level, section 3), **Not verifiable** (with what would make it verifiable, and the estimate the code gives, if any), **Open question** or, for a draft principle, **Draft: defect or choice?** until the person answers, then **Fail** or **Pass by choice** (with their reason). Defects first, passes last. For each fail, link the rule's example on the site: the file's `site` plus `#` and the rule title as a slug, when the file has a `site`.

Before writing Pass in a row, read each of its ids against its level. A row passes only the checks that ran: a `code` check read in the code, a `runtime` check run on the page, a `rendered` check measured or seen on its screenshot. When a row of passes would also hold a `runtime` or `rendered` check that did not run, take that check out: it goes to a row of its own, **Not verifiable**, with the estimate in words and what would verify it, as in `AB1 | theme.css:12 | Not verifiable: #767676 on white gives 4.5:1 by the stylesheet; measure it on the page with rendered.ts`. Never write the estimate as the result, and never call it a likely pass.

### The Summary

The report ends with a **Summary**, apart from the table: the conclusions the table supports, for the person who will not read every row.

1. **Where to start.** The three defects that weigh most on the goal of the focal entity, by their row number (`#3`), each with why in a few words. Fewer when fewer fail; none when nothing fails.
2. **The goal.** Does the view do what it exists for, as the object model states it? One answer: **yes**; **yes, after the fixes**, naming the rows; **no, to rethink**, which hands over to `design-reframe`. When the area has no object model, the goal cannot be checked: say so, and point to `design-interview` to write it.
3. **What the checks do not cover.** Visual hierarchy, rhythm, coherence with the design language beyond what the `rendered` checks ask: what you saw that no check asks about. Each line is labelled **opinion**, never a Fail, never a Pass.

Every sentence of the Summary cites a row of the table (`#3`) or a section of the object model. A sentence that cites neither carries the label **opinion**. A summary that could be written without running the audit ("good overall, a few issues") is not one.

When the audit runs as the check at the end of `design-build` or `design-reframe`, the person has just seen the work: the Summary can be the goal line alone.

Change nothing unless asked: the audit reports. `docs/pilot-audit.md`, at the root of this plugin, is an example of the report, Summary included.

## 5. The decisions

When the person answered a question of a draft, called a Fail their choice, or asked for a change while you audited, those are decisions the principles learn from. Record them as `../../docs/decisions-log.md`, from this skill's folder, says: one entry each, with the person's reason in one line, never asked mid-flow. Then run its `due`, and when a group is due, propose the change to the principle as that file says, only on the person's yes.
