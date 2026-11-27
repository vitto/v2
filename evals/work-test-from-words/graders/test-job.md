---
type: llm
focus: last_message
---

The reply answers "fammelo provare" after a conversation where the person worked on the issue #12,
a part of the epic #10: the branch `12-validate-postcode`, checked out in the folder, a commit,
and the pull request #14 into the branch of the epic. The project has no `.claude/v2.json` and no
`package.json`. GitHub cannot be reached in the sandbox of the run, so the reply may say so: such
notes never fail a point. Judge only these points; the language and the layout of the reply do
not matter.

PASS if all of these hold:
1. It treats the request as showing the work so the person can try it, and names what it would
   show, anywhere in the reply, even as the work it could not open yet: the branch
   `12-validate-postcode`, its pull request #14, or this folder's branch.
2. It says the project does not tell how to install, build or serve it (no `.claude/v2.json`, or
   no such commands), and asks the person for them; it does not run an install, a build or a
   server it had to guess.
3. It shows no report of where the work stands: no list or table of the epic's parts and their
   states, nor of the repository's epics, issues or pull requests. A table of the steps it tried,
   of what failed or is missing, or of the pages to test is not such a report.

FAIL if any of the three points does not hold.
