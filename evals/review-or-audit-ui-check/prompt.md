---
description: '"Controlla la UI di questa pagina" in a project that uses Magma, with both plugins enabled: "check" and "UI" are words of both descriptions, and the request is about the page, which design-audit owns.'
tags: [skill:design-audit, with:magma]
expected_outcome: >
  design-audit starts: the person asks to check the UI of the page, not whether its code follows
  the rules of Magma. The review of the Magma plugin (magma:review) does not start.
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Controlla la UI di questa pagina: src/pages/pratiche.html
