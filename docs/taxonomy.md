# The taxonomy register

The words of a project as decisions: one row per concept, keyed by an ID that never changes, with a name per language, what the concept is and is not, where it sits in the hierarchy, and what names it in the code and the data. `taxonomy` writes and repairs it, `map glossary` draws it, `design-interview` and `design-reframe` feed it the terms they find, and the object model's vocabulary (`object-model.md`, section 3) uses its names.

Why it exists: an interface, its docs, its data and its code are written by different people at different times. Without a register each of them names things its own way, the same word ends up meaning two things in the same view, and nobody can tell which. Written down, a rename is one row and a list of places, not an archaeology.

## Where it lives

In the project's own glossary (`GLOSSARY.md` or its equivalent), as a section of its own ("Taxonomy register"), versioned. Never only in a conversation, and never in a second file beside it: the table is the one source. A JSON of the register exists only when it is generated from the table.

## The ID

English, kebab-case, and it **never changes**:

- **rename**: the names change, the ID stays;
- **split**: two new IDs are born; the old row stays, its "What it is" says "split into `a` and `b`", and nothing else points to it;
- **merge**: one ID stays, the other row says "merged into `a`".

The names per language are free of each other: `art-direction-layer` is "layer" in English and "strato" in Italian, chosen so it never meets "livello".

## Format

| Column | Holds |
| --- | --- |
| **ID** | the stable ID, in backticks |
| **EN**, **IT**, ... | the name in each language the interface or the docs use, one column per language; a qualified long form in parentheses where it is needed ("zona (zona di livello)") |
| **What it is** | one line, in terms of the person's world |
| **What it is not** | the concept it is most often mistaken for, by ID or name |
| **Contained in** | its parent, with the source in the data or the code: `zone (data/zones members)`; empty for a root |
| **Is a** | the concept it is a kind of, with its source; optional, only where the project has kinds of kinds |
| **Refers to** | what it points to without being contained, with the source |
| **In the code** | the identifiers in code and data; an identifier that differs from the names is an **alias**, with its reason: `elements[].pool (alias: read by mods)` |

An edge (a parent, a kind, a reference) without a source is written `room (proposed)`: it is a question, not a fact.

## Conflicts and the five moves

A conflict is two meanings meeting in one place (a view, a doc, a data file) under one name, checked language by language on the names, not on the IDs. The moves, lightest first: **declared homonym** (the contexts never meet), **qualify** (the long form where they meet), **rename**, **alias** (the code cannot be touched; the reason is written), **split**. The first question is whether the code can be touched; when it can, a rename beats an alias. The count of words a person must learn goes down. The system proposes, the person decides. The reasoning is in `../skills/taxonomy/SKILL.md`.

## The hierarchy

Three relations, each tested on a real instance from the data:

- **contains**: the child cannot exist without the parent, has one parent, and vanishes with it (a zone contains its rooms);
- **is a**: every child is also one of the parent (a level is a zone nobody contains);
- **refers to**: the child points to the other and outlives it (a room's element refers to a furniture kind).

`map glossary` draws them, an overview of the contexts and one diagram per context, with every edge's source; an edge with no source is dashed, one the data contradicts is red.

## Worked example

The Space Mess Asset Lab (`unloop`, `GLOSSARY.md`, section "Taxonomy register"; its object model in `docs/art/asset-lab-model.md`). Two conflicts it settled:

- **"livello"**: the game's `level` and the art direction's `layer` were both "livello" in Italian, and the Asset Lab shows both. Move: rename, in Italian only: `art-direction-layer` became "strato"; the ID and the English stayed.
- **"zona"**: a zone of a level and a zone style of the art direction met in the same views. Move: qualify: "zona di livello" and "stile di zona" where they meet, "zona" elsewhere.

And one alias kept on purpose: the furniture kind is `elements[].pool` in the room data, read by mods, so the code stays and the register says why.

```markdown
| ID | EN | IT | What it is | What it is not | Contained in | Refers to | In the code |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `zone` | zone (level zone where it meets a style) | zona (zona di livello) | a set of rooms and zones of a level | a zone style; a room | zone (data/zones members) | | `data/zones` `zone_types` |
| `room` | room | stanza | one room of a zone, which asks for furniture kinds | a zone | zone (data/zones members) | furniture-kind (data/rooms elements[].pool) | `data/rooms` `room_types` |
| `furniture-kind` | furniture kind | tipo di arredo | the tag a room's element asks for, filled by its variants | one model | | | `elements[].pool` (alias: read by mods) |
```
