---
# The skill's step 2: a conflict is reported with its name, its language, the two IDs and the
# place they meet. Here: "copia", `copy` and `record-duplicate`, in src/views/title-detail.html.
type: regex
target: last_message
flags: i
pattern: '^(?=[\s\S]*\brecord-duplicate\b)(?=[\s\S]*\bcopi[ae]\b)(?=[\s\S]*title-detail)'
---
