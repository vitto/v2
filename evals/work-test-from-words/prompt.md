---
description: '"fammelo provare" after a conversation that made the branch 12-validate-postcode of the epic 10, committed on it and opened its pull request 14 (history.jsonl): a request to test, in words.'
tags: [skill:work]
expected_outcome: >
  The test job of /v2:work runs: the work to try is the branch 12-validate-postcode (its pull
  request 14), checked out in this folder. The project has no .claude/v2.json, so the job says
  what is missing - how it installs, builds and serves - and asks for those commands instead of
  guessing them. No report of where the epic or the repository stands, no merge. The question
  dialog is off in a run, so it asks in chat and stops there. No file is changed.
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
disallowed_tools: [AskUserQuestion]
---

fammelo provare
