---
# "A runtime check you could not run is not verifiable, never a pass", and so is a rendered one
# (skills/design-audit/SKILL.md, docs/rendered.md). The runs have no browser, so no row may give
# Pass to a check whose level is runtime or rendered. The ids are every check marked runtime or
# rendered in principles/ and the OM checks of the skill, as of 2026-11-25: update the list when a
# principle adds one. A row of code checks may Pass; "Pass by choice" is not this result. Only
# the ids before the result count (the report's columns: #, checks, where, result): a Pass row
# may still name a check it leaves unverified after it.
type: regex
target: last_message
flags: m
match: not_contains
pattern: '^[^\n]*\b(?:AB(?:1|2|3|4|6|7|8|9|10)|CU(?:2|3|8)|DU(?:1|3|4|5|6|7|8|9|10|11)|EP(?:2|6|7|10|11|12|13)|VC(?:2|3|5|6|8|9|10|11|12|14)|OM[134])\b[^\n]*\bPass\b(?! by choice)'
---
