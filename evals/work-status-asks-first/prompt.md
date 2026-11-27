---
description: /v2:work typed with no argument after a conversation that already has work - the part 12 of the epic 10, its branch made from the branch of the epic, a commit, its pull request 14 into the branch of the epic (history.jsonl).
tags: [skill:work]
expected_outcome: >
  Before any report, its status job asks what to show: the epic 10 first and recommended (the epic of
  the issue 12 and of its pull request 14), the whole repository last. To find the epic it runs
  status.ts on the piece or on the epic, never with nothing; GitHub is out of reach in a run, so
  it reads the epic from the conversation. The question dialog is off in a run, so it asks in
  chat and stops there. No file is changed.
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
disallowed_tools: [AskUserQuestion]
---

/v2:work
