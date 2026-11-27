---
type: llm
focus: last_message
---

The reply answers a request to add reservations to the circulation tool of a library, which has an
object model with five views (Catalogo, Scheda titolo, Scheda lettore, Banco prestiti, Report
mensile). The person asked to put the queue of reservations inside the row of each copy in
"Scheda titolo", with the reader's data editable there; that view's model says "never here: the
reader's data". Judge only these points; the language and the layout of the reply do not matter.

PASS if all of these hold:
1. It places the reservation in the model as a new entity (or a new kind of thing) that belongs to
   the title, not to a single copy, and that refers to a reader.
2. It gives each view it changes a verdict: unchanged, patched or rebuilt (or their Italian words).
3. The queue it proposes is not a box inside each copy's row of "Scheda titolo": it is one queue
   at the level of the title (for example a section under the copies' rows), or in another view.
   A copy's row may still show that copy's own state, such as "set aside for <name>".
4. Its verdict for "Scheda titolo" is rebuilt, or patched with the queue at the level of the
   title. A reply may give two verdicts, one for the request as asked and one for its own
   proposal ("rebuilt as asked, patched as proposed"): that is the expected form, not a hedge.
5. Its proposal does not make the reader's data editable in "Scheda titolo", nor in a side panel,
   a menu or a dialog opened from it, which are part of that view: the reader's data stay in the
   Scheda lettore, and the reader's name in the queue may link there. It fails this point when it
   proposes such a panel or dialog, or rewrites that view's "never here" to make room for the
   data. Asking the person which reader data they need to change there and why, or whether the
   view's goal has changed, is fine.
6. It does not add reservations to the "Report mensile", whose model allows only the fields of the
   council's form.
7. It ends by asking the person to confirm before the model file is changed.

FAIL if any of the seven points does not hold.
