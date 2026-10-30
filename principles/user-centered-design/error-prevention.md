---
id: error-prevention
title: Error Prevention
section: user-centered-design
category: Error handling
site: https://vittoriovittori.com/user-centered-design/error-prevention
applies_when:
  - a form, a single input, a search or chat field
  - an action that deletes, overwrites, sends to other people, pays, publishes, revokes access or discards unsaved work
  - a flow of more than one step, such as checkout, onboarding or a wizard
  - options, toggles or settings that start with a value already chosen
  - something that reacts to a click, or looks like it should
related:
  - user-centered-design/user-control-and-freedom
  - user-centered-design/help-users-recognize-diagnose-and-recover-from-errors
  - user-centered-design/visibility-of-system-status
  - design-systems/accessibility-as-a-baseline
  - human-centered-ai-design/design-for-uncertainty
---

## Intent

People should not be able to make the mistake in the first place. A good error message is the second-best outcome: a prevented error costs nothing, a recovered one costs time and trust, an unrecoverable one costs data.

"Destructive" in this file means any action that deletes, overwrites, sends to other people, pays, publishes, revokes access or discards unsaved work.

## Rules

### Clear Affordances

- Do: make interactive elements look and behave interactive; show unavailable actions as disabled when people would look for them.
- Avoid: clickable and static elements that look the same; changing interaction patterns from one screen to the next.

**EP1** · must · code. Is every element that reacts to a click a native interactive element (button, link with href, form control), or does it have the matching role, Tab reachability and Enter/Space activation?
Verify: look for click handlers, `cursor-pointer` or `tabindex` on non-interactive tags.

**EP2** · must · runtime. Does every interactive element have a visible hover and focus state, and does nothing static look like a link or a button?

### Clear Input Expectations

- Do: state format, required fields and limits before input; use a label and helper text together.
- Avoid: requirements that appear only after submit; the placeholder as the only label; limits discovered by trial and error.

**EP3** · must · code. Does every input have a label that stays visible while typing, or at least an accessible name when its context labels it (see Don't overdo it)?
Verify: inputs with a placeholder and no label, `aria-label` or `aria-labelledby`.

**EP4** · must · code. Is every constraint the code enforces (`required`, `pattern`, `maxlength`, `min`/`max`, `accept`, file size) written next to the field before the user types?

### Constraint-Based Design

- Do: offer only valid options when the valid set is known; make impossible states impossible.
- Avoid: accepting invalid data and handling it later; relying on error messages to prevent errors.

**EP5** · should · code. When the valid values are a small known set, does the input offer only them instead of free text validated afterwards?

**EP6** · must · runtime. Are actions that cannot succeed in the current state unavailable, including a second submit while the first request is still running?

### Destructive Action Protection

- Do: ask for extra intent before irreversible actions; write warnings that name the object and the consequence; make destructive actions look different.
- Avoid: destructive actions that run on the first click; vague confirmations like "Are you sure?"; destructive and safe actions with the same style.

**EP7** · must · runtime. Can every destructive action either be undone afterwards or does it ask for confirmation first?

**EP8** · must · code. Does every confirmation name the object and the consequence, and does its confirm button repeat the verb ("Delete", "Send") instead of "OK" or "Yes"?

**EP9** · should · code. Do destructive actions use the danger style, and are they kept apart from the most frequent action instead of sitting right next to it?

### Error-Resistant Flows

- Do: split complex tasks into steps that follow the user's goal; show a final review before anything is committed.
- Avoid: long dense forms; committing critical actions without review; flows shaped around edge cases.

**EP10** · should · runtime. Before a payment, a publication, a send or a submission, is there a review that shows what will happen, with a way back to change it?

**EP11** · must · runtime. Do going back, moving between steps or reloading keep what the user entered, or warn before losing it?

### Real-Time Validation

- Do: validate while people act; write errors that say how to fix the problem; confirm valid input where validity is not obvious.
- Avoid: all errors at once after submit; generic or technical error text; speaking only when something is wrong.

**EP12** · must · runtime. Does each error appear next to its field, say what is wrong and how to fix it in plain words, use text and not only color, and stay linked to the field (`aria-invalid`, `aria-describedby`)?

**EP13** · should · runtime. Does validation run when the user leaves a field or completes it, not on every keystroke the first time, and does an error clear as soon as it is fixed?

### Safe Defaults

- Do: preselect the choice that protects people and matches what most of them do; let people change defaults where they apply.
- Avoid: preselected risky or irreversible options; defaults that serve only the system; hidden or locked defaults.

**EP14** · must · code. Is nothing risky, irreversible, paid or data-sharing preselected (public visibility, notify everyone, auto-renew, consent)?

**EP15** · should · code. Is every default visible and changeable at the point where it applies?

## Don't overdo it

- Confirm only what cannot be undone. Confirming reversible actions trains people to click Yes without reading, and then the confirmations that matter stop working. When undo is technically possible, prefer undo.
- Keep the type-the-name confirmation for the rare high-stakes cases (deleting an account, a bulk delete), not for every delete.
- Do not disable a submit button until the form is valid: people cannot find out what is missing. Keep it enabled and point to the first error, unless the reason it is disabled is written next to it.
- Do not constrain inputs people type faster than they pick, such as birth dates or codes they paste. Accept common formats and normalize spaces, dashes and case instead of rejecting them.
- Do not put a check mark on every valid field. Confirm only where validity is not obvious: password strength, username availability.
- A chat composer or a single search field can let its context act as the visible label, but it still needs an accessible name.

## With a design system

Ask it for the field anatomy (label, helper text, error, required marker), the danger style, the confirmation pattern, the undo pattern, the disabled state and the multi-step pattern. When the design system sets a rule that differs from this file, such as when to validate, follow the design system and report the difference.
