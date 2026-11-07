---
name: test
description: 'Show the work so a person can test it - for an epic, a local preview with its open parts merged together (never pushed); for a branch or a pull request, its worktree - then install, build and serve it with the commands of the project and list the pages to open as a table (Title, What to test, URL) written from the commits and the diff. Use when asked to see, try or test the work of a branch, a pull request or an epic; in Italian "testa", "fammi vedere", "fammelo provare".'
argument-hint: "[epic or pull request number]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/preview.ts *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/pages.ts), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/pages.ts *)
---

# Show the work, and the pages to test

What to show: $ARGUMENTS. The rules are `${CLAUDE_PLUGIN_ROOT}/GOVERNANCE.md`; rule 5: the
preview is local, rebuilt on every run, never pushed. Each script says in its header where each
answer comes from. How this project installs, builds, serves and maps its pages comes from its
`.claude/v2.json` (the README of the plugin); without it, say what is missing and ask for the
commands instead of guessing them.

Before each step, say in one line what it does. Show what the scripts print as tables, as they are.

## 1. Where the work is

- **An epic** (an issue with sub-issues): its preview, step 2.
- **A pull request or a branch**: the worktree that has its branch checked out
  (`node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts` lists the worktrees). With none, ask before
  creating one (`git worktree add`), never switch the branch of a worktree the person uses.
- **Nothing given**: the current folder, its branch against the default branch.

The work of each part must be committed on its own branch, in its worktree: a preview takes
commits only, and its table flags what stays uncommitted. Never commit for the person without
asking.

## 2. The preview of an epic

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/preview.ts <epic number>
```

Show its table. It stops without touching anything when the preview folder holds work of its own:
say what it found and ask the person; never discard it yourself. Never commit in the preview and
never push it.

## 3. Install, build, serve

In the folder of the preview (or of the worktree), run what the **Next** lines of the preview
say, which come from `.claude/v2.json`: the install the first time, the build, then each server on
the port the configuration gives it, which is not the one of the person's own checkout. Start a
server as a dev server (in the desktop app, the preview tool), and never stop a server the person
started.

## 4. The pages

In the same folder:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/pages.ts
```

`--base=<ref>` and `--head=<ref>` change the range (by default: since the branch left the default
branch of origin); `--<server>=<url>` changes the address of a server.

Then show the person a table `Title | What to test | URL`, one row per page or group of pages.
Write "What to test" as concrete checks taken from the commits and the diff: the state or the
story to open, the interaction, the width (a phone, a narrow container), light and dark, the
keyboard. Keep every address exactly as the script printed it, never one written by hand; add a
column when it helps (what to expect). The rows under "no page in the browser" are checked by the
project's tests: run them and report `What | Result | Detail`.

When a server does not answer, start it (step 3) and run the pages again.
