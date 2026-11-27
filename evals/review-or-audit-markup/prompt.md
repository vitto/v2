---
description: '"Fammi una review del markup" of the same page, with both plugins enabled: a review of the code, which magma:review owns, though both descriptions say "review".'
tags: [skill:design-audit, with:magma]
expected_outcome: >
  The review of the Magma plugin (magma:review) starts: the person asks for a review of the
  markup, the code of the page, in a project that uses Magma. design-audit, which judges the page
  as drawn, does not start.
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Fammi una review del markup di src/pages/pratiche.html.
