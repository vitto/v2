# The object model

What the screens of a tool are derived from: the work the person does, in the words of their world, not the software underneath. `design-interview` writes it, `design-build` builds from it, `design-reframe` changes it before the screens change, `design-audit` checks the screens against it.

Why it exists: a UI built from the software (its steps, its queues, its jobs) or grown one request at a time drifts until the person can no longer tell where they are, what they can do there, or what they get at the end. Written down, the model makes rethinking cheap: change the model, see which views move, rebuild those.

## Where it lives

In the project, versioned, where the project keeps its design docs: one file per tool or section, named after it (`asset-lab.object-model.md`, or the project's own doc conventions). Never only in a conversation: the next session starts from the file.

## Format

Plain Markdown with these sections, in this order.

### 1. Goal

What exists at the end when the tool works, in one or two sentences, and what **done** means: for one item, and for the whole. Example: "a catalogue of 3D props the game loads, every room's furniture with two to four variants each, every model traceable to the words it came from."

### 2. People

Who works here, what they bring (sources, words, decisions) and what they judge. What the machine does on its own is not a person's work and goes in section 6.

### 3. Metaphor and vocabulary

The world the person thinks in, and its words, taken from the project's own vocabulary (its glossary, its data): "levels, zones, rooms, objects", not "jobs, tasks, records". The UI uses these words and no others for these things.

### 4. Entities

The things of that world, as a hierarchy (which contains which) and a list of other relations. Then one block per entity:

- **Purpose**: what it is for at its own level, in relation to the goal.
- **Holds**: what belongs to it and to no other level, and where each piece ends up (a prompt, a file, a record the game reads). A zone holds what the zone's prompt needs, never the furniture of its rooms.
- **Children**: which entities it contains, and how they appear on its page (cards, rows).
- **Actions**: what the person can do to it, and which of them are theirs alone to decide.
- **States**: from empty to done, and what each one means; what "complete" is.
- **Always visible**: what the person must see about it at any moment (its state, what is running on it, what is missing).

### 5. Views

One block per view (a page, a panel):

- **Focal entity** and **the goal of the work done here**. One focal entity per view.
- **Around it**: the other entities shown, each with **how much** of it is shown and editable here, decided by the goal of this view:
  - inline, when it is part of this work;
  - in a side panel, a menu or a dialog, when it needs more detail but the person must not leave (and lose what they are typing);
  - on its own page, linked, when the detail is its own work.
- **Never here**: what this view does not show, so that it stays about its goal.
- **Way in and way out**: where the person comes from, and where they go next.

Nesting is the failure this section prevents: an entity that needs its own depth opens beside the view or on its own page, never as a box inside a box inside a box.

### 6. The machinery

The software under the views: the steps, the models, the queues, the services. For each, which entity and which state it moves. It is shown only as that state (a spinner on the object being drawn, "1 waiting" in a corner), never as a page to work in, unless watching it is the person's work.

### 7. Open questions

What the interview left undecided, with the proposal on the table. `design-reframe` comes back here first.

## How the answers are marked

Each answer says where it comes from: **the person** (what they said), **the project** (with the file it was read from) or **proposed** (an inference, to confirm). A model made of proposals is a draft, not a model.
