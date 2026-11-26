---
# Section 1 of the skill: the epic of each piece of the conversation's work is found by running the
# script on the piece and reading its Epic:. The pieces are the issue 12, its pull request 14 and
# the branch 12-validate-postcode; the epic is 10, its branch 10-checkout-one-page. It also tells
# that the skill, not the bare model, answered: a typed command loads it without the Skill tool.
type: tool_used
tool: Bash
input_match: '"command"\s*:\s*"(?:[^"\\]|\\.)*?status\.ts(?:\\")?(?:\s+--[\w=./-]+)*\s+#?(?:10|12|14)\b'
min: 1
---
