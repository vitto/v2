---
# Section 1 of the skill: never run the script with nothing before the person answers; the
# overview of the repository is one of the answers, not the default. Matched on the command only
# (not its description): status.ts with no target, options such as --repo aside.
type: tool_used
tool: Bash
input_match: '"command"\s*:\s*"(?:[^"\\]|\\.)*?status\.ts(?:\\")?(?:\s+--[\w=./-]+)*\s*(?:"|\\n|&&|;|\||\d?>)'
min: 0
max: 0
---
