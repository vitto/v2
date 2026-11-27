---
name: design-interview
description: 'Before a new view, page, section, tool or editor, interview the person and write the object model its screens come from. Use when the area has no object model yet; in Italian "intervista", "modello degli oggetti", "come strutturo questa pagina", "da dove parto con la UI".'
---

# Interview, then the object model

The screens come from the work of the person, not from the software underneath. Before building, find out that work and write it down as an object model, in the format of `../../docs/object-model.md` (from this skill's folder). Arguments, if any: $ARGUMENTS.

Where the answer starts: put a horizontal rule (`---` on a line of its own, with an empty line
before and after it, or Markdown reads the line above as a heading) right above what this skill
answers - its report, tables, map or questions - so the person sees where it starts. The
one-line notes before each step stay above it.

The arguments may name the area and the language of the interview (`italiano`, `english`, or any other). Without a language, ask in the one the person writes in. The questions of `questions.md` are written in English: ask them in the language of the interview, in natural words, never word by word.

## When

- A new page, section, tool or editor; an area with no object model yet.
- Not for a change inside a view the model already covers: that is `design-build`. A change that adds an entity, a field, a state or an action is `design-reframe`.

## 1. Start from what is known

If the person attached notes (of a call, written by an agent or by them) or documents, read them first, as `../../docs/notes-intake.md` says: extract the decisions, requests, ideas, open questions and terms, and show their count before the first question.

Read the conversation, the project's docs and glossary, its data, the code of the area, and what people already said about it (support messages, reviews, earlier research). An interview of the area already sent out as a file (step 2) is read too: its answers are part of what is known. Draft an answer to every question you can, and mark each as from the person, from the project (which file), from the notes (file, place) or proposed. Ask only what is missing; show the proposals and the answers from the notes to confirm instead of asking them again.

The words come from the project's taxonomy register (`../../docs/taxonomy.md`). If there is none, or the interview finds a word with two meanings or a thing with two words, it goes to `taxonomy`: the model uses the register's names.

Then choose the parts of `questions.md` (this skill's folder) the project needs: the context a design must fit, for UX, UI and visual design, in thirteen parts, each with when it can be skipped as a whole. What you read already decides most of them (no pictures, no forms, a single screen, nobody but the person deciding).

## 2. Open, then choose the format

Open with one line: the area, what the interview is for (the model its views will come from), the topics below, and the parts of `questions.md` you skip, each with why in a few words, so the person knows where it goes and can bring a part back.

Then, before the first topic, ask how they want to answer. Recommend the format that fits what you read (who answers, when, how many questions are left after the drafts); the person chooses. When the request already names one ("fammi un form"), it is not asked.

| Format | Fits when |
|--------|-----------|
| **Questionnaire in chat** | the person answers alone, now: the host's question dialog (step 3) |
| **Markdown** | the person answers alone, when they want: a file in the project's design docs with the questions and the drafted proposals, read back once answered |
| **Google Doc** | the questions are discussed in a call with the team, with comments beside the proposals |
| **Google Sheet** | several people answer the same questions: one row per question (topic, question, proposal, its source), one column per respondent, read back |
| **Google Form** | the respondents are outside the team, or many: a Sheet of the questions and an Apps Script the person runs once to build the Form, whose answers land in a Sheet read back; or a Forms connector, if the host has one |

How each is made, asked and read back is in `formats.md` (this skill's folder). A file holds the topics that need no earlier answer (the goal, the people, the metaphor, the context); the entities and the views start from the words its answers bring, so they come in a later round.

Answers read back from a file are marked as the person's, or, when someone else answered, as that respondent's, by role, never by name. A respondent's answer is an assumption until the person confirms it, as `object-model.md` says of roles.

## 3. Ask, in this order

One topic at a time, a few questions at a time. The interview may be long: the quality of the model is the point, and the person prefers a slow, precise start to a fast one that ends in a flow nobody can follow.

The topics are a guide, not a script. How to ask:

- **Open questions** for what you do not know: what, how, when, "tell me about the last time". Yes or no, or a choice of options, only to confirm a proposal.
- **The real work**: the last item they made, the last time it went wrong, not what they do in general or might want one day. When the work exists today, ask to see one real example of it (the file, the sheet, the message it ends in) and read it as data.
- **Their answer first** for what only they know (the goal, what they judge, the words of their world): there an inferred proposal waits for their answer. What the project or the notes say is still shown to confirm.
- **Follow what they say**: a word you did not expect, a "usually" or an "except when", a step they skipped is the next question. An answer that belongs to a later topic is recorded there; then back to the order.
- **Restate** what you understood of a topic, in a line or two and in their words, before the questions of the next one, for them to correct.
- **The solution last**: a sketch, a screen or a feature the person brings is read with the rest, but talked about after the goal and the people; put first, it narrows the talk to itself.

In the question dialog of the chat format (in Claude Code, `AskUserQuestion`: up to four questions, two to four options each, plus the free «Other» and a field for notes):

- **One topic per dialog**: a topic with more than four questions takes another dialog; a dialog never holds two topics.
- **The options are the proposals**, drafted from the project, the notes or inference, each with its source in its description, in the four marks of `object-model.md`. None is marked recommended: the goal and the words are the person's.
- **An open question goes in the dialog too**: it asks for the story in «Other», and its options are plausible answers drawn from what you read or, with nothing read, kinds of answer that hold none of their own (it went smoothly, it got stuck, it has not happened yet).
- **Not theirs to say**: every question has an option that leaves it to someone else ("to check with the team"); the question then goes to the model's Open questions, with the proposal on the table and whom to ask, by role.
- **The restatement** of the topic before goes in the message right before the next dialog.

Without a question dialog, the questions go numbered in a message, one topic per message.

1. **Goal**: what exists at the end when this works? What is done, for one item and for the whole? What will people do differently once it works, and why now: what is there today, and what changed so it no longer serves? When the request is a list of features, ask what it is for before going through it. Then what the part Goal and success of `questions.md` adds.
2. **People**: who works here, by role, what do they bring, what do they decide and judge? For each, the path to the end of the work, step by step as it went the last time, and where it slowed or went wrong; what they want out of it, as a need rather than a feature, and how they want to feel doing it (sure, quick, in control). Does the person do this work, or speak for those who do? What they say of a role they do not hold is an assumption until someone in that role confirms it. Then what the part People and their world adds.
3. **Metaphor**: which world do they think in, with which words? Take them from the project (its glossary, its data), never from the software. And what do they use for this work today (a sheet, folders of files, another tool)? What they already know how to do there is what they will expect here: ask what they would keep and what they would leave behind.
4. **Context**: the other parts of `questions.md` you kept, one part at a time, in their order. An answer about an entity or a view is recorded there; the rest goes to the model's Context section.
5. **Entities**: the things of that world, which contains which, which relate. List the things they named so far, in their words, and ask them to group them as they see them, name each group and say why; propose a hierarchy only after. A thing they hesitate over, or put in two groups, is an open question, or a word for `taxonomy`.
6. **Each entity**: its purpose at its own level; what it holds that belongs to that level only, and where each piece ends up (a prompt, a file, a record); its children and how they appear; its actions; its states and what complete means; what must always be visible about it.
7. **Each view**: its focal entity and the goal of the work done there; the entities around it, and for each how much is shown and editable there (inline, in a side panel or a menu without leaving, or on its own page); what never appears there; where the person comes from and goes next, on the paths of People.
8. **The machinery**: the software steps, the models, the queues, and which entity and state each one moves. It stays under the views, shown as state.
9. **The design system, last**: for each view, ask the project's design system which patterns and building blocks realize it and which domains of its design language decide its composition, through its tools for agents (a search of its patterns with the view's need in words, then its guide for each domain). First find the design system in the project and make sure its tools are loaded in this session, as `../../docs/design-system.md`, from this skill's folder, says (steps 1 and 2). When they are not, stop before recording any id: say what is missing and how to enable it, and ask whether to enable it or go on with the guides only, never silently. Record them by id. Then hold the model against them: every rule of the model that the design system contradicts, forbids or lacks is a conflict, written in the format of the model's Conflicts section, with a proposed resolution. Ask the person to decide each one; never settle it silently.

## 4. Write the model

Write it in the project, where it keeps its design docs (ask once if unclear), in the format of `../../docs/object-model.md`. Show it, take the corrections, and record what is still undecided under Open questions. When there were notes, show their coverage report (`../../docs/notes-intake.md`, step 5) with it: every item covered, contradicted or moved to Open questions or the backlog. Then build with `design-build`.

## Don't

- Don't design screens or name components during the interview: the model first, then the patterns and blocks of the design system that realize it, the components last (`design-build`).
- Don't ask what the conversation or the project already answers: propose it.
- Don't lead: no question that holds its answer ("would a board with columns work here?"), none that starts from a problem ("what bothers you about the export?"). Ask how it goes; the problems come out in their words.
- Don't write an answer from the notes, or a respondent's, as the person's until they confirm it; don't quote people, quote decisions.
- Don't say a Doc, a Sheet or a Form exists until the tool that made it returned it: a Drive connector makes Docs and Sheets, not a Form with its questions. Sharing a file or sending a Form is the person's.
- Don't let the software's words (job, task, queue, record) name the person's things.
