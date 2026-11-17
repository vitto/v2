---
name: design-interview
description: Before building a new view, page, section, tool or editor, interview the person and write the object model its screens are derived from - the final goal, the world and the words they think in, the entities and their hierarchy, and for each view its focal entity, the entities around it and how much of them can be edited there. Notes from a call or attached documents are read first and their items confirmed. Use when a request creates a page, a section, a tool or an editor, or when the area being built has no object model yet; in Italian "intervista", "modello degli oggetti", "come strutturo questa pagina", "prima di costruire la UI", "da dove parto con la UI".
---

# Interview, then the object model

The screens come from the work of the person, not from the software underneath. Before building, find out that work and write it down as an object model, in the format of `../../docs/object-model.md` (from this skill's folder). Arguments, if any: $ARGUMENTS.

## When

- A new page, section, tool or editor; an area with no object model yet.
- Not for a change inside a view the model already covers: that is `design-build`. A change that adds an entity, a field, a state or an action is `design-reframe`.

## 1. Start from what is known

If the person attached notes (of a call, written by an agent or by them) or documents, read them first, as `../../docs/notes-intake.md` says: extract the decisions, requests, ideas, open questions and terms, and show their count before the first question.

Read the conversation, the project's docs and glossary, its data, and the code of the area. Draft an answer to every question you can, and mark each as from the person, from the project (which file), from the notes (file, place) or proposed. Ask only what is missing; show the proposals and the answers from the notes to confirm instead of asking them again.

The words come from the project's taxonomy register (`../../docs/taxonomy.md`). If there is none, or the interview finds a word with two meanings or a thing with two words, it goes to `taxonomy`: the model uses the register's names.

## 2. Ask, in this order

Open with one line: the area, what the interview is for (the model its views will come from) and the topics below, so the person knows where it goes. Then one topic per message, a few questions at a time. The interview may be long: the quality of the model is the point, and the person prefers a slow, precise start to a fast one that ends in a flow nobody can follow.

The topics are a guide, not a script. How to ask:

- **Open questions** for what you do not know: what, how, when, "tell me about the last time". Yes or no, or a choice of options, only to confirm a proposal.
- **The real work**: the last item they made, the last time it went wrong, not what they do in general or might want one day. When the work exists today, ask to see one real example of it (the file, the sheet, the message it ends in) and read it as data.
- **Their answer first** for what only they know (the goal, what they judge, the words of their world): there an inferred proposal waits for their answer. What the project or the notes say is still shown to confirm.
- **Follow what they say**: a word you did not expect, a "usually" or an "except when", a step they skipped is the next question. An answer that belongs to a later topic is recorded there; then back to the order.
- **Restate** what you understood of a topic, in a line or two and in their words, at the top of the next message, for them to correct.

1. **Goal**: what exists at the end when this works? What is done, for one item and for the whole?
2. **People**: who works here, by role, what do they bring, what do they decide and judge? For each, the path to the end of the work, step by step as it went the last time, and where it slowed or went wrong.
3. **Metaphor**: which world do they think in, with which words? Take them from the project (its glossary, its data), never from the software. And what do they use for this work today (a sheet, folders of files, another tool)? What they already know how to do there is what they will expect here: ask what they would keep and what they would leave behind.
4. **Entities**: the things of that world, which contains which, which relate. List the things they named so far, in their words, and ask them to group them as they see them, name each group and say why; propose a hierarchy only after. A thing they hesitate over, or put in two groups, is an open question, or a word for `taxonomy`.
5. **Each entity**: its purpose at its own level; what it holds that belongs to that level only, and where each piece ends up (a prompt, a file, a record); its children and how they appear; its actions; its states and what complete means; what must always be visible about it.
6. **Each view**: its focal entity and the goal of the work done there; the entities around it, and for each how much is shown and editable there (inline, in a side panel or a menu without leaving, or on its own page); what never appears there; where the person comes from and goes next, on the paths of People.
7. **The machinery**: the software steps, the models, the queues, and which entity and state each one moves. It stays under the views, shown as state.
8. **The design system, last**: for each view, ask the project's design system which patterns and building blocks realize it and which domains of its design language decide its composition, through its tools for agents (Magma: `get_pattern` with the view's need in words, then `get_guide` for a domain). Record them by id. Then hold the model against them: every rule of the model that the design system contradicts, forbids or lacks is a conflict, written in the format of the model's Conflicts section, with a proposed resolution. Ask the person to decide each one; never settle it silently.

## 3. Write the model

Write it in the project, where it keeps its design docs (ask once if unclear), in the format of `../../docs/object-model.md`. Show it, take the corrections, and record what is still undecided under Open questions. When there were notes, show their coverage report (`../../docs/notes-intake.md`, step 5) with it: every item covered, contradicted or moved to Open questions or the backlog. Then build with `design-build`.

## Don't

- Don't design screens or name components during the interview: the model first, then the patterns and blocks of the design system that realize it, the components last (`design-build`).
- Don't ask what the conversation or the project already answers: propose it.
- Don't lead: no question that holds its answer ("would a board with columns work here?"), none that starts from a problem ("what bothers you about the export?"). Ask how it goes; the problems come out in their words.
- Don't write an answer from the notes as the person's until they confirm it; don't quote people, quote decisions.
- Don't let the software's words (job, task, queue, record) name the person's things.
