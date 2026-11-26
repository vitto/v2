---
description: The glossary of a library tool, where one Italian word names two concepts in one view and another names two concepts that never meet.
tags: [skill:taxonomy]
expected_outcome: >
  The conflict is the Italian "copia", shared by `copy` and `record-duplicate`, which meet in
  src/views/title-detail.html (and it.json); English and the IDs do not collide. The move is a
  rename of the Italian name of one of them (or a qualified form), IDs kept, no alias, no split.
  "titolo" (`title` and `page-heading`) is a declared homonym: the catalogue and the site admin
  never meet. Nothing is changed before the person says yes.
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---

I bibliotecari dicono che in certe pagine non capiscono piu' cosa vuol dire una parola. Controlla le parole di questo progetto contro le viste, trovami i conflitti e dimmi come li risolveresti.
