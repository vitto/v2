# Pilot test: the AI response components

Checked on 2026-10-30 against the three pilot principles, by reading the code and on the local dev server.

Target: the shared components of the site's AI demos, in `src/components/use-cases/` of the site's repository: `AIInput`, `AIResponseFooterActions`, `AIResponseFollowUpAction`, `AIFilePreview`, `AIGeneratedArticleSummary`.

These are demos, each built to show one principle, and here they are held against all three. Some findings are fine for a demo and would be defects in a product; the notes say which.

## Findings

Findings in the same place are merged, with every check id that caught them.

| # | Checks | Where | Result |
| --- | --- | --- | --- |
| 1 | EP1, CU6, CU8 | `AIResponseFollowUpAction` | **Fail.** A `div` with `tabindex="0"` and `cursor-pointer`, no role, and Enter does nothing (6 instances on /human-centered-ai-design/adapt-to-user-context-and-expertise, checked in the browser). "Download the PDF guide" and "Watch a video" are navigation, so they should be links; the component declares an `href` prop and never uses it. Within the same family, `mds-button`, the confidence banner and this element are three clickable things with three keyboard behaviors. A defect on the live site. **Fixed on `feat/redesign`:** now a link when `href` is set and a button otherwise, with the same look; Enter and Space work. |
| 2 | DU5 | `AIFilePreview` | **Fail.** The reason behind the confidence ("handwritten or scanned content may affect accuracy") is collapsed on load (height 0, checked in the browser) and appears only after a click. When confidence is low it should be visible without interaction. |
| 3 | DU5, EP12 | `AIFilePreview` | **Fail.** The banner starts with `aria-expanded="true"` while it is collapsed, so screen readers announce it open. Its `aria-label`, "Toggle confidence details", also replaced the confidence level, so it was never announced. A defect on the live site. **Fixed on `feat/redesign`:** it starts with `aria-expanded="false"` and the label names the level ("Low confidence details"). |
| 4 | EP10, DU9 | `AIGeneratedArticleSummary`, default actions | **Fail.** Publish sends AI-generated content in one click, with no review step. The custom version in `EditableAndReversibleAIOutputs` already has the pattern ("approved", "reviewed once by you"); the default action bar does not use it. |
| 5 | EP3 | `AIInput` | **Fail.** The inner input has only the placeholder "Ask something": no label, `aria-label` or `aria-labelledby` (checked in the shadow DOM). A chat composer needs no visible label, but it needs an accessible name. How to pass one to `mds-input` is a question for Magma. |
| 6 | DU2 | `AIFilePreview` | **Fail in a product, fine in a demo.** The values 92, 65 and 45 are fixed per level, and a bar with a number reads as a measured score. As a component it should take the model's score, or show only the level. |
| 7 | EP7 | `AIGeneratedArticleSummary`, `AIResponseFooterActions` | **Not verifiable.** Delete and Regenerate have no behavior. Regenerate replaces the current output, so it is destructive by the file's definition: in a product it needs undo or a way back to the previous version. |
| 8 | CU7, CU9 | `AIFilePreview`, `AIGeneratedArticleSummary`, `AIResponseInfosSectionItem` | **Open question.** The error style means three things: a destructive action (Delete), a failure status, and low confidence. The first two sharing it is common. Low confidence in the error style says "this failed" when the message should be "check this". The files do not settle it: it needs a position. |
| 9 | CU9 | Regenerate in `AIResponseFooterActions` and `AIGeneratedArticleSummary` | **Pass.** `tone="text"` in one, `tone="weak"` in the other: same icon, same meaning, different emphasis for the context. A literal reading of CU9 would flag it; the "Don't overdo it" section is what stops it. |
| 10 | DU1, DU3, DU10, EP9 | `AIFilePreview`, `AIGeneratedArticleSummary` | **Pass.** Confidence sits next to the file with a written label as well as the color; the summary can be edited, regenerated or deleted; Delete uses the danger style. |

## What the test says about the format

- **The checks find things that "follow UX best practices" does not.** Findings 1, 2, 3 and 6 are specific and fixable, and none of them is obvious from a generic list.
- **The code and runtime tags were right.** Findings 1, 2, 3 and 5 needed the running page: element heights, keyboard behavior, shadow DOM.
- **"Don't overdo it" earned its place.** Finding 9 is a false positive it prevented.
- **The cross-section links work.** Finding 4 was caught by one UCD check and one HCAID check. The report must merge findings by place, or the same problem is counted twice.

Gaps to fix in the format:

1. **A component is not a screen.** EP7 cannot be judged on a component with no behavior. Auditing a component asks a different question: does it make the right thing the default? That is the design system view, and it is the same framing as the site texts (each principle's case is how Magma makes it the default). The format needs two audit modes, screen and component.
2. **Some rules need a stance first.** Finding 8 is a judgment call the files cannot make on their own.
3. **Accessibility overlaps.** EP1, EP3, EP12 and CU8 are partly accessibility checks. When Accessibility as a Baseline is written, the pure accessibility checks move there and the others reference them.

## Not tested yet

Build mode: whether an agent builds a different UI when it has the files loaded. The test is the same brief built twice, with and without the files, both scored against the checks.
