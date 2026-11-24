---
name: taxonomy
description: Keep the words of a project consistent across its interface, docs, data and code - a register of its concepts in the project's glossary, keyed by English IDs that never change, with a name per language, what each concept is and is not, where it is contained, what it refers to, and its identifiers in code and data; find the conflicts (two meanings meeting under one name in one place) and resolve them with the lightest of five moves; repair the hierarchy edge by edge against real instances. Use when a word means two things, two words mean one thing, a new concept or a rename is coming, the glossary is missing or drifting, or before an interview or a map that needs the project's words; in Italian "tassonomia", "glossario", "registro dei termini", "come lo chiamiamo", "due parole per la stessa cosa", "questa parola vuol dire due cose", "rinomina".
argument-hint: "[the area, the word or the conflict]"
---

# Taxonomy: one register, one meaning per name where meanings meet

A person reads a word in a view, a doc or a data file and must know which thing it means. When the same word names two things where both appear, or two words name one thing, the interface, the docs and the code drift apart and each new request makes it worse. The register makes the words of a project a decision, written once, read by everyone. Area or word: $ARGUMENTS.

Where the answer starts: put a horizontal rule (`---` on a line of its own, with an empty line
before and after it, or Markdown reads the line above as a heading) right above what this skill
answers - its report, tables, map or questions - so the person sees where it starts. The
one-line notes before each step stay above it.

The format is `../../docs/taxonomy.md` (from this skill's folder); the worked example is there too.

## When

- A word means two things, two words mean one thing, or the person no longer knows what to call something.
- A new concept, a rename or a split is coming; an interview or a reframe found a term (`design-interview`, `design-reframe` send the terms they collect here).
- The project has no register, or `map glossary` needs one.
- Not for copy (tone, length of a label): that is the design work of the view.

## 1. Read what exists

Read the project's glossary (`GLOSSARY.md` or its equivalent; ask once if there are several), its docs, its data and the code of the area. If there is no register, draft one: a row per concept the area uses, each cell marked as from the person, from the project (which file) or proposed, as in `../../docs/object-model.md`. Show the draft before writing it.

## 2. Find the conflicts

A conflict is **two meanings meeting in the same place** (a view, a doc, a data file) where the reader cannot tell which is meant. Check it on the **names, language by language**, never on the IDs: `level` and `art-direction-layer` have different IDs and still collide if both are "livello" in Italian in a view that shows both. Also a conflict: one concept with two names in one language, where both appear.

For each, say: the name, the language, the two IDs, and the places they meet (a view, a doc, a file, with its path).

## 3. Resolve each with the lightest move that works

First question, always: **can the code be touched?** (Is the identifier private to this project, or read by mods, a public API, saved files, another team?) The answer decides between a rename and an alias.

The five moves, lightest first:

1. **Declared homonym**: the contexts never meet, so one name may stay. Write it in the register so nobody "fixes" it. Example: Magma's `variant` is one concept with a value per component; it is not two concepts.
2. **Qualify**: the long form only where the contexts meet ("zona di livello" beside "stile di zona"), the short form everywhere else.
3. **Rename**: the name changes in every language that collides, in the interface, the docs and, when the code can be touched, the code.
4. **Alias**: the code cannot be touched, so the interface word differs from the identifier. The register links them, with the reason written ("read by mods", "lab code, to rename with the next schema change").
5. **Split**: one name hid two concepts. Two new IDs are born, the old ID stays as a row that points to both, and every use is assigned to one of them.

Rules:

- If the code can be touched, a rename beats an alias.
- The number of words the person must learn goes down, never up: a move that adds a word must remove one.
- Every alias carries its reason in the register.
- The system proposes, the person decides. Never rename, alias or split silently: show the conflict, the move, and what changes where (register, docs, data, code), and wait for the yes.

## 4. Repair the hierarchy

The register's "Contained in", "Is a" and "Refers to" columns are a graph; each edge must be true of the real things. Test each edge on **a real instance**, from the data:

- **Can it exist without the parent?** No: *contains*. Yes: *refers to*.
- **Can it sit under two parents at once?** Yes: not *contains*; it *refers to* one of them, or the hierarchy is wrong.
- **Does it vanish with the parent?** Yes: *contains*.
- **Is every one of them also one of those?** Yes: *is a* (a kind of), not *contains*.

Typical faults, with their fix and where it lands:

| Fault | Fix | Lands in |
| --- | --- | --- |
| Two parents | one *contains*, the other becomes *refers to* | register, then docs |
| Cycle | the edge that fails the instance test becomes *refers to* or goes | register, docs, data |
| Edge with no source | find it in the data or the code, or mark it proposed and ask | register |
| Edge the data contradicts | the data wins unless the person says the data is wrong; then it is a data or code fix | register, or data and code |
| Orphan (no parent, not a root) | find its parent, or declare it a root of its context | register |

Every edge carries its **source**: the data field or the code that makes it true (`data/zones zone_types[].members`). An edge with no source is a proposal until one is found.

## 5. Write the register

In the project's glossary, as the table of `../../docs/taxonomy.md`. On a rename the names change and the ID stays; on a split, two new rows and the old one points to both. Then, only on the person's yes, the docs, the data and the code the moves reach, and a line in the project's decision log if it keeps one.

The table is the one source. A JSON of the register exists only when it is generated from the table, never written beside it.

To see the hierarchy and check it against the data, run `map glossary`.

## Don't

- Don't decide a word for the person: propose, show where it lands, wait.
- Don't compare IDs to find conflicts: compare names, one language at a time.
- Don't add an alias where a rename is possible, or an alias without its reason.
- Don't write a hierarchy edge nobody can trace to the data or the code without marking it proposed.
