---
description: A person new to the plugin asks how to use it and which skill tries a pull request before they approve it.
tags: [skill:help]
expected_outcome: >
  The help skill runs its script, scripts/help.ts, with --html. The answer opens with the skill
  that tries a pull request, with its command (/v2:work-test, or /v2:work test once the work
  skills are one), then shows the table of the jobs the script printed, and says where the page
  is (or that it opened it). It runs no other skill and tests nothing: it only names them. No
  file of the workspace changes.
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

Ho appena installato il plugin v2 e non so da dove partire: come si usa? E quale skill uso per provare una pull request prima di approvarla?
