---
name: help
description: 'The cheatsheet of the plugin as a page: every skill, what it is for, the words that call it and examples of use, drawn from the skills themselves. Use when asked how to use v2 or which skill does a job; in Italian "aiuto", "come si usa v2", "quale skill", "cheatsheet".'
argument-hint: "[skill or job, in words]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/help.ts), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/help.ts *)
---

# The cheatsheet of v2

What the person asked: $ARGUMENTS, with the words of their message. The answer is what
`${CLAUDE_PLUGIN_ROOT}/scripts/help.ts` prints, as it is, and the page it draws: every skill of
the plugin, what it is for, how to call it, the words that call it and examples of use, drawn
from each `SKILL.md` and the `examples.md` beside it. Its header says where each answer comes
from.

Where the answer starts: put a horizontal rule (`---` on a line of its own, with an empty line
before and after it, or Markdown reads the line above as a heading) right above what this skill
answers - its report, tables, map or questions - so the person sees where it starts. The
one-line notes before each step stay above it.

Before each step, say in one line what it does.

## 1. Draw it

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/help.ts [skill] --html
```

Write the command as it is, its arguments as plain words: no `${...}`, no quotes, no heredoc. A
session that runs without asking refuses a command holding them; the script picks the folder of
the page itself.

- **A skill named** (its name, or `/v2:<name>`): pass it. The script prints its card (what it is
  for, the words that call it, each job with its examples) and the page opens on it.
- **A job in words** ("quale skill uso per provare una PR?", "come faccio a vedere a che punto
  e' l'epic?"): run it with no skill. In the table it prints, find the rows whose job is the one
  asked; answer first, in one line, with the skill and its command, then the table. When no row
  fits, say so: never name a skill the table does not hold.
- **Nothing**: run it with no skill.

When it says a skill has no `examples.md`, say so in one line: that skill shows its description
alone.

## 2. Show it

Show what it printed, as it is: the table, or the card. Then open the page: in the browser of the
session when it has one, else `open <file>` (macOS) or `xdg-open <file>` (Linux), with the
`#<skill>` the script printed after its path when there is one. The page is a file of this
computer: publish it (an Artifact, for example) only when the person asks to share it.

## 3. What it never does

It only reads the plugin: it changes nothing in the project and runs no other skill. To run the
skill it names, the person types its command or says its words.
