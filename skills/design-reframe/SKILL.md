---
name: design-reframe
description: When a request adds something to an existing flow or view - a new entity, a field, a state, an action, a step - place it in the object model before touching the UI - ask only the new questions, show how the model changes and which views move, and say for each view whether it is patched or rebuilt. Notes from a call or attached documents are placed against the model first. Use when the person asks to add to, extend or change what a page, an editor or a flow does, when notes from a call ask for changes to a flow, or when a flow has become hard to follow; in Italian "aggiungi anche", "vorrei che questa parte facesse anche", "ripensiamo il flusso", "reframe", "non capisco più questa vista".
---

# Reframe: the model first, then the views

A flow drifts when each request is bolted onto the screen it lands on: after a few, nobody can tell where they are or what they can reach. So a request that adds to a flow changes the object model first, and the views are patched or rebuilt from it. Request: $ARGUMENTS.

Where the answer starts: put a horizontal rule (`---` on a line of its own, with an empty line
before and after it, or Markdown reads the line above as a heading) right above what this skill
answers - its report, tables, map or questions - so the person sees where it starts. The
one-line notes before each step stay above it.

## When

- The request adds or changes an entity, a field, a state, an action or a step; or the person says they no longer follow a view.
- Not for a change of look inside a view (a color, a spacing, a label): that is `design-build` alone.

## 1. Read the model

Read the object model of the area (the format is `../../docs/object-model.md`, from this skill's folder). If there is none, run `design-interview` on the area first: there is nothing to reframe against.

If the person attached notes or documents, read them as `../../docs/notes-intake.md` says, against this model (its step 4): each item covered by the model, or a request to place in step 2. Show the count first.

## 2. Place the request

Say in a few lines where it belongs: which entity, at which level; whether it is a new entity, a field, a state, an action or a view; which view's goal it serves. When it serves none, say so: it may be a view of its own, or not belong in this tool. When its place is not plain from the model, ask the person where they would put it among the entities, and why, before proposing one.

## 3. Ask only what is new

The questions of `design-interview` for what the request touches, asked as it asks them (its step 3: open, about the real work, nothing leading; in the question dialog, the options are the proposals with their source, none marked recommended, and one leaves the question to someone else), nothing already answered. Propose the answers you can infer, marked as proposed, or from the notes (file, place) to confirm. The entities already defined stay as they are unless the request moves them. A new word, or one that now means two things, goes to `taxonomy` before it reaches the model.

Whatever the request, ask the same two questions every time: is the goal in the model still the goal, and where does the work slow down today? Their answers are kept with the date of the reframe, so a drift shows from one round to the next.

When the new questions, these two with them, fit one dialog, ask them there. When they are more, or others should answer them, first ask the format, as `design-interview` does (its step 2, and `../design-interview/formats.md`); answers read back from a file are marked as it says, a respondent's an assumption until the person confirms it.

## 4. Show the change

- **The model**: what is added, changed or removed, entity by entity.
- **The views**: for each view it touches, one verdict:
  - **unchanged**;
  - **patched**: it fits the view's goal at the granularity the view sets;
  - **rebuilt**: the focal entity or the hierarchy moved, the view would serve two goals, or the addition would nest a box in a box. Name where the deeper part goes instead (a side panel, a menu, its own page).

When in doubt between a patch and a rebuild, propose the rebuild: coherence is worth more than speed.

- **The design system**: for each view that changes, whether its patterns, blocks and domains still fit, asked again through the design system's tools; and any new conflict between the model and the design system, in the format of the model's Conflicts section, with a proposed resolution. Reread the open conflicts too: the change may settle one or make one worse.

## 5. Then build

On the person's yes, update the model file (with the date and what changed); when there were notes, show their coverage report (covered, contradicted, not addressed and where it went). Then build the views with `design-build` and check them with `design-audit`.
