---
name: design-interview
description: Before building a new view, page, section, tool or editor, interview the person and write the object model its screens are derived from - the final goal, the world and the words they think in, the entities and their hierarchy, and for each view its focal entity, the entities around it and how much of them can be edited there. Use when a request creates a page, a section, a tool or an editor, or when the area being built has no object model yet; in Italian "intervista", "modello degli oggetti", "come strutturo questa pagina", "prima di costruire la UI", "da dove parto con la UI".
---

# Interview, then the object model

The screens come from the work of the person, not from the software underneath. Before building, find out that work and write it down as an object model, in the format of `../../docs/object-model.md` (from this skill's folder). Arguments, if any: $ARGUMENTS.

## When

- A new page, section, tool or editor; an area with no object model yet.
- Not for a change inside a view the model already covers: that is `design-build`. A change that adds an entity, a field, a state or an action is `design-reframe`.

## 1. Start from what is known

Read the conversation, the project's docs and glossary, its data, and the code of the area. Draft an answer to every question you can, and mark each as from the person, from the project (which file) or proposed. Ask only what is missing; show the proposals to confirm instead of asking them again.

## 2. Ask, in this order

One topic per message, a few questions at a time. The interview may be long: the quality of the model is the point, and the person prefers a slow, precise start to a fast one that ends in a flow nobody can follow.

1. **Goal**: what exists at the end when this works? What is done, for one item and for the whole?
2. **People**: who works here, what do they bring, what do they decide and judge?
3. **Metaphor**: which world do they think in, with which words? Take them from the project (its glossary, its data), never from the software.
4. **Entities**: the things of that world, which contains which, which relate.
5. **Each entity**: its purpose at its own level; what it holds that belongs to that level only, and where each piece ends up (a prompt, a file, a record); its children and how they appear; its actions; its states and what complete means; what must always be visible about it.
6. **Each view**: its focal entity and the goal of the work done there; the entities around it, and for each how much is shown and editable there (inline, in a side panel or a menu without leaving, or on its own page); what never appears there; where the person comes from and goes next.
7. **The machinery, last**: the software steps, the models, the queues, and which entity and state each one moves. It stays under the views, shown as state.

## 3. Write the model

Write it in the project, where it keeps its design docs (ask once if unclear), in the format of `../../docs/object-model.md`. Show it, take the corrections, and record what is still undecided under Open questions. Then build with `design-build`.

## Don't

- Don't design screens or name components during the interview: the model first, the design system later.
- Don't ask what the conversation or the project already answers: propose it.
- Don't let the software's words (job, task, queue, record) name the person's things.
