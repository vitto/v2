---
id: accessibility-as-a-baseline
title: Accessibility as a Baseline
section: design-systems
category: Adoption
status: draft
site: https://vittoriovittori.com/design-systems/accessibility-as-a-baseline
inspired_by:                    # draft only: the site keeps the sources of its page, not yet those of the lines added here
  - the Web Content Accessibility Guidelines (WCAG) 2.2, criteria 1.1.1, 1.4.1, 1.4.3, 1.4.11, 2.3.3, 2.5.5, 2.5.8, 4.1.2 and 4.1.3
  - Practical UI, Adham Dannaway
  - Refactoring UI, Adam Wathan and Steve Schoger
  - Laws of UX, Jon Yablonski
applies_when:
  - building or changing a component of a design system, its colour roles, its type or its states
  - a state, a status, a selection or a category shown with colour
  - text on a coloured or tinted background, in any theme or mode
  - an icon-only button, a small control, a dense toolbar, a touch screen
  - an image, a chart, or a message that appears after an action
  - an animation or a transition
related:
  - user-centered-design/error-prevention
  - design-systems/consistency-over-uniformity
  - user-centered-design/visual-composition
---

> Draft (#38). The rules are the use cases of the site's page; the lines added to them (the contrast and target values, never by colour alone, names and descriptions that reach the control) and every check are proposals until the decisions taken in real work confirm or correct them (#35): a check that fails asks the person whether it is a defect or their choice, and never reports a Fail.

## Intent

People with low vision, colour blindness, a tremor or a screen reader use the same products as everyone else. When accessibility lives in the foundations and the components of the design system, every screen built with them has it without anyone remembering; when it is left to each product, it is solved again, and missed, on every screen. This principle sets the floor the foundations and the components hold, and the checks that keep it held.

A floor, not a style: above it, how much contrast, how large the text, how strong the colours are the visual profile's call (#24).

## Rules

### Design Accessible by Default

- Do: use accessible colour contrast as a non-negotiable constraint: text at 4.5:1 against the background it sits on (3:1 from 24 px, or 18.66 px bold); the parts of a control people need to see to act (a field border, a checkbox outline, the focus indicator, an icon that carries meaning) at 3:1; in every theme and mode the product offers.
- Do: never carry a meaning by colour alone. Error, warning, success, info, a selected item, a category or a series of a chart also differ by an icon, a shape, a weight, a border or a word; every status colour comes with the icon of its status, next to its text. Text links are underlined, unless the element already looks interactive.
- Do: make targets easy to hit: at least 24 by 24 CSS px, or spaced so they do not crowd each other; 44 by 44 or more for frequent actions and on touch screens; a small icon gets a hit area larger than its drawing.
- Do: define focus, hover and active states consistently (EP2 and CU8 check them).
- Avoid: relying on manual fixes after components are shipped; leaving interactive states undefined; secondary text in a pale grey below the floor; input borders as faint as a divider; an error, a warning and a success that look the same once the colour is gone; icon buttons the size of their icon.

**AB1** · must · rendered. Does every text reach 4.5:1 against the background it actually sits on (3:1 from 24 px, or 18.66 px bold), in every theme and mode the product offers?
Verify: the contrast table of the rendered checks (`../../docs/rendered.md`), in each theme; a text over a picture is measured on the pixels under it.

**AB2** · must · rendered. Do field borders, control outlines, the focus indicator and every icon that carries meaning reach 3:1 against what surrounds them?
Verify: the rendered checks measure field borders and control outlines; the focus indicator and the icons are read on a screenshot, the control focused with Tab for the first.

**AB3** · must · rendered. With the page in greyscale (`filter: grayscale(1)` on the root), is everything colour says still said another way: by a word, an icon, a shape, a weight or a border?

**AB4** · must · rendered. Does every status (error, warning, success, info) carry an icon of its own next to its text, so it is recognised at a glance, before the text is read and without colour?

**AB5** · should · code. Are text links underlined, or marked by something other than colour, unless the element already looks interactive (a menu item, a tab, a card)?

**AB6** · must · rendered. Is every pointer target at least 24 by 24 CSS px, or spaced so that a 24 px circle centred on it touches no other target or circle?

**AB7** · should · rendered. Are frequent and primary targets, and every target on a touch screen, at least 44 by 44 px?

### Encode Accessibility into Components

- Do: bake the roles, the names and the keyboard support into the components, and provide accessible defaults that work out of the box. Every control has a name that says what it does: an icon-only control names its action and never borrows the name of the field beside it. An image that carries content has a text alternative; a decorative one is hidden. A component carries the name, the description and the invalid state to the element that takes the focus, across its own boundaries (a shadow root), and announces a message that appears after an action. Motion that is not essential stops when the person asks for reduced motion.
- Avoid: expecting consumers to add accessibility features by hand; shipping components that take extra effort to be accessible: an icon button with no name, a name copied from a neighbour, a message on screen that is not linked to its control, a status icon the author must remember to add.

**AB8** · must · runtime. In the accessibility tree, does every interactive element have a role and a name that says what it does, and every image that carries content a text alternative?

**AB9** · must · runtime. Do the description, the hint and the error of a control, and its invalid state, reach the element that takes the focus without the author wiring them, and is a message that appears after an action announced without moving the focus?

**AB10** · should · runtime. With `prefers-reduced-motion: reduce`, do the animations that are not essential stop or become a plain fade?

### Test and Validate Continuously

- Do: include keyboard and screen reader testing in reviews; use automated checks to catch regressions, on every component and in every theme and mode.
- Avoid: assuming accessibility remains intact by default; relying solely on manual audits.

**AB11** · should · code. Do automated accessibility checks (axe or an equivalent) run on the components or the pages in CI, and does a violation fail the build?

**AB12** · should · code. Do the tests of each component cover its keyboard use and what reaches the accessibility tree (name, role, description, state), not only how it looks?

### Treat Accessibility as a System Concern

- Do: centralize accessibility patterns and decisions in the design system; document the accessibility guarantees of each component: what it does by itself, what it leaves to the product. The colour roles say which pairs reach the floor, in each theme and mode.
- Avoid: solving the same accessibility problem in several products; leaving accessibility expectations implicit.

**AB13** · should · code. Does each component document its accessibility guarantees (role, name, keyboard, linked messages, target size, the cue besides colour of each state) and what it leaves to the product?

**AB14** · should · code. Do the colour roles of the design system say which pairs reach 4.5:1 and 3:1 in each theme and mode, so a product picks a role instead of measuring?

## Don't overdo it

- Decorative elements, logos and disabled controls are outside the contrast floor; a disabled control still has to read as disabled.
- An element that already looks interactive (a button, a tab, a menu item, a card) needs no underline.
- Status icons belong to statuses: a neutral hint or a plain note needs none. Do not add an icon to every line.
- Links inside a sentence are exempt from the target size: do not pad running text.
- Contrast above the floor is not this principle's business: pure black on white is not a defect here, and a softer dark grey is not either, as long as both reach the floor.
- An automated checker that passes is not an audit: it cannot tell whether a name says what the control does, or whether an icon reads as its status.

## With a design system

Ask it for the colour roles and the contrast each pair guarantees in each theme and mode, the icon of each status, the minimum size and hit area of its controls, how its components carry a name, a description and an invalid state to the element that takes the focus, and how it follows the reduced-motion preference. In component mode, a component that makes the accessible thing hard or impossible (a message with no status icon, a description that never reaches the input) is the component's own defect; on a screen, it is a conflict with the design system, reported with where the design system says it.
