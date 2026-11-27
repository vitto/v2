# Results

Runs of 2026-11-25 and 2026-11-26 on Claude Code 2.1.325 and the plugin 0.20.0 (`design-audit`
on 2026-11-27 with its report drawn by `audit.ts`, the branch of #75; `work-status` on 0.26.0
with its fixes, #63 and #65; `help` on 2026-11-27, on the branch of the epic #73 after #80), judge
`claude-sonnet-5-5`, with the flags of the [README](README.md#running-it). Costs are list-price
estimates of a valid run, judge included; the runs spent the quota of the plan.

| Skill | Case | Opus 5.5 (reference) | Sonnet 5.5 | Haiku 5.5 | Floor | Cost a run, O / S / H |
| --- | --- | --- | --- | --- | --- | --- |
| `taxonomy` | taxonomy-two-meanings | 5/5 | 5/5 | 3/5 | **Sonnet 5.5** | 0.26 / 0.15 / 0.05 USD |
| `design-reframe` | reframe-reservations | 7/7 | 4/5 | 2/8 | **Sonnet 5.5**, at the threshold | 0.32 / 0.16 / 0.04 USD |
| `design-audit` | audit-project-settings | 4/4 | 5/5 | 2/5 | **Sonnet 5.5** (finding 8) | 0.67 / 0.32 / 0.06 USD |
| `work-status` | work-status-asks-first | 5/5 | 5/5 | 5/5 | **Haiku 5.5**, after its fix (finding 6) | 0.18 / 0.10 / 0.02 USD |
| `help` | help-cheatsheet | 5/5 | 4/5 | 2/5 | **Sonnet 5.5**, at the threshold (finding 7) | 0.15 / 0.09 / 0.01 USD |

How to read it:

- **a/b** is the runs where every grader passed, over the valid runs. A run is valid when it ended
  without an API error and every judge call answered: 11 runs hit the 5-hour limit of the plan
  and are left out.
- **The floor** needs at least 4 passes over 5 valid runs, on a case the reference passes every
  time; Haiku holds one of the five skills, `work-status`, Sonnet all five. `design-reframe`
  holds on Sonnet with no run to spare: its one failure is the judged rubric (two votes of
  three), so measure it again whenever the skill or Sonnet changes.
- The figures of `design-audit` are the runs of the branch of #75 (1e652df), the report written
  as JSON and drawn by `scripts/audit.ts`. Before it, on the branch of the epic #73 (79b9a78,
  the report written by hand), the reference passed 5 runs of 5. Opus has 4 valid runs: the
  fifth stalled on API retries until the timeout of 1200 s and is left out. On 0.21.0, after
  its fix (#55), the case gave 5/5, 4/5 and 3/5; the one failure of Sonnet there was the judged
  rubric, three votes of three, on a report that, read by hand, kept the search field out of the
  defects and cited rows in its summary.
- The figures of `work-status` are the 15 runs on 0.26.0, after both of its fixes (#63 and #65,
  findings 5 and 6), from the branch of #65 before it landed.
- `help` is new: before it, on `main` (0.27.0, the case copied in), the reference passed 0 runs
  of 5. No skill ran, so neither did the script; it answered from the listing of the skills,
  named `/v2:work-test` in 3 runs of 5, and put no rule above the answer.
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
6. **`work-status` on Sonnet and Haiku asked the right question without the rule above it and
   without the script; fixed in #65.** On 0.25.0 the judged question passed in all 10 runs (the
   epic 10 first and recommended, the whole repository last, nothing shown), but the horizontal
   rule above it was missing (Sonnet 5 runs of 5, Haiku 4 of 5) and `status.ts` was not run on the
   piece (Sonnet 3 of 5, Haiku 1 of 5): they read the epic from the conversation, which names it.
   Section 1 asked for the script without saying it holds when the conversation names the epic,
   and for the rule only at the top of the skill, far from the question. It now says both where
   the question is written: the script on each piece even then, the conversation only its
   fallback (the maintainer's choice), and the rule right above the question. After the fix, 5
   runs of 5 on each of the three models.

7. **`help` on Haiku retold the table instead of showing it** (2 runs of 5): the skill ran and so
   did `help.ts`, but the answer gave a few skills in prose, with no table of the jobs and no
   rule above it; in a third run Haiku did not load the skill, answered from the listing, and
   named `v2:code-review`, which is no skill of v2. Sonnet missed only the rule above the answer,
   in 1 run of 5. Before the runs, the session of #75 found that the first command of the skill,
   `--html="${TMPDIR:-/tmp}/v2-help.html"`, is refused in `dontAsk` mode, the mode of a run (a
   `${...}`, quotes or a heredoc fail the rule `Bash(node *help.ts*)`); #80 made it a bare
   `--html` before these runs. The floor stays Sonnet: no fix for Haiku (the maintainer's
   choice, 2026-11-27).
8. **`design-audit` drew its report with `audit.ts` in 6 valid runs of 14, and wrote it by hand
   in the others** (#75): Opus 2 of 4, Sonnet 4 of 5, Haiku 0 of 5. The script was never
   refused. Every run that skipped it had met one denial before, of another command: a compound
   `ls && find; cat` looking for the files, or `rendered.ts`, left out of the runs. The message of
   a denial names the tool, not the command ("Permission to use Bash has been denied"), and the
   answer reads it as all of Bash ("i comandi della shell non sono consentiti in questa
   sessione"), though the skill says a refusal of another command says nothing about this one.
   The table by hand keeps the rules, and the graders pass it. Of the 6 runs that drew it, 3 were
   refused first, every time for the same field: a row of passes or of not verifiable without
   `note`, its `looked` or its `verify` and `estimate` holding what it found; they fixed the JSON
   and ran it again. Haiku lost the target in 1 run (it looked for the page in the folder of the
   plugin, and its Glob and Read there were denied) and failed the judged rubric in 2, on the
   search field reported in a row of defects or in the opinions.

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

23.36 USD at list price for 129 runs, 2.52 of it the judge: 6 runs of calibration and 11 cut by
the plan limit included, the 15 runs of `design-audit` after its fix (3.85 USD), and the 37 runs
of `work-status` (4.57 USD: 2 trial runs, 5 before its first fix, 15 after it, 15 after the
second, 1.47 USD). Three models
at once, 9 runs in flight, reached the 5-hour limit of the plan: run one model at a time.
`help-cheatsheet` (2026-11-27): 20 runs, 1.82 USD, 0.57 of it the 5 runs before the skill.
`audit-project-settings` on #75 (2026-11-27): 24 runs, 8.98 USD, 3.59 of it the 7 runs before
the change and 0.64 the 2 trial runs; 19 more runs met the plan limit at their start and cost
nothing.
