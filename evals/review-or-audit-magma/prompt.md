---
description: '"Controlla che questo template usi bene Magma" in the same project, with both plugins enabled: a request about the code against the rules of Magma, which magma:review owns.'
tags: [skill:design-audit, with:magma]
expected_outcome: >
  The review of the Magma plugin (magma:review) starts: the person asks whether the template
  uses Magma as its rules say. design-audit, which judges the quality of the page against the
  principles, does not start.
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Controlla che il template src/pages/pratiche.html usi bene Magma.
