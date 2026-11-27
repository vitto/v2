---
# The monthly report allows only the fields of the council's form, so the reservations stay out
# of it: the reply names it unchanged, in English or Italian, on its line or on the next line that
# is not a table row.
type: regex
target: last_message
flags: i
pattern: 'Report mensile(?:[^\n]{0,240}?|[^\n]{0,240}\n\s*(?!\|)[^\n]{0,120}?)(invariat|unchanged|non cambia|untouched|resta com|stays as)'
---
