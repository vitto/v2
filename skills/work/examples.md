---
group: workflow
order: 2
---

## Know where the work stands and what comes next

Changes: nothing; it only reads.
Say: "stato", "a che punto siamo"

| You type | When | You get |
| --- | --- | --- |
| `/v2:work 1320` | an epic is open | its parts in the order they land, the open pull requests with their checks, the next action |
| `/v2:work` | in a new conversation | the repository: open epics, issues by subject, pull requests, local worktrees |
| `/v2:work 72` | one pull request, issue or branch | what it does in plain words, its state, its map |
| "a che punto siamo?" | in the middle of the work | a question first: the epic of this work, or the whole repository |

## Try the work in the browser

Changes: only the local preview, never pushed.
Say: "testa", "fammelo provare"

| You type | When | You get |
| --- | --- | --- |
| `/v2:work test 1320` | an epic has open parts | a local preview with every open part merged, built and served, then the pages to open |
| `/v2:work test 72` | one pull request | its worktree (asked first), built and served, then its pages |
| "fammelo provare" | in the folder of a branch | the work it shows named first, then the current folder against the default branch |

## Merge a pull request you approved

Changes: the merge, only on your words naming the pull request.
Say: "ok #N", "mergiala"

| You type | When | You get |
| --- | --- | --- |
| "ok #72" | its checks are green and you decided | everything checked again (checks, conflicts, reviews, the epic behind, a release running), then the merge |
| `/v2:work merge 72` | the same, by command | the same |
| "mergiala" | no number given | a question: which pull request; never one taken from the conversation |
