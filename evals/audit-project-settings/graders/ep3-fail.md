---
# A defect the code alone proves: the project name has a placeholder and no label.
# The report has one row per problem with every check id that caught it and its result, so the
# id and Fail sit on one line.
type: regex
target: last_message
flags: i
pattern: 'EP3(?!\d)[^\n]*(fail|non superat|fallit|bocciat|non rispett)'
---
