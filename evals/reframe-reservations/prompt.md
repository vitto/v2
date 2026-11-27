---
description: A request to add reservations to a library circulation tool, asked as a box inside each copy's row of the title page, with the reader's data edited there.
tags: [skill:design-reframe]
expected_outcome: >
  The reservation is placed in the object model (docs/prestiti.object-model.md) before any UI: a
  new entity of the title (any copy can fulfil it), referring to a reader. Each view touched gets
  a verdict: unchanged, patched or rebuilt. The title page does not take the queue inside each
  copy's row nor the reader's data (a box in a box, and "never here" in its view): rebuilt, or the
  queue at the title's level, with the reader's data in the reader page, linked: "never here"
  holds for the side panels and dialogs of the view too (docs/object-model.md, section 5). The
  monthly report is unchanged. The model file is not edited before the person's yes.
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---

Aggiungi anche le prenotazioni: quando tutte le copie di un titolo sono in prestito, un lettore si mette in coda e la prima copia che torna e' per lui. Le vorrei nella Scheda titolo, dentro la riga di ogni copia: un riquadro con la coda e, per ogni prenotazione, i dati del lettore da modificare li'.

L'obiettivo dello strumento resta quello del modello; oggi il lavoro rallenta al banco, quando un libro torna e nessuno ricorda chi lo aspettava. Su quello che non ti ho detto proponi tu e segnalalo come proposta; le domande che restano mettile in fondo.
