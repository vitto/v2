---
name: work-status
description: 'Where the work stands, as tables. With an epic number, the epic - what it is for, its branch, a line per part in the order its work lands with what matters, an icon for its state and its branch, the open pull requests with their checks, conflicts and shared files - and the next action. Without one, the repository as a summary - each open epic with what it is for and its parts not merged yet, the open issues outside an epic grouped by subject with a summary above each group, the open pull requests and what holds each, local worktrees with work GitHub has not seen. With words instead of a number, the same summary for one subject - the related epics first, then the related issues outside an epic, grouped. Pointed at one piece of work - an issue, a pull request, a branch or a worktree - what it does in a few plain sentences, its state, then its map from /v2:work-map. Use when asked where things stand, for the state of an epic, a pull request or the repository; in Italian "stato", "a che punto siamo", "come siamo messi".'
argument-hint: "[epic, issue or pull request number, branch, worktree, or subject]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts *), Bash(gh issue view *), Bash(gh pr view *), Bash(git log *), Bash(git diff *), Bash(git -C *)
---

# Where the work stands

What the person gave, if anything: $ARGUMENTS (a number is an epic, or one issue or pull
request; the name of a branch or of a worktree is one piece of work, section 5; other words are a
subject, section 4). The rules are `${CLAUDE_PLUGIN_ROOT}/GOVERNANCE.md`: rule 1 (a
person decides every merge) and rule 2 (the parts land in the branch of the epic, the epic in the
default branch). The script says in its header where each answer comes from.

Before each step, say in one line what it does. Every answer is tables, never a retelling in
prose: show what the script prints, in its order, without dropping rows, and add one line at most
on what the person has to decide.

## 1. The table

In the repository the person is working on:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts <what the person gave>
```

A number with sub-issues is an epic (section 2); any other number, a branch or a worktree (its
folder name or path) is one piece of work (section 5), and a branch named after an epic is that
epic. Without anything, or with words that name no branch and no worktree, it shows the repository: each open epic as a summary, the open issues outside
an epic, the open pull requests, the local worktrees (section 3). When the person asked about an
epic without naming it and the overview lists more than one, ask which; when their words name a
subject instead ("the epic of the studio", "lavorazioni di studio"), section 4. Other
options: `--branch=<branch of the epic>` when the table says the branch is unknown,
`--repo=<owner/name>` for a repository other than the folder's.

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

## 3. What you write in the overview of the repository

Without a number the script prints a summary, the form the maintainer chose on 2026-11-24: the
legend once, a block per open epic, then the open issues outside an epic in one table, then the
open pull requests, the local worktrees and the next action. The work is grouped as epics are,
and what belongs to no epic is grouped too, "like an epic of various things".

- **Each epic**: the same three things as in its report (section 2), the name, what it is for
  (`gh issue view <epic> --json body`, one call per epic) and what matters in each row. The
  block lists only what is not merged yet; the merged parts are in its count, which stays as
  printed.
- **The open issues outside an epic**: split the table into groups by subject, each written as
  an epic of its own:
  - a heading as the one of an epic: `###`, a short name of the subject the issues share (a
    component, an area, a kind of work, never their state), the dot, and how many issues;
  - under it two to four sentences: what the issues have in common, what is moving (a pull
    request open), and what would close the group;
  - the table `# | What matters | State | Branch` with its issues, in the order the script
    printed them, without the column `Labels`: it served the grouping;
  - every issue in exactly one group, every group with two issues at least; an issue alone in its
    subject goes to a last group of various things, whose sentences say what is in it;
  - the groups with a pull request open first, then the larger ones; the various things last;
  - the subject from the title and the labels (`prg-*`, `bug`); the body only when they are not
    enough. An issue titled `epic:` without sub-issues is an issue like the others: say in the
    sentences of its group that it has no parts yet.
- **The open pull requests**: what matters in each, as for a part.

Everything else stays as printed: the legend, the counts, the numbers, the icons, the branches,
the tables of the pull requests and of the worktrees, the next action. Headers, legend, the names
and the sentences in the language of the conversation.

## 4. A subject instead of a number

When the person gives words instead of a number ("lavorazioni di studio", "the work on the
studio"), they name a subject: the script, given words that name no branch and no worktree,
prints the overview after a first line saying so. Show the overview of section 3 for that subject
only, as the maintainer asked on 2026-11-24, the line naming the subject in place of that one.

- **The epics first**: each open epic related to the subject, as a block of section 3, in the
  order the script printed them. An epic is related when the subject is what its title, its body
  or the titles of its parts are about.
- **Then the issues outside an epic** related to it, grouped by subject as in section 3; when they
  are few, one group.
- **The pull requests, the worktrees and the next action**: only the rows of the work shown (a pull
  request of a part, of an issue or into the branch of an epic shown; a worktree on one of their
  branches).
- The match is by meaning, not by spelling: the subject in the language of the conversation finds
  titles in another ("studio" finds `theme-studio`, "campi" finds the fields). Under the heading
  of the overview, one line names the subject and how many epics and issues it found. When nothing
  is related, say so and offer the whole overview.

## 5. One piece of work

When the target is one piece of work, never a list (an issue that is not an epic, a pull request,
a branch, a worktree), the script prints its heading, its state, its epic, its branch, its
worktree, its pull requests and the next action. The maintainer asked on 2026-11-24 that it open
with what the work does, and that its map follow it. Yours:

- **The name**: after the dot of the heading, a short name instead of the title, as for an epic;
  a heading with no issue (`Branch ...`, `Worktree ...`) stays as printed.
- **What it does**: right under the heading, before the state, two or three sentences that say
  exactly what the work does, in plain words: what changes, and for whom (a person on a screen,
  a product that installs it, whoever maintains it). No reference to the code (no file,
  function, token, class, tag or command), no issue or pull request number, no branch: what it
  does, not where. Read, in this order: the issue (`gh issue view <n> --json title,body`), its
  pull request (`gh pr view <n> --json title,body`), then the work itself, which wins when they
  disagree: its commits (`git log --oneline origin/<base>..<branch>`) and its diff
  (`git diff --stat origin/<base>...<branch>`, then the diff); for a worktree, also what is
  uncommitted (`git -C <folder> status --short`, `git -C <folder> diff HEAD`). When the work does
  more or less than the issue asks, say it in a last sentence. With no work yet (no branch, no
  diff), say what it will do, from the issue.
- **What matters** in each row of the pull requests, as for a part.
- **The map**, last: run `/v2:work-map` on the same target (the issue or the pull request by its
  number, a branch by its name, a worktree by its folder path) and show what it gives under a
  heading "How it works", in the language of the conversation, as it prints it: the line that
  sums it up, the diagram (its Mermaid block), the legend, then the table. Never the table
  without the diagram: the table is the diagram in words, for whoever cannot see it (left out on
  2026-11-24, and the maintainer asked where the diagram was). Open the page its `--html` writes
  too. It picks done or planned itself: done when there is work, planned from the issue
  otherwise.

Everything else stays as printed: the icon, the branches, the counts, the table of the pull
requests, the next action. Headers and the words before the colon (State, Epic, Branch, Worktree)
in the language of the conversation.

## 6. What it means

- The icon of a part: merged, a pull request of it merged into the branch of the epic or the part
  closed; pull request open; to do, anything else, a pull request merged into another branch
  while the part stays open included (an earlier round left the rest of it to do).
- The icon of an issue outside an epic: pull request open, when an open pull request belongs to
  it as to a part (it closes the issue with a keyword, or comes from a branch linked to it or
  named `<issue>-`); to do otherwise. It is never shown merged in a list: merging into the default
  branch closes it (rule 3); one closed issue, pointed at alone, is merged.
- How one piece of work leads to the rest: a pull request to the issue it closes (else the number
  its branch starts with); a branch to the issue it is named after (`<issue>-<slug>`, rule 3), a
  branch named after an epic but not linked to it being the epic's own work; a worktree to its
  branch, or, detached, to the issue its folder name ends with (`magma-wt-1427`).
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
