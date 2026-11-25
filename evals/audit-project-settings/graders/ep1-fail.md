---
# A defect the code alone proves: the delete is a div with an onclick handler, not a button.
# The report has one row per problem with every check id that caught it and its result, so the
# id and Fail sit on one line. (?!\d) keeps EP10-EP15 out.
type: regex
target: last_message
flags: i
pattern: 'EP1(?!\d)[^\n]*(fail|non superat|fallit|bocciat|non rispett)'
---
