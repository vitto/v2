---
# The skill's step 4: every view the request touches gets a verdict (unchanged, patched, rebuilt).
# The title page is the view the request lands on, so it must carry one, in English or Italian:
# on its line, or on the next line that is not a table row (a heading, then its first bullet).
type: regex
target: last_message
flags: i
pattern: 'Scheda titolo(?:[^\n]{0,240}?|[^\n]{0,240}\n\s*(?!\|)[^\n]{0,120}?)(patch|ritocc|aggiornat|modific|toccat|rebuil|ricostru|rifatt|rifar|unchanged|invariat|cambia)'
---
