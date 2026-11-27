---
# The skill that tries a pull request, by its command: work-test today, the test job of /v2:work
# once the work skills are one (#69).
type: regex
target: last_message
pattern: '/v2:work(?:-test| test)\b'
---
