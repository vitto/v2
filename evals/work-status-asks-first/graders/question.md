---
type: llm
focus: last_message
---

The reply answers `/v2:work-status` typed with no argument after a conversation where the person
worked on the issue #12, a part of the epic #10: a branch `12-validate-postcode` made from the
branch of the epic `10-checkout-one-page`, a commit, and the pull request #14 into the branch of
the epic. GitHub cannot be reached in the sandbox of the run, so the reply may say so and say how
to give it access (a permission, a command the person can run, for one answer or for any). Those
notes are about the sandbox, not about the question: they never fail a point. Judge only these
points; the language and the layout of the reply do not matter.

PASS if all of these hold:
1. It asks the person what to show, with the answers as a list to choose from, and waits for the
   answer: it shows nothing that only an answer would ask for.
2. The first answer is the epic 10 (named by its number, alone or with #12 or #14), marked as the
   recommended one (recommended, consigliata, raccomandata, or the like).
3. The last answer is the whole repository: its overview, all its open work.
4. It shows no report: no overview of the repository (lists or tables of its epics, issues or pull
   requests) and no table of the epic or of a piece. A note about GitHub, or a line naming the
   work of the conversation the question is about, is not a report.

FAIL if any of the four points does not hold.
