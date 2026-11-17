# The object model

What the screens of a tool are derived from: the work the person does, in the words of their world, not the software underneath. `design-interview` writes it (reading any attached notes first, `notes-intake.md`), `design-build` builds from it, `design-reframe` changes it before the screens change, `design-audit` checks the screens against it.

Why it exists: a UI built from the software (its steps, its queues, its jobs) or grown one request at a time drifts until the person can no longer tell where they are, what they can do there, or what they get at the end. Written down, the model makes rethinking cheap: change the model, see which views move, rebuild those.

## Where it lives

In the project, versioned, where the project keeps its design docs: one file per tool or section, named after it (`asset-lab.object-model.md`, or the project's own doc conventions). Never only in a conversation: the next session starts from the file.

## Format

Plain Markdown with these sections, in this order.

### 1. Goal

What exists at the end when the tool works, in one or two sentences, and what **done** means: for one item, and for the whole. Example: "a catalogue of 3D props the game loads, every room's furniture with two to four variants each, every model traceable to the words it came from."

### 2. People

Who works here, by role, never by name: one entry per role, for everyone who does that work. What each brings (sources, words, decisions), what they judge, and their path to the end of the work: the steps as they go today, in order, and where it slows or goes wrong. What the machine does on its own is not a person's work and goes in section 6.

### 3. Metaphor and vocabulary

The world the person thinks in, and its words, taken from the project's own vocabulary (its glossary, its data): "levels, zones, rooms, objects", not "jobs, tasks, records". The UI uses these words and no others for these things. The words are the names of the project's taxonomy register (`taxonomy.md`), cited by ID; a word the register lacks, or one that means two things, goes to `taxonomy` first.

Beside the words, what the person uses for this work today (a sheet, folders of files, another tool): what they already know how to do there is what they will expect here, with what to keep and what to leave behind.

### 4. Entities

The things of that world, as a hierarchy (which contains which) and a list of other relations. The hierarchy and the names follow how the person grouped and named the things, not how the data is stored. Then one block per entity:

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
- **Way in and way out**: where the person comes from, and where they go next, on the paths of section 2.

Nesting is the failure this section prevents: an entity that needs its own depth opens beside the view or on its own page, never as a box inside a box inside a box.

### 6. The machinery

The software under the views: the steps, the models, the queues, the services. For each, which entity and which state it moves. It is shown only as that state (a spinner on the object being drawn, "1 waiting" in a corner), never as a page to work in, unless watching it is the person's work.

### 7. The design system

The object model says *what* each view is for and *which* entities it holds; the design system says *how* it is built. A design system that works in layers, such as Magma's, has three of them, each read from its own tools (Magma: `get_pattern`, `get_guide`):

- **design language**: the rules of composition every page stands on (Magma: rhythm, density, actions, titles, surfaces, widths);
- **building blocks**: the sections of a page that come back in the same arrangement (Magma: app-shell, page-header, item-list, labels-and-values);
- **patterns**: the solution to a task that spans components and time (Magma: record-detail, list-with-filters, empty-state, loading, confirm-action, message-placement, concurrent-editing...).

For each view, write which patterns and blocks realize it and which domains of the design language decide its composition, by their ids: the page of one focal entity with its related items is a record-detail; its children as a list are an item-list; what the machinery is doing is loading; a side panel that edits a related entity follows the design system's rule for it. Where the design system has nothing for what the view needs, say so: it is a gap, not a license to invent.

### 8. Conflicts

Where the method of this model and the design system disagree, or the model needs what the design system forbids or lacks, the conflict is written down, never settled silently. One entry each:

- **The model says**: the rule of this method or this model (one focal entity per view; deeper detail beside the view, never nested; help under a field always visible).
- **The design system says**: its rule, with where it is (the pattern, block or domain id, the guide and section, the component and its behavior).
- **Effect**: what goes wrong for the person if nothing changes.
- **Resolution, proposed**: one of
  - **the method adapts**: the design system is right, and the model or the method changes;
  - **the design system changes**: an issue on its repository, opened only on the person's yes;
  - **the product decides**: a choice the design system leaves open, fixed in the product's own layer (Magma: `/magma:pattern-layer`), not in the code.

Until a conflict is resolved, the build follows the design system and the entry stays open. A conflict found while building or auditing is added here.

### 9. Open questions

What the interview left undecided, with the proposal on the table. `design-reframe` comes back here first, and to the open conflicts.

## How the answers are marked

Each answer says where it comes from: **the person** (what they said), **the project** (with the file it was read from), **the notes** (the file and the place, from attached call notes or documents: `notes-intake.md`) or **proposed** (an inference, to confirm). An answer from the notes weighs less than the person's and is confirmed before it counts; confirmed, it becomes the person's. A model made of proposals or unconfirmed notes is a draft, not a model.
