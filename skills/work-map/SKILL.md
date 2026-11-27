---
name: work-map
description: 'The map of a piece of work, before it (planned) or after it (done): a line that sums it up, then a Mermaid diagram of what the work is made of - entities, methods, concepts, axes, what people see - grouped by where each thing lives, colored and shaped by kind, marked new, changed or removed, red where it breaks, then the same in words. After the work, compared with its plan: what was not done, what was not planned. In glossary mode, the hierarchy of the project''s taxonomy register instead - contains, is a, refers to - every edge with its source, dashed where it has none, red where the data contradicts it. Use to see what a plan, an issue, an epic, a branch, a worktree or a pull request touches, before starting or once done, or to see and check the hierarchy of a glossary; in Italian "mappa", "mappa della lavorazione", "diagramma", "schema", "fammi vedere cosa cambia", "cosa stiamo per fare", "cosa abbiamo fatto", "mappa del glossario", "gerarchia dei concetti".'
argument-hint: "[planned | done | glossary] [issue, pull request, epic, branch, worktree or glossary]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/map.ts *)
---

# The map of the work

What to map: $ARGUMENTS. The answer is what `${CLAUDE_PLUGIN_ROOT}/scripts/map.ts` prints, as it
is: a line that sums the work up, the diagram, its legend, then the same in words (a table, for
whoever cannot see the diagram). The script draws; you write the facts, as JSON, in the format its
header gives.

Where the answer starts: put a horizontal rule (`---` on a line of its own, with an empty line
before and after it, or Markdown reads the line above as a heading) right above what this skill
answers - its report, tables, map or questions - so the person sees where it starts. The
one-line notes before each step stay above it.

Before each step, say in one line what it does.

## 1. Planned or done

- **planned**: the work is still to do. The facts come from the plan of this conversation, the
  issue (`gh issue view <n> --json title,body`), or the parts of an epic
  (`node ${CLAUDE_PLUGIN_ROOT}/scripts/status.ts <epic>` lists them).
- **done**: the work exists. The facts come from its diff: a pull request (`gh pr view <n> --json
  title,body,baseRefName,headRefName,closingIssuesReferences`, then `gh pr diff <n>`), a branch
  (`git diff --stat <base>...<branch>`, then the diff), a worktree (its folder: `git -C <folder>
  log --oneline origin/<default branch>..HEAD`, then `git -C <folder> diff origin/<default
  branch>...HEAD` and what is uncommitted, `git -C <folder> diff HEAD`), or the current folder (its
  commits since the default branch, and what is uncommitted). `/v2:work` runs this skill
  under the report of one piece of work, on the same target.
- **glossary**: the hierarchy of the project's taxonomy register, not a piece of work: see
  "Glossary mode" below; steps 2 to 4 do not apply to it.
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
node ${CLAUDE_PLUGIN_ROOT}/scripts/map.ts <map.json> [--plan=<plan.md or plan.json>] --svg=<map.svg> --html=<map.html>
```

Show what it prints, as it is: the line that sums it up, the diagram (its Mermaid block), the
legend and the table. Never the table alone: it is the diagram in words, for whoever cannot see
it. Then two lines at most on what to look at first: a breaking change, something not done or not
planned. When it refuses the map (an unknown kind, an edge to a missing node), fix the JSON and
run it again; never write the diagram by hand.

GitHub draws the Mermaid block; a terminal or a chat may only show its source. So the script also
draws it, with the Chrome of the computer and Mermaid from jsDelivr: the SVG of `--svg`, and the
page of `--html`, which holds the same drawing and so shows it where no script runs. Give the
person the SVG (attach it to the answer when the client can, else its path) and open the page: in
the browser of the session when it has one, else `open <map.html>` (macOS) or `xdg-open
<map.html>` (Linux). When the script says the diagram was not drawn (no Chrome, no network), say
why: the page then draws it with its own script where scripts run, and shows its source
elsewhere.

## 4. On GitHub, if the person wants it

A planned map can go into the body of its issue, a done map into the body of its pull request:
reviewers see it, and a later `/v2:work-map done` finds the plan by itself. It changes what others
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

## Glossary mode

The hierarchy of the project's taxonomy register (`${CLAUDE_PLUGIN_ROOT}/docs/taxonomy.md`),
drawn to be checked against the data, not to describe a piece of work.

1. **The register.** Find it in the project's glossary (`GLOSSARY.md` or its equivalent). If there
   is none, or it has no "Contained in" and "Refers to" columns, run `taxonomy` first and come back.
2. **The facts**, as JSON in `$TMPDIR`, with `"mode": "glossary"`:
   - a node per concept: `id` is the register's ID, `label` its name in the person's language,
     `kind` as in step 2 above (a concept that holds data is `entity`, a rule or an idea
     `concept`, a dimension `axis`), `change` left out;
   - a group per **context** (where the concepts meet: the game world, the art direction, the
     lab), two levels at most;
   - an edge per "Contained in", "Is a" and "Refers to" cell: `relation` is `contains`, `is-a` or
     `refers-to`, read as a sentence: `contains` from the parent to the child, `is-a` from the kind
     to the concept it is a kind of, `refers-to` from the one that refers; `source` is the data
     field or the code the register names. No source: leave it out, the edge is drawn dashed.
   - **Check every edge against the data** before drawing: open the source and look for a real
     instance that breaks it (a child under two parents, one that outlives its parent, a field
     that points elsewhere). When the data says otherwise, write what it says in `contradicted`:
     the edge is drawn red. Never drop an edge to make the map clean.
3. **Split by context before zooming.** Up to about 20 concepts, one map. Beyond that, an
   overview (a node per context, `kind` `concept`, its edges the relations that cross contexts,
   each with the source of one edge it stands for) plus one map per context. Never shrink a
   large map to fit.
4. **Draw it** beside the glossary, in a file of its own (`GLOSSARY.map.md`; with contexts,
   `GLOSSARY.map.md` for the overview and `GLOSSARY.map.<context>.md` for each):

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/map.ts <glossary.json> --into=GLOSSARY.map.md --html=<map.html> --mmd=<context.mmd>
   ```

   `--into` replaces the map the file holds, so running it again updates it. The colors, shapes
   and spacing are the script's, the same as every other map; never write the diagram by hand.
5. **An SVG when a context is still large**, drawn from the same Mermaid source the script wrote
   with `--mmd`, never edited by hand (it is regenerated, so an edit is lost):

   ```bash
   npx -y @mermaid-js/mermaid-cli@11.4.2 -i <context.mmd> -o GLOSSARY.map.<context>.svg
   ```

   The first run downloads the tool and a headless browser: say so before running it. Link the
   SVG from the context's Markdown file.
6. **Show** what the script printed and open the page, as in step 3 above. Then name the faults
   first: every red edge (what the data says), every dashed one (no source), every concept with
   two parents or none. Each is a question for `taxonomy` (step 4, repairing the hierarchy), and
   the person decides the fix; the map only shows it.
