---
name: work
description: 'Where the work stands, how to test it, and the merges the person approves by naming the pull request, in one entry. Use when asked where things stand, to try or merge the work; in Italian "stato", "a che punto siamo", "testa", "fammelo provare", "ok #N", "mergia", "mergiala".'
argument-hint: "[status | test | merge] [epic, issue, pull request, branch, worktree or subject]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/preview.ts *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/pages.ts), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/pages.ts *), Bash(gh issue view *), Bash(gh pr view *), Bash(git log *), Bash(git diff *), Bash(git -C *)
---

# The work: where it stands, how to test it, the merges the person approves

What the person gave: $ARGUMENTS, with the words of their message. The rules are
`${CLAUDE_PLUGIN_ROOT}/GOVERNANCE.md`, rule 1 above all: every merge is the person's decision,
given by naming the pull request. Each script says in its header where each answer comes from.

## The job

One job per request. Take it from the first word of the arguments, else from the person's words,
then read its file, beside this one, and follow it; the rest of the arguments is the target, as
that file reads it.

| Job | When | File |
|-----|------|------|
| **merge** | the first word is `merge`; or the person approves a merge or asks for one: "ok #1302", "mergia #1302", "mergiala", "merge it" | [merge.md](merge.md) |
| **test** | the first word is `test`; or the person asks to see, try or test the work: "testa", "fammi vedere la 12", "fammelo provare" | [test.md](test.md) |
| **status** | the first word is `status`; anything else: a number, a branch, a subject, nothing; "stato", "a che punto siamo", "come siamo messi" | [status.md](status.md) |

- **Merge only on words that ask for one.** "ok" or "mergia" without a number is the merge job
  all the same: its first step asks which pull request, and never takes one from the
  conversation. A pull request named ready elsewhere (a table, a report, an earlier message) is
  never a reason to merge.
- **Between status and test, status**: it only reads, and its answer offers the test.
- **One job leads to another only through the person.** When a job ends on another (the next
  action of the status says a pull request is ready to decide; a merge ends with the new state),
  name it in one line; the person's answer starts it, from this table. The status of one piece
  of work runs `/v2:work-map` on it, as [status.md](status.md) says.

## Every job

Where the answer starts: put a horizontal rule (`---` on a line of its own, with an empty line
before and after it, or Markdown reads the line above as a heading) right above what this skill
answers - its report, tables, map or questions - so the person sees where it starts. The
one-line notes before each step stay above it.

Before each step, say in one line what it does. Show what the scripts print as it is, in its
order, without dropping rows: tables, never a retelling in prose, and one line at most on what
the person has to decide.

If a script fails (`gh` not signed in, not a GitHub repository, not an issue), show its error and
what would fix it.
