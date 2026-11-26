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
3. For "Scheda titolo" it does not accept a box with the queue inside each copy's row, nor the
   reader's data edited in that view: it calls the view rebuilt, or patched only with the queue at
   the level of the title, and it says where the reader's data goes instead (the Scheda lettore,
   a side panel or a dialog).
4. It does not add reservations to the "Report mensile", whose model allows only the fields of the
   council's form.
5. It ends by asking the person to confirm before the model file is changed.

FAIL if any of the five points does not hold.
