---
id: consistency-over-uniformity
title: Consistency Over Uniformity
section: design-systems
category: Component Design
site: https://vittoriovittori.com/design-systems/consistency-over-uniformity
applies_when:
  - creating a new component, variant, prop or style override
  - building something that already has an equivalent in the product, such as another list, card or form
  - choosing the variant, tone or color of a component
  - changing the look of a shared pattern for a single screen
  - the loading, empty, error and success states of an operation
related:
  - user-centered-design/consistency-and-standards
  - design-systems/single-source-of-truth
  - design-systems/modularity-and-composability
  - design-systems/explicit-constraints
  - design-systems/accessibility-as-a-baseline
  - design-systems/documentation-as-a-product
---

## Intent

What people learn in one place should hold everywhere: the same meaning gets the same element, the same element behaves the same way. The look can adapt to the context (density, emphasis, size) as long as meaning and behavior stay the same. The goal is predictability, not everything looking identical.

## Rules

### Consistent design language constraints across flexible compositions

- Do: let components combine freely inside shared rules for spacing, alignment and accessibility.
- Avoid: composition turning into arbitrary assembly; breaking a system rule for local visual balance.

**CU1** · must · code. Do spacing, sizes, colors, radii and type in the new code come from the design tokens or the system's scale?
Verify: look for raw px, hex or rgb values and arbitrary values (such as Tailwind `[13px]`).

**CU2** · must · runtime. After composing, does the focus order follow the visual order, and does every focusable part show its focus state?

### Interaction patterns over pixel perfection

- Do: keep loading, errors, confirmations and focus predictable; optimize for what people already learned in the product.
- Avoid: pixel alignment at the expense of interaction clarity; changing an interaction model for aesthetic reasons.

**CU3** · must · runtime. Do the loading, empty, error and success states of the new UI use the same pattern, position and wording style as the same states elsewhere in the product?

**CU4** · should · code. Did a visual change leave the interaction model alone? For example, a menu restyled to look lighter still opens on click, a confirmation is still a confirmation.

### Semantic consistency over visual sameness

- Do: use the same component or pattern when meaning and intent are the same; let spacing, size and hierarchy adapt to the layout.
- Avoid: visually identical elements with different meanings; appearance as the only signal of purpose.

**CU5** · must · code. Before a new component was written, was the codebase and the design system searched for one with the same purpose? A new component that duplicates an existing purpose fails unless the reason is written down.

**CU6** · must · code. Does each element match its behavior, whatever its look: navigation is a link, an action is a button, a heading level follows the document structure and not the size wanted?

**CU7** · should · code. Is each style tied to a meaning (danger, success, warning, the AI style) used only for that meaning?

### Shared behavior, contextual presentation

- Do: keep focus, keyboard navigation and error handling the same across visual variants; adapt emphasis and density to the context.
- Avoid: identical layouts forced on contexts where the user's intent differs; interaction logic rewritten for each variant.

**CU8** · must · runtime. Do all the visual variants of a component used here respond the same way to Tab, Enter, Space and Esc, and handle errors the same way?

### Variant systems with clear intent

- Do: define variants by intent (emphasis, hierarchy, feedback); document when and why to use each.
- Avoid: variants added for one isolated need; variants multiplying without control.

**CU9** · must · code. Does every variant used map to an intent, and does the same intent use the same variant across the screen? Two intents on one variant, or one intent on two variants, is a fail.

**CU10** · must · code. Was no variant, prop or one-off override added to satisfy a single screen? When the need is real, it goes to the design system as a proposal, with when and why to use it.

## Don't overdo it

- The same component looking different in different contexts is not an inconsistency when meaning and behavior are the same: denser in a table, larger in a hero, text tone in a toolbar and weak tone in an action bar. That freedom is the point of the principle.
- Do not force the same layout on two contexts where people are doing different things, such as a compact list in a sidebar and a full table on its own page.
- Pixel alignment between screens is not a goal. Fix it only when it breaks a system rule such as the spacing scale or the grid.
- Do not refuse a real need because no variant covers it. Build the closest system-compliant version, then write the proposal.

## With a design system

Ask it for the tokens and scales, the components with their purpose, the variants with their documented intent, the standard states and the keyboard behavior of each component. If the design system has a tool for agents, such as an MCP server or a guide, check components and variants with it before writing. Without a design system, treat the existing equivalents in the codebase as the system.
