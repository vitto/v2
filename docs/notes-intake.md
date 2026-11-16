# Reading the notes first

A design interview often follows a call, and the call left notes: written by an agent that listened, by a person, or a document the person attaches. They hold decisions already taken, requests, ideas, open questions and the words people used. Asking all of that again wastes the person's time; trusting it blindly writes a model out of someone's summary. So the notes are read first, turned into items, and every item that reaches the model is confirmed.

`design-interview` runs this before its first question; `design-reframe` runs it against the existing object model. The format of the model is `object-model.md`.

## 1. Extract

Read every attachment the person gives (call notes, a transcript, a brief, a spec) and turn it into items, each with **where it is** (the file, and the heading or line):

- **decision**: something settled, with **who** settled it, by role ("the art director", "the maintainer"), never by name;
- **request**: something someone wants the tool to do or have;
- **idea**: a proposal nobody settled;
- **open question**: something the notes say is undecided;
- **term**: a word of the person's world, or two words for one thing, or one word for two. Terms go to the taxonomy register (`taxonomy.md`), as a row to confirm or a conflict to resolve.

Quote **decisions**, not people: what was decided, not who said what at which moment, and no names, contacts or personal details. An item is a line, not a paragraph.

Notes longer than a few pages are extracted by a subagent on a cheaper model (`route` weighs it: extracting is light work), which returns only the items; the pages never enter the conversation.

## 2. Show the count, then ask

Before the first question, one line: "From the notes (2 files): 6 decisions, 4 requests, 3 ideas, 5 open questions, 7 terms." Then the items that answer a question of the interview are drafted into it, and only what is missing is asked.

## 3. The fourth mark

The object model marks each answer as from **the person**, from **the project** (which file) or **proposed**. Notes add a fourth: **from the notes (file, place)**. It weighs less than the person: a note is someone's summary of a conversation, and it may be wrong, stale or out of context. So every answer marked from the notes is shown to the person and confirmed; once confirmed, it becomes **the person**. A model with unconfirmed note answers is a draft.

When the notes and the person disagree, the person wins, and the item is reported as contradicted.

## 4. Against an existing model (reframe)

`design-reframe` places every item against the model it reads: which entity, field, state, action or view it touches, or none. A decision that changes the model is a request to reframe, and it goes through the same steps (place it, ask only what is new, show the change). A decision the model already holds is covered.

## 5. The coverage report

At the end, before the model is written, every item lands in one of three places:

| Item | Where it landed |
| --- | --- |
| **covered** | the section of the model that holds it (4. Entities, Furniture kind) |
| **contradicted** | by which answer of the person, quoted |
| **not addressed** | moved to the model's Open questions, or to the project's backlog |

Nothing is dropped silently: an item not addressed is still written somewhere a later session will read.
