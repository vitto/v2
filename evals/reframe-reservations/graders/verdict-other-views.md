---
# The skill's step 4: every view the request touches gets a verdict (unchanged, patched, rebuilt).
# The title page and the monthly report have their own graders; the Banco prestiti and the Scheda
# lettore, when the reply names them, carry a verdict on the line of one of their names or on the
# next line that is not a table row. A view the reply never names is not touched. The Catalogo is
# left out: its name is also the root of the hierarchy, so a mention says nothing of the view.
type: regex
target: last_message
flags: i
pattern: '^(?=(?![\s\S]*Banco prestiti)|[\s\S]*?Banco prestiti(?:[^\n]{0,240}?|[^\n]{0,240}\n\s*(?!\|)[^\n]{0,120}?)(patch|ritocc|aggiornat|modific|toccat|rebuil|ricostru|rifatt|rifar|unchanged|invariat|cambia))(?=(?![\s\S]*Scheda lettore)|[\s\S]*?Scheda lettore(?:[^\n]{0,240}?|[^\n]{0,240}\n\s*(?!\|)[^\n]{0,120}?)(patch|ritocc|aggiornat|modific|toccat|rebuil|ricostru|rifatt|rifar|unchanged|invariat|cambia))'
---
