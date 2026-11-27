# Where the work stands

The status job of `/v2:work` ([SKILL.md](SKILL.md), beside this file, holds the rules of every
job). The target, if any: the arguments after `status`, or the person's words (a number is an epic, or one issue or pull
request; the name of a branch or of a worktree is one piece of work, section 5; other words are a
subject, section 4; nothing at all is a question, the epic of the conversation's work or the
whole repository, and the repository in a new conversation, section 1). The rules are `${CLAUDE_PLUGIN_ROOT}/GOVERNANCE.md`: rule 1 (a
person decides every merge) and rule 2 (the parts land in the branch of the epic, the epic in the
default branch). The script says in its header where each answer comes from.

Inside the answer, a horizontal rule the same way as the one above it ([SKILL.md](SKILL.md),
"Every job") between its blocks, as the maintainer asked on 2026-11-26: keep the ones the script prints (after the
legends, between the epics, before the issues outside an epic, the pull requests, the worktrees
and the next action) and put one after each block you write (each group of issues, the map).

## 1. The table

In the repository the person is working on:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts <what the person gave>
```

When the person gave nothing, the conversation says what to ask, as the maintainer asked on
2026-11-26 (a conversation about one part answered with the whole repository; the person
chooses between the epic of that part and the whole repository):

- **A conversation that already has work**: ask what to show before any report. Its work is each
  issue, pull request, branch or worktree it acts on or is about: named by the person, worked on
  in it (a branch made, a commit, a pull request opened or merged), or in the summary of an
  earlier part of it; not every number it met in passing (a row of a table, an issue found on the
  way). First find the epic of each piece: run the script on the piece and read the `Epic:` its
  report names (a branch named after an epic is that epic), also when the conversation already
  names the epic: the script shows a piece moved to another epic or an epic already closed, which
  the conversation cannot know (#65: below the reference, models took the epic from the
  conversation and skipped the script). The conversation is only the fallback: when the script
  cannot read the piece (GitHub out of reach, `gh` not logged in or not allowed to start), take
  its epic from the conversation - the branch its branch or pull request was made on, the epic
  the person named - else the piece is its own answer; and ask all the same, the failure in one
  line above the question: the answer waits for the person, only the report waits for GitHub.
  How to give the script access goes after the question, never instead of it (#63: without this,
  the reference model skipped the question in 2 runs of 5). Then put a horizontal rule (`---` on a line
  of its own, an empty line before and after it) right above the question - above the dialog, or
  above the list in chat - with the line on a failure above the rule: until the person picks,
  the question is the answer of this skill (#65: below the reference, the question came without
  it). And ask, in the question dialog (in Claude Code, `AskUserQuestion`), one question, "What
  do I show?", with these answers:
  - one per epic, else one per piece without an epic, in the order the conversation met them, at
    most three, the first marked recommended ("The epic 1397, which #1400 is a part of
    (Recommended)"); an epic reached by several pieces is one answer;
  - the last, "The whole repository, its issues grouped": the overview.

  The answer leads to section 2 for an epic, section 5 for a piece, section 3 for the repository.
  Where the dialog cannot be shown, ask the same in chat as a numbered list and stop until the
  person answers. Never run the script with nothing before the answer: the overview is one of
  the answers, not the default.
- **A new conversation**, with no work yet, or a person asking for the whole repository in words
  ("tutto il repository", "il quadro d'insieme", "overview"): nothing to ask and nothing to pass,
  the overview (section 3).

A number with sub-issues is an epic (section 2); any other number, a branch or a worktree (its
folder name or path) is one piece of work (section 5), and a branch named after an epic is that
epic. The script, run with nothing or with words that name no branch and no worktree, shows the
repository: each open epic as a summary, the open issues outside an epic, the open pull requests,
the local worktrees (section 3). When the person asked about an
epic without naming it and the overview lists more than one, ask which; when their words name a
subject instead ("the epic of the studio", "lavorazioni di studio"), section 4. Other
options: `--branch=<branch of the epic>` when the table says the branch is unknown,
`--repo=<owner/name>` for a repository other than the folder's.

## 2. What you write in the report of an epic

The script prints the titles of GitHub as they are; four things it cannot write are yours.
Everything else stays as printed: the rows and their order, the numbers, the icons, the branches,
the table of the open pull requests, the rules between the blocks, the next action.

- **The name of the epic**: after the dot of the heading, a short name instead of the title (no
  `epic:` prefix, no list of the parts).
- **What the epic is for**: under the heading, before the branch, two to four sentences or a short
  list, from the body of the epic (`gh issue view <epic> --json body`): why the work exists, what
  it is made of, when it is done, and what it waits for or what waits for it.
- **Details**: each title of the column rewritten as one phrase of at most 55 characters saying
  what is crucial in that part, so the column stays narrow and every row reads at a glance. When
  the title is not enough, read the body of the part. The branch under it (after `<br>`) stays as
  printed: since 2026-11-26 it is there instead of a column of its own.
- **The domain**: the `?` of the column `Domain`, replaced in every row by its chip, below.

### The domain

What kind of work a row is, so the person reads it at a glance without confusing one kind with
another (the maintainer, 2026-11-26). The set is fixed, the one of the second legend the
script prints (`DOMAINS` in `scripts/lib/epic.ts`): never another word, never another colour,
never translated, so a colour means the same in every run and every project. The chip is the
coloured circle of the legend and the word together, as the legend writes them, never the colour
alone. One per row: **the first of this list that applies**, judged on what the work changes.

| Domain | When |
|---|---|
| bug | The product does not do what it promises - its documentation, an accessibility floor, how it worked before - even when the fix is only a style |
| change | What exists changes or moves with nothing new for whoever uses it: a breaking change, a rename, a removal, a refactor |
| css | Only the look changes, by choice: styles, tokens, colours, spacing, type, with no new property, event or markup |
| feature | Something new for whoever uses the product: a component, a property, a case of a pattern, a command, a page |
| docs | Only the documentation and the guides, a mistake in them included |
| governance | Only how the work flows: rules, workflows, review, release, labels, the skills of the maintainers |
| tooling | Only what builds, tests and measures the product: the build, CI, dependencies, tests and their infrastructure, scripts |

Read it from the title and the labels; the body only when they are not enough. Labels are a
hint, not the answer: `bug` points to bug, `docs` to docs, but an issue labelled `feature` that
only asks for another look is css. A pull request takes the domain of the issue it closes, else
the one its title says (`fix` a bug, `docs` docs); the epic's own work, the domain of what it
does.

Write the names, the sentences, the headers of the tables, the legends and the word `Branch` in
the language of the conversation; the words of the chips stay as they are. A number in the first
column is a link whose text is the bare number: keep it so, without `#` (the Claude desktop app
shows `[#12](...)` to an issue as `owner/name#12`). With more than one epic, one block each, the
legends once above the first.

## 3. What you write in the overview of the repository

Without a number the script prints a summary, the form the maintainer chose on 2026-11-24: the
legends once, a block per open epic, then the open issues outside an epic in one table, then the
open pull requests, the local worktrees and the next action, a rule between each. The work is
grouped as epics are, and what belongs to no epic is grouped too, "like an epic of various
things".

- **Each epic**: the same four things as in its report (section 2), the name, what it is for
  (`gh issue view <epic> --json body`, one call per epic), the details and the domain of each
  row. The block lists only what is not merged yet; the merged parts are in its count, which
  stays as printed.
- **The open issues outside an epic**: split the table into groups by subject, each written as
  an epic of its own:
  - a heading as the one of an epic: `###`, a short name of the subject the issues share (a
    component, an area, a kind of work, never their state), the dot, and how many issues;
  - under it two to four sentences: what the issues have in common, what is moving (a pull
    request open), and what would close the group;
  - the table `# | Domain | Details | State` with its issues, in the order the script printed
    them, the details and the domain written as for a part, without the column `Labels`: it
    served the grouping and the domain;
  - a rule after the group, so the next one starts apart;
  - every issue in exactly one group, every group with two issues at least; an issue alone in its
    subject goes to a last group of various things, whose sentences say what is in it;
  - the groups with a pull request open first, then the larger ones; the various things last;
  - the subject from the title and the labels (`prg-*`, `bug`); the body only when they are not
    enough. An issue titled `epic:` without sub-issues is an issue like the others: say in the
    sentences of its group that it has no parts yet.
- **The open pull requests**: the details and the domain of each, as for a part.

Everything else stays as printed: the legends, the counts, the numbers, the icons, the branches,
the tables of the pull requests and of the worktrees, the rules, the next action. Headers,
legends, the names and the sentences in the language of the conversation, the words of the chips
as they are.

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
- **The details and the domain** in each row of the pull requests, as for a part (section 2).
- **The map**, last: run `/v2:work-map` on the same target (the issue or the pull request by its
  number, a branch by its name, a worktree by its folder path) and show what it gives, after a
  rule, under a heading "How it works", in the language of the conversation, as it prints it: the line that
  sums it up, the diagram (its Mermaid block), the legend, then the table. Never the table
  without the diagram: the table is the diagram in words, for whoever cannot see it (left out on
  2026-11-24, and the maintainer asked where the diagram was). Open the page its `--html` writes
  too. It picks done or planned itself: done when there is work, planned from the issue
  otherwise.

Everything else stays as printed: the icon, the branches, the counts, the table of the pull
requests, the rules, the next action. Headers and the words before the colon (State, Epic, Branch,
Worktree) in the language of the conversation, the words of the chips as they are.

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
  branch, or, detached, to the issue its folder name ends with (`app-wt-1427`).
- "ready" means the person can decide, never that you may merge: a merge waits for the person's ok
  naming the pull request (the merge job, [merge.md](merge.md), rule 1).
- A worktree holding work GitHub has not seen (uncommitted files, commits no remote branch holds)
  is work that can be lost or forgotten: say so.
- When a preview of the epic exists (a `<epic>-preview` worktree), `/v2:work test <epic>` rebuilds it
  and shows what it holds.
- The tables say where the work stands, not what it is made of: for that, offer `/v2:work-map` with the
  same epic or pull request in one line at the end.
- After builds or tests run in this conversation, add them as a table `What | Result | Detail`
  (the command, passed or failed with the counts, the names of what failed).
