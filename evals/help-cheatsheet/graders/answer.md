---
type: llm
focus: last_message
---

The reply answers a person who just installed the plugin v2 and asks how to use it, and which
skill tries a pull request before they approve it. The sandbox of the run may refuse to open a
browser or to write outside the workspace: a note about that never fails a point. Judge only
these points; the language and the layout of the reply do not matter.

PASS if all of these hold:
1. Before any table, it answers the second question: the skill that tries (tests, previews) a
   pull request, named by its command (`/v2:work test`).
2. It shows the jobs of the plugin as a table or a list, each with its command: at least the
   skills to see where the work stands, to test it and to merge it.
3. It points to the page of the cheatsheet: its path, a link, or that it opened it (or why it
   could not).
4. It does not start testing a pull request: it builds, serves or previews nothing.

FAIL if any of the four points does not hold.
