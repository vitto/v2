# Results

Runs of 2026-11-25 to 2026-11-27 on Claude Code 2.1.325 and the plugin 0.20.0 (`design-audit`
on 0.21.0 with its fix, #55; `work-status` on 0.26.0 with its fixes, #63 and #65;
`design-reframe` on 0.29.0 with its fix, #70, Sonnet on 0.28.0; `help` on the branch of the epic
#73 after #80), judge
`claude-sonnet-5-5`, with the flags of the [README](README.md#running-it). Costs are list-price
estimates of a valid run, judge included; the runs spent the quota of the plan.

| Skill | Case | Opus 5.5 (reference) | Sonnet 5.5 | Haiku 5.5 | Floor | Cost a run, O / S / H |
| --- | --- | --- | --- | --- | --- | --- |
| `taxonomy` | taxonomy-two-meanings | 5/5 | 5/5 | 3/5 | **Sonnet 5.5** | 0.26 / 0.15 / 0.05 USD |
| `design-reframe` | reframe-reservations | 5/5 | 5/5 | 2/8 | **Sonnet 5.5** | 0.33 / 0.18 / 0.04 USD |
| `design-audit` | audit-project-settings | 5/5 | 4/5 | 3/5 | **Sonnet 5.5**, at the threshold | 0.49 / 0.25 / 0.03 USD |
| `work-status` | work-status-asks-first | 5/5 | 5/5 | 5/5 | **Haiku 5.5**, after its fix (finding 6) | 0.18 / 0.10 / 0.02 USD |
| `help` | help-cheatsheet | 5/5 | 4/5 | 2/5 | **Sonnet 5.5**, at the threshold (finding 8) | 0.15 / 0.09 / 0.01 USD |

How to read it:

- **a/b** is the runs where every grader passed, over the valid runs. A run is valid when it ended
  without an API error and every judge call answered: 11 runs hit the 5-hour limit of the plan
  and are left out.
- **The floor** needs at least 4 passes over 5 valid runs, on a case the reference passes every
  time; Haiku holds one of the five skills, `work-status`, Sonnet all five. `design-audit` and
  `help` hold on Sonnet with no run to spare: the one failure of `design-audit` is the judged
  rubric (three votes of three, on a report that, read by hand, keeps the search field out of the
  defects and cites rows in its summary), that of `help` the rule above the answer (finding 8),
  so measure them again whenever the skill or Sonnet changes. `design-reframe` held the same way
  on 0.20.0; with its fix and the graders of finding 7, Opus and Sonnet pass 5 of 5.
- The figures of `design-audit` are the runs after its fix (#55); the runs before it measured the
  rule that finding 1 describes, and are left out. The same for `work-status` (#63 and #65,
  findings 5 and 6): its figures are the 15 runs on 0.26.0, after both fixes, from the branch of
  #65 before it landed. And for `design-reframe` (#70, finding 7), from the branch of #70: its
  Opus figure is the last batch, on 0.29.0 with the graders as finding 7 leaves them; its Sonnet
  figure the last batch on 0.28.0, with `main` and #68 merged in, judged on the seven points that
  hold the four the judge keeps, and passed again through the new regexes. The batches before
  them are in finding 7. Haiku's are still those of 0.20.0, on the rubric of then.
- `help` is new: before it, on `main` (0.27.0, the case copied in), the reference passed 0 runs
  of 5. No skill ran, so neither did the script; it answered from the listing of the skills,
  named `/v2:work-test` in 3 runs of 5, and put no rule above the answer.
- The figures merge the batches run while the graders were being fixed (the calibration runs
  excluded). Where a regex grader changed, it was applied again to the transcripts of the earlier
  batches; the judged graders did not change, but for the judge of `reframe-reservations`
  (finding 7). The next run of the suite starts from these graders, so the PASS% column of its
  report is the count.

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
7. **`design-reframe` on the reference fell from 7 of 7 to 1 of 5 after #51; fixed in #70.** On
   2026-11-27 the same case passed 5 of 5 on 0.20.0, 1 of 5 on `main` (0.26.0), 4 of 5 on `main`
   with the `SKILL.md` of 0.20.0, 3 of 5 on #68 (descriptions only): the plugin moved, not the
   model or the judge. Of what #51 changed, a run of this case reads the paragraph on the design
   system in step 4 and section 7 of `object-model.md`; neither acts here (the fixture's model has
   no design system, no run reads `design-system.md`, none stops or asks), nor does the question of
   the format, which predates 0.20.0. What moved is how the reference writes what the rubric
   grades: on `main` every answer names the verdict of the Scheda titolo "modificata", a word that
   fits a patch and a rebuild alike, where four answers of five on 0.20.0 wrote "ritoccata" or
   "ricostruita". Over the 20 answers of the four batches, a verdict that means only one thing
   passed 7 times of 7, "modificata" 6 times of 13; the judge keeps votes, not reasons, so this
   is read from the answers. Step 4 now asks for a word that can mean only the verdict, the
   verdict of both shapes when the proposal is not what was asked, the design system in one line
   when the model has none, and the request for the yes on the last line. After the fix, 5 of 5
   on Opus (14 votes of 15), every answer "ritoccata" or "ricostruita" and the yes last.

   With `main` and #68 merged into the branch the same case fell to 2 of 5 on Opus and 3 of 5 on
   Sonnet, though the verdict words held in every answer. The failures kept the reader's data
   editable from the Scheda titolo through a side panel, in the proposal or in a question, some
   rewriting its "never here" to make room; the rubric accepted a side panel and failed the same
   data edited in the view, and the judge split on it (the five answers of the 5 of 5 asked the
   same question). The maintainer decided that a view's "never here" holds for its side panels,
   menus and dialogs too, as section 5 of `docs/object-model.md` implies: they are part of the
   view. The format, the skill and the case now say so. Next batch: no answer of ten offered a
   panel, yet 2 of 5 on each model; a replica judge asked point by point failed the point on the
   Scheda titolo for reasons the case allows (the two verdicts the skill asks for, read as a
   hedge; the reader's name linking to the Scheda lettore). That point is three now (the queue,
   the verdict, the reader's data): 4 of 5 on Opus, and on Sonnet 4 of 5, 5 of 5 once the verdict
   regex reads the line under a heading. The Opus failure, three votes of three, is one the
   replica passes three times of three. On 0.29.0, with #71 merged in, Opus gave 4 of 5 again (11
   votes of 15), failing an answer that holds every point read by hand.

   The eval judge answers one word, with no reasoning and without the task: its prompt, read from
   the CLI 2.1.325, holds only the grader and the last message. A replica of that exact prompt
   passed the failing answer 24 times of 24, so its noise cannot be read locally: on seven points,
   one word is a guess. The judge now keeps the four points that need judgment (the reservation in
   the model, the queue, the verdict of the title page, the reader's data), and three regexes,
   tested on the 63 saved answers, read the rest: a verdict for the Banco prestiti and the Scheda
   lettore when the answer names them, the monthly report unchanged, the request for the yes on
   the last line, which is stricter than the judge was. Two points say what the fixture's model
   does, where a judge read them otherwise: an entity that refers to the title passes point 1, as
   the loan refers to a copy; reading the reader's card and showing only the name passes point 4,
   as the Banco prestiti does. On 0.29.0, 5 of 5 on Opus, 15 votes of 15; every answer keeps the
   reader's data out of panels and dialogs, gives the title page both verdicts and asks for the
   yes last.

8. **`help` on Haiku retold the table instead of showing it** (2 runs of 5): the skill ran and so
   did `help.ts`, but the answer gave a few skills in prose, with no table of the jobs and no
   rule above it; in a third run Haiku did not load the skill, answered from the listing, and
   named `v2:code-review`, which is no skill of v2. Sonnet missed only the rule above the answer,
   in 1 run of 5. Before the runs, the session of #75 found that the first command of the skill,
   `--html="${TMPDIR:-/tmp}/v2-help.html"`, is refused in `dontAsk` mode, the mode of a run (a
   `${...}`, quotes or a heredoc fail the rule `Bash(node *help.ts*)`); #80 made it a bare
   `--html` before these runs. The floor stays Sonnet: no fix for Haiku (the maintainer's
   choice, 2026-11-27).

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
- The rubric of `reframe-reservations` accepted a side panel for the reader's data and failed the
  same data edited in the view; a side panel is part of the view, so it now fails both, as the
  skill does (finding 7).
- Its point on the Scheda titolo held four conditions, and the judge failed it for reasons the case
  allows: it is three points, each saying what passes.
- The verdict regex of the title page looked on the line of its name only; it reads the next line
  too, unless it is a table row.
- A judge that answers one word held seven points: the three a regex can read are regexes, and
  the judge keeps four, two of them spelled out from the fixture's model.

## Cost

23.36 USD at list price for 129 runs, 2.52 of it the judge: 6 runs of calibration and 11 cut by
the plan limit included, the 15 runs of `design-audit` after its fix (3.85 USD), and the 37 runs
of `work-status` (4.57 USD: 2 trial runs, 5 before its first fix, 15 after it, 15 after the
second, 1.47 USD). Three models
at once, 9 runs in flight, reached the 5-hour limit of the plan: run one model at a time.
`help-cheatsheet` (2026-11-27): 20 runs, 1.82 USD, 0.57 of it the 5 runs before the skill.

Finding 7 (#70) added 5.90 USD for 16 valid runs and 4 cut by the plan limit, judge included:
the 5 runs on 0.20.0 (1.77 USD), the 5 on `main` with the skill of 0.20.0 (1.82), the 5 on Opus
after the fix (1.75), and the first Sonnet runs after it (0.56). The batches of `main` and #68
that found it are not counted here. Its second part, with #68 merged in, added 8.06 USD: three
batches of 5 on Opus and on Sonnet (2.31, 2.42, 2.45) and an Opus batch the plan limit cut, with
no valid run (0.88). Its third part, on 0.29.0, added 3.21 USD: the Opus batch of 4 of 5 (1.57)
and the one with the judge split (1.64); a batch that an expired login stopped cost nothing, and
the calls of the replica judges are not counted.
