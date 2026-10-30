---
id: design-for-uncertainty
title: Design for uncertainty
section: human-centered-ai-design
category: Transparency
site: https://vittoriovittori.com/human-centered-ai-design/design-for-uncertainty
applies_when:
  - any output produced by a model, such as an answer, summary, classification, extraction, recommendation, score, or generated text or image
  - a flow where AI output gets saved, sent, published or used in a decision about a person
  - search or matching results ranked by a model
  - an AI feature that works on files or data that may be incomplete
related:
  - human-centered-ai-design/make-the-ai-s-role-explicit
  - human-centered-ai-design/provide-understandable-explanations
  - human-centered-ai-design/preserve-user-agency
  - human-centered-ai-design/support-human-in-the-loop-interaction
  - human-centered-ai-design/set-appropriate-expectations
  - user-centered-design/error-prevention
---

## Intent

A model's output is a guess with a confidence, and people need to know how much to rely on it. Trust should be proportional to reliability: confident outputs can be used quickly, uncertain ones get checked, and the person is always the one who decides.

## Rules

### Make Uncertainty Visible

- Do: show confidence with a level, a score or a plain sentence; use visual indicators so differences in confidence are visible at a glance.
- Avoid: uncertain outputs with the same visual weight as confident ones; uncertainty hidden in jargon or fine print.

**DU1** · must · runtime. Does every output people act on show how reliable it is, right next to the output and not on another page or in a footnote?

**DU2** · must · code. Does the precision shown match the precision available? A percentage only when the model returns a calibrated score; otherwise a level or words. A number derived from a level fails.

**DU3** · should · runtime. Do low-confidence outputs look different from high-confidence ones, with a difference that does not rely on color alone?

### Communicate Assumptions and Data Gaps

- Do: say which data the output is based on; point out when important information is missing.
- Avoid: outputs without their assumptions or limits; recommendations that look more certain than the data allows.

**DU4** · must · runtime. Does the output say what it is based on (sources, documents, the user's data, a date range), with links where the person can open them?

**DU5** · must · runtime. When the input was missing, partial or poor (an unreadable scan, a truncated file, a period without data), does the output say so, and is that visible without any interaction when confidence is low?

**DU6** · should · runtime. Are the assumptions the model made for the user ("I took this as the 2025 budget") stated, and can the user correct them in one step?

### Design for Ambiguous or Multiple Outcomes

- Do: present the reasonable interpretations when the model is uncertain, each with its confidence.
- Avoid: forcing one answer when several are equally plausible; showing only the most likely outcome to hide ambiguity.

**DU7** · should · runtime. When a request has more than one reasonable reading, or the top results are close, does the UI show the alternatives or ask a clarifying question?

**DU8** · should · runtime. Does each alternative carry its own confidence or reason, so the choice is informed?

### Encourage Verification and Human Judgment

- Do: ask people to verify when low or moderate confidence affects other people; make human review easy to request.
- Avoid: uncertain outputs presented as final; making it hard to question or override the output.

**DU9** · must · runtime. Before AI output is published, sent, saved into a record or used in a decision about someone, does the person review it, with the output editable at that point?

**DU10** · must · runtime. Can the person reject, edit or override the output, and ask for human review where the stakes call for it?

**DU11** · should · runtime. Does the push to verify scale with confidence and impact: a light hint when little is at stake, an explicit review step when a lot is?

## Don't overdo it

- Not every AI output needs a confidence indicator. An autocomplete accepted with Tab, or a rewrite the person reads in full anyway, does not. Show it where people act on the output without checking it all.
- A permanent "AI can make mistakes" line is not a substitute for signals on each output: a warning that is always there stops being read.
- Do not show five alternatives when one is clearly better. Alternatives are for real ambiguity.
- A bare score ("0.73") is jargon. Say what it means for the person.
- Do not ask people to verify text they just wrote themselves.

## With a design system

Ask it for the pattern that marks generated content, the confidence or status indicator, the caution and error styles with what each means, the sources pattern and the review-before-commit pattern. If it has no confidence indicator, propose one instead of inventing a different one for each screen (see consistency-over-uniformity).
