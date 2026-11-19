# How the questions reach the person

`design-interview` asks, before its first topic, how the person wants to answer (`SKILL.md`, step 2); `design-reframe` asks the same when its new questions do not fit one dialog. Five formats, each for a situation. The way of asking is the same in all of them (`SKILL.md`, step 3): open questions about the real work, nothing leading, the proposals marked with their source and none marked recommended.

| Format | Fits when | The answers come back |
|--------|-----------|-----------------------|
| Questionnaire in chat | the person answers alone, now | at once, topic by topic |
| Markdown | the person answers alone, when they want, or gathers material first | when they say the file is answered |
| Google Doc | the questions are discussed in a call with the team | after the call |
| Google Sheet | several people answer the same questions | when the person says they answered |
| Google Form | the respondents are outside the team, or many | from the Sheet the Form's answers land in |

## Choosing

Recommend one from what you read: who answers (the person alone, a team, people outside it), when (now, later, in a call), and how many questions are left once the drafts are in. With nothing that says otherwise, the questionnaire in chat.

Ask it as one question in the host's question dialog: the recommended format first, marked so, with why in a few words; then the three that fit next, each with when it fits. The fifth is named in the question, so «Other» reaches it. Without a dialog, the five in one line each, the recommended one first.

The person can change format at any topic: the answers so far stay.

A Google format needs a Google Drive connector in the host. Without one, say so and offer the nearest that works: the Markdown file, or a CSV the person imports into a Sheet. Make the file and give its link; sharing it, or sending the Form, is the person's.

## Questionnaire in chat

The host's question dialog, asked as `SKILL.md` step 3 says. In Claude Code, `AskUserQuestion`: up to four questions, two to four options each, a header of up to twelve characters (the topic, or what the question is about), and the free «Other» with a field for notes. A label is a few words; what it means and where it comes from go in its description.

## The files

Markdown, Doc, Sheet and Form share these rules:

- **What a file holds**: the topics that need no earlier answer: the goal, the people, the metaphor, and the parts of `questions.md` kept for the context. The entities and the views start from the words the answers bring, so they come in a later round; the design system is asked of its tools, and its conflicts of the person, after that.
- **The proposals**: every question that has one shows it beside it, with its source in the marks of `../../docs/object-model.md`, to confirm or correct. A question with none is left open.
- **In the language of the interview**, in natural words, as in the chat.
- **Then stop**: the interview resumes when the person says the answers are in, in this session or a later one, which finds the file in step 1.
- **No follow-up in a file**: the answers that open a new question (a word you did not expect, a "usually", an "except when") make the next round, in the format the person picks then.

### Markdown

`<area>.interview.md`, where the project keeps its design docs, beside where the model will go. A heading per topic; under it, per question: the question, the proposal with its source, and an empty `Answer:` line.

### Google Doc

The same layout as the Markdown file, made through the Drive connector, for a call with the team: the proposals stand under their questions so the call can comment on them beside the text. Read it back with its comments, when the connector reads them. What a call writes in it is a summary of a conversation: the Doc is read as call notes are (`../../docs/notes-intake.md`), its answers marked from the notes until the person confirms them.

### Google Sheet

One row per question: `Topic`, `Question`, `Proposal`, `Source`; then one column per respondent, headed by their role, never by their name. Ask the person who will answer, by role, to name the columns. The person sends the link and says when they answered; read the Sheet back column by column.

### Google Form

A Drive connector makes Docs and Sheets, not a Form with its questions. Two ways, and say plainly which one it is:

- **A Forms connector**, when the host has one: make the Form with it, its answers sent to a Sheet.
- **Otherwise**, make the Sheet of the questions (the four columns above, without respondents), then give the person the script below to run once in it: Extensions › Apps Script, paste, save, run `buildForm`, allow access. The log prints the link to send. The Form's answers land in a new tab of the same Sheet, one row per respondent; read that tab back.

Never say the Form exists before the connector returned it or the person ran the script.

The Form asks the respondent's role first, never their name, and does not collect emails. Each question is answered in free text, with the proposal beside it as what is thought today, to confirm or correct; its source stays in the Sheet. Before giving the script, write its three strings in the language of the interview, and `TOPIC` as the first header of the questions tab. In a Google Workspace domain a new Form may accept only people of the domain: for respondents outside it, tell the person to open it to anyone in the Form's settings.

```js
// Builds a Google Form from the questions of this Sheet and sends its answers to a new tab.
// Run once: Extensions > Apps Script, paste, save, run buildForm, allow access.
const TOPIC = 'Topic'; // the first header of the tab with the questions
const ROLE = 'Your role (not your name)';
const PROPOSAL = 'What we think today: {}. Confirm it, or tell us how it is.';

function buildForm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets().find((s) => s.getRange(1, 1).getValue() === TOPIC);
  if (!sheet) throw new Error(`No tab whose first header is "${TOPIC}"`);
  const form = FormApp.create(ss.getName());
  form.setCollectEmail(false);
  form.addTextItem().setTitle(ROLE).setRequired(true);
  let topic = '';
  for (const [t, question, proposal] of sheet.getDataRange().getValues().slice(1)) {
    if (!question) continue;
    if (t && t !== topic) {
      form.addPageBreakItem().setTitle(t);
      topic = t;
    }
    const item = form.addParagraphTextItem().setTitle(question);
    if (proposal) item.setHelpText(PROPOSAL.replace('{}', () => proposal));
  }
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  Logger.log(`Send: ${form.getPublishedUrl()}`);
  Logger.log(`Edit: ${form.getEditUrl()}`);
}
```

## Reading the answers back

- **The count first**, as for notes: "From the Sheet: 3 respondents (editor, art director, developer), 72 answers, 9 left empty."
- **The marks**: an answer is the person's when they wrote it. Someone else's is marked as that respondent's, by role, never by name, and is an assumption until the person confirms it, as `object-model.md` says of roles; about the respondent's own work, it is also what confirms what the person assumed of that role.
- **Respondents who disagree**: both answers are shown, and the person decides; neither wins silently.
- **An empty answer** is asked again in the next round, or goes to the model's Open questions with whom to ask.
- **Then the next round**: the follow-ups, then the entities and the views, in the format the person picks.
