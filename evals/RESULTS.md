# Results

Runs of 2026-11-25 and 2026-11-26 on Claude Code 2.1.325 and the plugin 0.20.0 (`design-audit`
on 0.21.0 with its fix, #55; `work-status` on 0.25.0 with its fix, #63), judge
`claude-sonnet-5-5`, with the flags of the [README](README.md#running-it). Costs are list-price
estimates of a valid run, judge included; the runs spent the quota of the plan.

| Skill | Case | Opus 5.5 (reference) | Sonnet 5.5 | Haiku 5.5 | Floor | Cost a run, O / S / H |
| --- | --- | --- | --- | --- | --- | --- |
| `taxonomy` | taxonomy-two-meanings | 5/5 | 5/5 | 3/5 | **Sonnet 5.5** | 0.26 / 0.15 / 0.05 USD |
| `design-reframe` | reframe-reservations | 7/7 | 4/5 | 2/8 | **Sonnet 5.5**, at the threshold | 0.32 / 0.16 / 0.04 USD |
| `design-audit` | audit-project-settings | 5/5 | 4/5 | 3/5 | **Sonnet 5.5**, at the threshold | 0.49 / 0.25 / 0.03 USD |
| `work-status` | work-status-asks-first | 5/5 | 0/5 | 1/5 | **Opus 5.5**, the reference (finding 6) | 0.19 / 0.11 / 0.03 USD |

How to read it:

- **a/b** is the runs where every grader passed, over the valid runs. A run is valid when it ended
  without an API error and every judge call answered: 11 runs hit the 5-hour limit of the plan
  and are left out.
- **The floor** needs at least 4 passes over 5 valid runs, on a case the reference passes every
  time; Haiku holds none of the four skills, Sonnet holds three. `design-reframe` and
  `design-audit` hold on Sonnet with no run to spare: the one failure of each is the judged
  rubric (two votes of three for `design-reframe`; three of three for `design-audit`, on a report
  that, read by hand, keeps the search field out of the defects and cites rows in its summary),
  so measure them again whenever the skill or Sonnet changes.
- The figures of `design-audit` are the runs after its fix (#55); the runs before it measured the
  rule that finding 1 describes, and are left out. The same for `work-status` (#63, finding 5):
  its figures ran on the fix and the case merged in a local worktree, before either landed.
- The figures merge the batches run while the graders were being fixed (the calibration runs
  excluded). Where a regex grader changed, it was applied again to the transcripts of the earlier
  batches; the judged graders did not change. The next run of the suite starts from these
  graders, so the PASS% column of its report is the count.

## Findings

1. **`design-audit` marked Pass checks it could not run; fixed in #55.** A row gave Pass to a
   runtime or rendered check read from the code: AB1 (a contrast computed from the stylesheet),
   AB10 ("no animations"), AB8 (a name read from an `aria-label`), EP10. Every model did it, the
   reference too: Opus in 2 runs of 10, Sonnet in 3 of 5, Haiku in 2 of 10. The rule lived in
   step 3 only; step 4, where the result of a row is chosen, listed Pass with no condition. The
   skill now says that the level of a check decides its result, that an estimate from the code
   goes in the row of a Not verifiable, and that a Pass row holds only checks run at their level.
   After the fix no run of 15, on any model, trips `no-unrun-pass`; the reports put the estimate
   in a Not verifiable row (AB1: `#222` on white about 16:1 by the stylesheet, to measure on the
   page).
2. **`design-reframe` on Haiku changes the model before the person's yes** (4 runs of 8), and keeps
   the reader's data editable in the title page, which its model rules out.
3. **`taxonomy` on Haiku qualifies a homonym whose views never meet** ("titolo", 2 runs of 5): it
   reads "the same librarian sees both" as "they meet in one place".
4. **`design-audit` on Haiku loses the principles or touches a file** (2 runs of 5): in one it
   looks for the principles at a path it guesses, finds nothing, and reviews with general criteria
   and no check ids; in the other it calls Edit once, though its report says no file changed.
5. **`work-status` skipped the question when its script could not read GitHub; fixed in #63.**
   With no argument, in a conversation with work, the reference asked what to show in 3 runs of 5.
   In the other 2 `gh` could not start (the sandbox of a run), and it told the person how to give
   the script access instead: "whichever answer would fail the same way". Section 1 found the epic
   through the script and said nothing of a script that fails; it now takes the epic from the
   conversation and asks all the same, the failure in one line above. After the fix, 5 runs of 5.
6. **`work-status` on Sonnet and Haiku asks the right question, without the rule above it and
   without the script.** The judged question passes in all 10 runs: the epic 10 first and
   recommended, the whole repository last, nothing shown. But the horizontal rule above it is
   missing (Sonnet 5 runs of 5, Haiku 4 of 5), and `status.ts` is not run on the piece (Sonnet 3
   of 5, Haiku 1 of 5): they read the epic from the conversation, which names it, without asking
   the script first. Both are rules of the skill the reference keeps: a fix of the skill to weigh,
   not a floor to lower.

## What the calibration fixed

- A regex with three dashes in a row closed the frontmatter of its grader: written `-{3}`.
- A prompt that said "I cannot answer more questions now" read as leave to write the model without
  the yes: the prompt now asks to put the open questions at the end.
- The decoy "titolo" shared one i18n file with the catalogue, so it was a real conflict by the
  skill's own definition: the site admin got its own strings.
- A judge does not know the level of each check, and failed reports that passed code checks such
  as "one column" or "links underlined": the rule is now a regex built from the levels the
  principles give, and it counts only the ids before the result of a row.
- A verdict regex that knew "patched" but not "modificata".

## Cost

21.89 USD at list price for 114 runs, 2.34 of it the judge: 6 runs of calibration and 11 cut by
the plan limit included, the 15 runs of `design-audit` after its fix (3.85 USD), and the 22 runs
of `work-status` (3.10 USD: 2 trial runs, 5 before its fix, 15 after). Three models
at once, 9 runs in flight, reached the 5-hour limit of the plan: run one model at a time.
