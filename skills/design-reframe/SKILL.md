---
name: design-reframe
description: When a request adds something to an existing flow or view - a new entity, a field, a state, an action, a step - place it in the object model before touching the UI - ask only the new questions, show how the model changes and which views move, and say for each view whether it is patched or rebuilt. Use when the person asks to add to, extend or change what a page, an editor or a flow does, or when a flow has become hard to follow; in Italian "aggiungi anche", "vorrei che questa parte facesse anche", "ripensiamo il flusso", "reframe", "non capisco più questa vista".
---

# Reframe: the model first, then the views

A flow drifts when each request is bolted onto the screen it lands on: after a few, nobody can tell where they are or what they can reach. So a request that adds to a flow changes the object model first, and the views are patched or rebuilt from it. Request: $ARGUMENTS.

## When

- The request adds or changes an entity, a field, a state, an action or a step; or the person says they no longer follow a view.
- Not for a change of look inside a view (a color, a spacing, a label): that is `design-build` alone.

## 1. Read the model

Read the object model of the area (the format is `../../docs/object-model.md`, from this skill's folder). If there is none, run `design-interview` on the area first: there is nothing to reframe against.

## 2. Place the request

Say in a few lines where it belongs: which entity, at which level; whether it is a new entity, a field, a state, an action or a view; which view's goal it serves. When it serves none, say so: it may be a view of its own, or not belong in this tool.

## 3. Ask only what is new

The questions of `design-interview` for what the request touches, nothing already answered. Propose the answers you can infer, marked as proposed. The entities already defined stay as they are unless the request moves them.

## 4. Show the change

- **The model**: what is added, changed or removed, entity by entity.
- **The views**: for each view it touches, one verdict:
  - **unchanged**;
  - **patched**: it fits the view's goal at the granularity the view sets;
  - **rebuilt**: the focal entity or the hierarchy moved, the view would serve two goals, or the addition would nest a box in a box. Name where the deeper part goes instead (a side panel, a menu, its own page).

When in doubt between a patch and a rebuild, propose the rebuild: coherence is worth more than speed.

- **The design system**: for each view that changes, whether its patterns, blocks and domains still fit, asked again through the design system's tools; and any new conflict between the model and the design system, in the format of the model's Conflicts section, with a proposed resolution. Reread the open conflicts too: the change may settle one or make one worse.

## 5. Then build

On the person's yes, update the model file (with the date and what changed), then build the views with `design-build` and check them with `design-audit`.
