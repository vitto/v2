---
# A defect the code alone proves: public visibility is preselected.
# The report has one row per problem with every check id that caught it and its result, so the
# id and Fail sit on one line.
type: regex
target: last_message
flags: i
pattern: 'EP14[^\n]*(fail|non superat|fallit|bocciat|non rispett)'
---
