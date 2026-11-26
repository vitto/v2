---
description: The UX audit of a project settings page with defects the code alone proves, a field that only looks like one, and no object model.
tags: [skill:design-audit]
expected_outcome: >
  Mode screen. Fails proved by the code: EP1 (the delete is a div with onclick), EP3 (the project
  name has only a placeholder), EP14 (public visibility preselected); EP4 (maxlength and required
  not written) and EP9 (delete without the danger style, next to Save) likely too. The search
  field has an aria-label and its context labels it: not an EP3 fail. Runtime and rendered checks
  that could not run are Not verifiable, never Pass (a code-backed fail of EP7 is fine). Draft
  principles ask instead of failing. The Summary names where to start by row numbers, and says the
  goal cannot be checked without an object model, pointing to design-interview. No file changes.
max_turns: 50
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill]
---

Mi controlli la qualita' UX della pagina delle impostazioni del progetto, impostazioni.html? Prima di passarla allo sviluppo voglio sapere cosa non va.
