---
# The skill's step 4: the request for the person's yes is the last line, after the open questions,
# and no file changes before it. The last line that is not blank asks for it, in English or
# Italian. Written \u00ec for the accented i of "si'": the files of the repository are ASCII.
type: regex
target: last_message
flags: i
pattern: '(?:^|\n)[^\n]*(\bs\u00ec|\bsi''|\bok\b|\bokay\b|\bvia\b|conferm|approv|proced|d''accordo|\byes\b|confirm|go[ -]ahead)[^\n]*\s*$'
---
