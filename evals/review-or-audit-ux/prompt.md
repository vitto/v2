---
description: '"Fammi una review della UI di questa pagina" in a project that uses Magma, with the Magma plugin enabled beside v2: a request for the quality of the page, which design-audit owns.'
tags: [skill:design-audit, with:magma]
expected_outcome: >
  design-audit starts: the person asks how good the page is for the people who use it, not
  whether its code follows the rules of Magma. The review of the Magma plugin (magma:review),
  which checks the code against the lint, the MCP server and the guides, does not start.
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Fammi una review della UI di questa pagina: src/pages/pratiche.html
