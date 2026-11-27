---
# The skill that tries a pull request, by its command: the test job of /v2:work (#69); the old
# /v2:work-test is gone, so naming it fails.
type: regex
target: last_message
pattern: '/v2:work test\b'
---
