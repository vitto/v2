---
name: status
description: 'Where the work stands, as tables. With an epic number, the epic in the order its work lands - parts, pull requests, where each lands, checks, conflicts, shared files, distance from the default branch - and the next action. Without one, the repository - open epics, open pull requests and what holds each, local worktrees with work GitHub has not seen. Use when asked where things stand, for the state of an epic, a pull request or the repository; in Italian "stato", "a che punto siamo", "come siamo messi".'
argument-hint: "[epic number]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts *)
---

# Where the work stands

The epic, if given: $ARGUMENTS. The rules are `${CLAUDE_PLUGIN_ROOT}/GOVERNANCE.md`: rule 1 (a
person decides every merge) and rule 2 (the parts land in the branch of the epic, the epic in the
default branch). The script says in its header where each answer comes from.

Before each step, say in one line what it does. Every answer is tables, never a retelling in
prose: show what the script prints as it is, in its order, without dropping rows, and add one line
at most on what the person has to decide.

## 1. The table

In the repository the person is working on:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts <epic number>
```

Without a number it shows the repository: its open epics, its open pull requests, its local
worktrees. When the person asked about an epic without naming it and the table lists more than
one, ask which. Other options: `--branch=<branch of the epic>` when the table says the branch is
unknown, `--repo=<owner/name>` for a repository other than the folder's.

## 2. What it means

- "ready" means the person can decide, never that you may merge: a merge waits for the person's ok
  naming the pull request (`/v2:merge`, rule 1).
- A worktree holding work GitHub has not seen (uncommitted files, commits no remote branch holds)
  is work that can be lost or forgotten: say so.
- When a preview of the epic exists (a `<epic>-preview` worktree), `/v2:test <epic>` rebuilds it
  and shows what it holds.
- After builds or tests run in this conversation, add them as a table `What | Result | Detail`
  (the command, passed or failed with the counts, the names of what failed).

If the script fails (`gh` not signed in, not a GitHub repository, not an issue), show its error
and what would fix it.
