# Show the work, and the pages to test

The test job of `/v2:work` ([SKILL.md](SKILL.md), beside this file, holds the rules of every
job). What to show: the target in the arguments after `test`, or in the person's words. The rules
are `${CLAUDE_PLUGIN_ROOT}/GOVERNANCE.md`; rule 5: the
preview is local, rebuilt on every run, never pushed. Each script says in its header where each
answer comes from. How this project installs, builds, serves and maps its pages comes from its
`.claude/v2.json` (the README of the plugin); without it, say what is missing and ask for the
commands instead of guessing them.

Your answer opens under a horizontal rule: `---` on a line of its own, an empty line before and
after it, right above the report, the table or the question ([SKILL.md](SKILL.md), "Every job").

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
