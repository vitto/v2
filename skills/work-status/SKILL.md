---
name: work-status
description: 'Where the work stands, as tables. With an epic number, the epic - what it is for, its branch, a line per part in the order its work lands with what matters, an icon for its state and its branch, the open pull requests with their checks, conflicts and shared files - and the next action. Without one, the repository - open epics, open pull requests and what holds each, local worktrees with work GitHub has not seen. Use when asked where things stand, for the state of an epic, a pull request or the repository; in Italian "stato", "a che punto siamo", "come siamo messi".'
argument-hint: "[epic number]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts *), Bash(gh issue view *)
---

# Where the work stands

The epic, if given: $ARGUMENTS. The rules are `${CLAUDE_PLUGIN_ROOT}/GOVERNANCE.md`: rule 1 (a
person decides every merge) and rule 2 (the parts land in the branch of the epic, the epic in the
default branch). The script says in its header where each answer comes from.

Before each step, say in one line what it does. Every answer is tables, never a retelling in
prose: show what the script prints, in its order, without dropping rows, and add one line at most
on what the person has to decide.

## 1. The table

In the repository the person is working on:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts <epic number>
```

Without a number it shows the repository: its open epics, its open pull requests, its local
worktrees. When the person asked about an epic without naming it and the table lists more than
one, ask which; when their words name a subject several open epics share ("the epic of the
studio"), show each of them instead. Other options: `--branch=<branch of the epic>` when the
table says the branch is unknown, `--repo=<owner/name>` for a repository other than the folder's.

## 2. What you write in the report of an epic

The script prints the titles of GitHub as they are; three things it cannot write are yours.
Everything else stays as printed: the rows and their order, the numbers, the icons, the branches,
the table of the open pull requests, the next action.

- **The name of the epic**: after the dot of the heading, a short name instead of the title (no
  `epic:` prefix, no list of the parts).
- **What the epic is for**: under the heading, before the branch, two to four sentences or a short
  list, from the body of the epic (`gh issue view <epic> --json body`): why the work exists, what
  it is made of, when it is done, and what it waits for or what waits for it.
- **What matters**: each title of the column rewritten as one phrase of at most 55 characters
  saying what is crucial in that part, so the column stays narrow and every row reads at a
  glance. When the title is not enough, read the body of the part.

Write them, the headers of the tables, the legend and the word `Branch` in the language of the
conversation. A number in the first column is a link whose text is the bare number: keep it so,
without `#` (the Claude desktop app shows `[#12](...)` to an issue as `owner/name#12`). With more
than one epic, one block each, the legend once above the first.

## 3. What it means

- The icon of a part: merged, a pull request of it merged into the branch of the epic or the part
  closed; pull request open; to do, anything else, a pull request merged into another branch
  while the part stays open included (an earlier round left the rest of it to do).
- "ready" means the person can decide, never that you may merge: a merge waits for the person's ok
  naming the pull request (`/v2:work-merge`, rule 1).
- A worktree holding work GitHub has not seen (uncommitted files, commits no remote branch holds)
  is work that can be lost or forgotten: say so.
- When a preview of the epic exists (a `<epic>-preview` worktree), `/v2:work-test <epic>` rebuilds it
  and shows what it holds.
- The tables say where the work stands, not what it is made of: for that, offer `/v2:work-map` with the
  same epic or pull request in one line at the end.
- After builds or tests run in this conversation, add them as a table `What | Result | Detail`
  (the command, passed or failed with the counts, the names of what failed).

If the script fails (`gh` not signed in, not a GitHub repository, not an issue), show its error
and what would fix it.
