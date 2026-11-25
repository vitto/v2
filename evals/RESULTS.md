# Results

Runs of 2026-11-25 on Claude Code 2.1.325, judge `claude-sonnet-5-5`, with the flags of the
[README](README.md#running-it). Costs are list-price estimates of each run, judge included; the
runs spent the quota of the plan.

| Skill | Case | Opus 5.5 (reference) | Sonnet 5.5 | Haiku 5.5 | Floor | Cost a run, O / S / H |
| --- | --- | --- | --- | --- | --- | --- |
| `taxonomy` | taxonomy-two-meanings | 5/5 | not measured (plan limit) | 3/5 | to measure: Sonnet or Opus | 0.26 / - / 0.05 USD |
| `design-reframe` | reframe-reservations | 7/7 | 3/4 | 2/8 | to measure: Sonnet if its next valid run passes, else Opus | 0.30 / 0.16 / 0.04 USD |
| `design-audit` | audit-project-settings | 8/10 | 2/5 | 4/10 | none: the reference does not pass (finding 1) | 0.50 / 0.27 / 0.07 USD |

How to read it:

- **a/b** is the runs where every grader passed, over the valid runs. A run is valid when it ended
  without an API error and every judge call answered: 8 runs hit the 5-hour limit of the plan
  and are left out.
- **The floor** needs at least 4 passes over 5 valid runs, on a case the reference passes every
  time; Haiku holds none of the three skills.
- The figures merge the batches run while the graders were being fixed (the calibration runs
  excluded). Where a regex grader changed, it was applied again to the transcripts of the earlier
  batches; the judged graders did not change. The next run of the suite starts from these
  graders, so the PASS% column of its report is the count.

## Findings

1. **`design-audit` marks Pass checks it could not run.** A row gives Pass to a runtime or
   rendered check read from the code: AB1 (a contrast computed from the stylesheet), AB10 ("no
   animations"), AB8 (a name read from an `aria-label`), EP10. Every model does it, the reference
   too: Opus in 2 runs of 10, Sonnet in 3 of 5, Haiku in 2 of 10. `SKILL.md` and
   `docs/rendered.md` already say "not verifiable, never a pass"; the rule does not hold where the
   report is written. A fix of the skill, not a limit of a model: say it in step 4 of the skill,
   with the estimate from the stylesheet as the example. Until then the case has no floor.
2. **`design-reframe` on Haiku changes the model before the person's yes** (4 runs of 8), and keeps
   the reader's data editable in the title page, which its model rules out.
3. **`taxonomy` on Haiku qualifies a homonym whose views never meet** ("titolo", 2 runs of 5): it
   reads "the same librarian sees both" as "they meet in one place".

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

12.34 USD at list price for 71 runs (6 of calibration). Three models at once, 9 runs in flight,
reached the 5-hour limit of the plan: run one model at a time.
