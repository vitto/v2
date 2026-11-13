---
name: map
description: 'The map of a piece of work, before it (planned) or after it (done): a line that sums it up, then a Mermaid diagram of what the work is made of - entities, methods, concepts, axes, what people see - grouped by where each thing lives, colored and shaped by kind, marked new, changed or removed, red where it breaks, then the same in words. After the work, compared with its plan: what was not done, what was not planned. Use to see what a plan, an issue, an epic, a branch or a pull request touches, before starting or once done; in Italian "mappa", "mappa della lavorazione", "diagramma", "schema", "fammi vedere cosa cambia", "cosa stiamo per fare", "cosa abbiamo fatto".'
argument-hint: "[planned | done] [issue, pull request, epic or branch]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/map.ts *)
---

# The map of the work

What to map: $ARGUMENTS. The answer is what `${CLAUDE_PLUGIN_ROOT}/scripts/map.ts` prints, as it
is: a line that sums the work up, the diagram, its legend, then the same in words (a table, for
whoever cannot see the diagram). The script draws; you write the facts, as JSON, in the format its
header gives.

Before each step, say in one line what it does.

## 1. Planned or done

- **planned**: the work is still to do. The facts come from the plan of this conversation, the
  issue (`gh issue view <n> --json title,body`), or the parts of an epic
  (`node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts <epic>` lists them).
- **done**: the work exists. The facts come from its diff: a pull request (`gh pr view <n> --json
  title,body,baseRefName,headRefName,closingIssuesReferences`, then `gh pr diff <n>`), a branch
  (`git diff --stat <base>...<branch>`, then the diff), or the current folder (its commits since
  the default branch, and what is uncommitted).
- Without the word: done when there is work (a diff, a branch ahead), planned otherwise. With
  nothing given: the work of this conversation.
- **The plan of a done map**: the map in the body of the issue the work closes (`gh issue view <n>
  --json body -q .body > plan.md`), else the planned map shown earlier in this conversation. When
  there is one, compare with it (`--plan`), and give the same thing the same id it has there.

## 2. The things

Write the map in a JSON file in the temporary folder of the system (`$TMPDIR`), never in the
project.

- **A node is a thing a reviewer would name**: a type, a function or a command, a rule, a
  dimension, a page. Not every helper, line or test case. About 20 at most; beyond that, one map
  per group, or an epic at the level of its parts.
- **kind**, one per thing, the same in every map so the colors always mean the same:
  - `entity`: holds data or state (a type, a model, a component, a schema, a config, a token);
  - `method`: does something (a function, a command, a script, a skill, an endpoint, a hook);
  - `concept`: an idea or a rule (a principle, a convention, a state, a decision);
  - `axis`: a dimension things vary along (a variant, a size, a theme, a mode, a locale);
  - `surface`: what people see or read (a page, a screen, a message, an output, the docs);
  - `external`: outside the work, shown for context (a library, a service, another package).

  The context names things its own way (a component in a design system, a model in a backend):
  the label says it, the kind stays one of these.
- **change**: `new`, `changed`, `renamed` (with `was`, the old name), `removed`, or `unchanged`
  for the few things a reader needs to place the rest.
- **breaking**: `true` when something that worked stops working unless the other side changes
  too: callers of a removed or renamed export; a changed signature, return or default; a new
  required field, option or argument; a removed flag, key, route or event; a changed format, URL
  or schema; a behavior people rely on that moves (a flow, a shortcut). `"possible"` when it
  depends on users you cannot see. A change nothing outside uses is not breaking.
- **note**: one short line, what changes or who it breaks. Every breaking thing has one.
- **groups**: where things live: a package, a folder, a layer, a part of an epic, a section of
  the product; two levels at most.
- **edges**: the relations that explain the work (runs, reads, calls, replaces), not every
  import; `dashed` for an indirect one or a replacement (`old` to `new`, "replaced by").
- **title** (the work in a few words), **source** (where the facts come from: "the plan of the
  conversation", "issue #12", "the diff of 13-part against main"), **direction** (`LR`, or `TB`
  when many groups hold few things each). Title and notes in the person's language; labels as
  the code names them.

## 3. Draw it

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/map.ts <map.json> [--plan=<plan.md or plan.json>] --html=<map.html>
```

Show what it prints, as it is, then two lines at most on what to look at first: a breaking
change, something not done or not planned. When it refuses the map (an unknown kind, an edge to a
missing node), fix the JSON and run it again; never write the diagram by hand.

GitHub draws the Mermaid block; a terminal shows its source. So open the page `--html` wrote for
the person: in the browser of the session when it has one, else `open <map.html>` (macOS) or
`xdg-open <map.html>` (Linux). It loads Mermaid from jsDelivr; offline it shows the source.

## 4. On GitHub, if the person wants it

A planned map can go into the body of its issue, a done map into the body of its pull request:
reviewers see it, and a later `/v2:map done` finds the plan by itself. It changes what others
read, so ask first, naming the issue or the pull request, and do it only on the person's yes:

```bash
gh issue view <n> --json body -q .body > body.md
node ${CLAUDE_PLUGIN_ROOT}/scripts/map.ts <map.json> --into=body.md
gh issue edit <n> --body-file body.md
```

For a pull request, `gh pr view` and `gh pr edit`. `--into` replaces the map the body holds, or
adds it at the end, and leaves the rest of the body as it is.

The map only describes the work: it never changes code, opens an issue or decides a merge
(`${CLAUDE_PLUGIN_ROOT}/GOVERNANCE.md`, rule 1).
