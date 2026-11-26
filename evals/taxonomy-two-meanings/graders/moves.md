---
type: llm
focus: last_message
---

The reply is a review of the words of a small library project, whose interface is in Italian and
English. In the register, the Italian name "copia" belongs to two IDs, `copy` (a physical item a
reader borrows) and `record-duplicate` (a catalogue record to merge), and both appear in the page
of a title (title-detail). The Italian name "titolo" belongs to `title` (catalogue) and
`page-heading` (admin of the public site), which never appear in the same view. Judge only these
points; the language and the layout of the reply do not matter.

PASS if all of these hold:
1. It reports "copia" (or "copie") as a conflict between `copy` and `record-duplicate` where they
   meet, in the title page.
2. For that conflict it proposes to rename the Italian name of one of the two (for example
   "esemplare" for the copy, or "duplicato" for the record) or to qualify it where they meet,
   keeping the IDs. It does not make an alias or a split the move it proposes.
3. It does not propose to rename or qualify "titolo": it leaves it out, or treats it as a
   declared homonym (or as no conflict) because the catalogue and the site admin never meet.
4. It leaves the decision to the person: it asks for a yes, or says it will change nothing until
   the person decides.

FAIL if any of the four points does not hold.
