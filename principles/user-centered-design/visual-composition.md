---
id: visual-composition
title: Visual Composition
section: user-centered-design   # open: which section of the site, or a new one
category: Layout
status: draft
site:                           # open: the site has no page for it yet
inspired_by:                    # draft only: the site keeps the sources once the page exists
  - Practical UI, Adham Dannaway
  - the Gestalt principles of grouping (proximity, similarity, continuity, common region)
  - Fitts's law and Hick's law
  - Vittorio Vittori's own practice, for Center by eye, not by the box, until a bibliographic source is found
applies_when:
  - placing the elements of a new view, section, card, dialog or form
  - a view with more than one group of content, fields or actions
  - choosing which action is the main one and where the actions sit
  - a view that feels cluttered, flat, or hard to scan
  - hiding content behind a menu, a tab, an accordion or a "more"
  - a layout that must hold from a narrow screen to a wide one, and with long data
  - placing an icon, a glyph or a logo alone in a frame: a button, a tile, an avatar, an app icon
related:
  - design-systems/consistency-over-uniformity
  - user-centered-design/error-prevention
---

> Draft (#23). The rules and checks are proposals until the decisions taken in real work confirm or correct them (#35): a check that fails asks the person whether it is a defect or their choice, and never reports a Fail. The section and the page on the site are open, so no rule links to an example yet. The parameters these rules take (how much the spacing grows, how dense a view is) come from a visual profile (#24).

## Intent

The layout shows the structure of a view before a word is read: what belongs together, what matters most, where to act. It is how the priorities of the object model become visible: the focal entity first, the entities around it at their weight, the main action where the eye and the hand already are. When the arrangement does not carry the structure, people read everything to find anything.

The values (the spacing scale, the grid, the elevations, the button styles) are the design system's. This principle decides how they are used: which step of the scale for which relation, what stands out and what recedes.

## Rules

### Order by importance, then make the order visible


- Do: group the content into sections, order the items inside each section and then the sections by importance; give the most important the most prominence (size, weight, contrast, space around it, position, elevation), and lower the rest one step at a time. The order comes from the object model: the focal entity, what must always be visible about it, the action the goal of the view needs.
- Avoid: everything at the same prominence; prominence decided by taste or by what the data happens to be; labels that state the obvious ("Description" over a description).

**VC1** · must · code. Does the order of the sections and of the items inside them follow the object model's priorities for this view: the focal entity and its always-visible state first, the entities around it after, at the weight the model sets?

**VC2** · must · rendered. Squint test: with the page blurred (the blurred screenshot of the rendered checks, `filter: blur(6px)` on the root), can you still tell the single most important element and what the view is for?

### Group by space before boxes


- Do: show what belongs together with proximity first, then with similarity and with alignment on a continuous line; combine them. Use a container (a border, a background, a shadow) for the main structure of the page (navigation, panels, dialogs) and where the other cues are not enough.
- Avoid: a card for every group; containers nested in containers; a gap that sits closer to the wrong group than to its own.

**VC3** · must · rendered. Is every element closer to the group it belongs to than to the neighbouring group?

**VC4** · should · code. Is each container there because space, similarity and alignment could not show the group? A container inside a container inside a container is a fail.

### Space by relationship, growing outward


- Do: start with the smallest steps of the scale for the innermost pairs (a label and its value, a title and its subtitle) and step up as you move outward: between items, between groups, between sections. When unsure between two steps, take the larger one.
- Avoid: one spacing value everywhere; values outside the scale; spacing that shrinks as the level grows.

**VC5** · must · rendered. Does the spacing grow from the innermost level to the outermost: within a pair, then between items, then between groups, then between sections, and is every gap between two groups larger than the largest gap inside either?
Verify: measure the gaps on the rendered page (`getBoundingClientRect`) along one path from a pair to its section. The rendered checks (`../../docs/rendered.md`) list the spacing off the scale.

### Look alike, work alike


- Do: give elements with the same role the same look; make one item of a group stand out only by changing it slightly (a badge, a border, a heavier weight) when it really is the recommended one.
- Avoid: static elements (a badge, an icon, a tag) that look like buttons or links; interactive elements that look like static text.

**VC6** · must · rendered. Does nothing look interactive that is not, and does everything interactive look interactive?

### One main action, next to what it acts on


- Do: at most one primary action in a view (and one in each dialog over it); the others secondary or tertiary by importance. Put each action next to the element it acts on, ordered by importance in reading order; on a narrow screen, stacked with the most important on top. In a flow in steps, keep the way back away from the way forward.
- Avoid: several primary actions competing; actions far from their object; a Back button where the eye expects Continue.

**VC7** · must · code. Is there at most one primary action per view, and one per dialog?

**VC8** · should · rendered. Is each action placed with the element it acts on, and are the actions of a group in order of importance?

### Few alignments, one strong edge


- Do: align the main blocks of the page to the grid of the design system; keep one strong edge (the left, in left-to-right languages) for text and the elements around it; align text of different sizes on one line by its baseline.
- Avoid: mixing left, centered and right alignments inside one section, so the eye zig-zags; icons or indents that break the edge the text starts from; long centered text.

**VC9** · should · rendered. Inside each section, do the text and the elements around it share one alignment, apart from short centered blocks (an empty state, a short confirmation)?

**VC10** · should · rendered. Are texts of different sizes on the same line aligned by their baseline?

### Visible when needed, discoverable when hidden


- Do: keep visible what the goal of the view needs, and reveal the rest when it is needed (progressive disclosure), behind a label that says what it reveals. When space forces something off screen, let it show (the edge of the next card, a count).
- Avoid: hiding what the view is for behind a menu to look clean; minimal that becomes vague (unlabelled icons, a selected state too subtle to see); repeated elements.

**VC11** · must · rendered. Is everything the goal of the view needs visible without opening anything, and does every control that reveals more say what it reveals?

### Smallest width first, longest data too


- Do: compose for the narrowest width the product supports first, so the order of importance is decided before space allows everything; let the layout reflow for long names, big numbers and empty fields.
- Avoid: filling a wide screen because there is room; truncating the part of a text that tells items apart.

**VC12** · must · rendered. At the narrowest supported width, and with the longest realistic values, does the order of importance hold, and is no essential information cut or overflowing?

### Forms flow down one column


- Do: one column of fields with each label above its field; short related fields side by side only inside that column (expiry and CVC); options stacked; a long form grouped under headings or split into steps.
- Avoid: two columns of fields; labels to the left of fields; radio buttons in a row.

**VC13** · must · code. Is the form one column with labels above the fields, and is a form longer than one screen grouped under headings or split into steps?

### Center by eye, not by the box


> Source: Vittorio Vittori's own practice, until a bibliographic source is found.

- Do: center a shape whose weight is not in the middle of its box (a triangle, a play arrow, an asymmetric logo) by its weight: move it toward its light side, about halfway from the center of its box to its centroid. Halfway, not all the way: the eye places the center of a frame a little above the geometric one, so a centroid on the exact center reads low.
- Avoid: centering such a shape by its bounding box (a triangle pointing down looks high, a play arrow looks pushed left); trusting the numbers of the layout tool over the eye.

**VC14** · should · rendered. Does every icon, glyph or logo alone in a frame look centered, and is one whose weight is off the middle of its box moved toward its light side, about halfway to its centroid?
Verify: on the rendered shape, compare the center of its box with its centroid (the mean position of its filled pixels); the shape should sit about half that distance from the box center, toward its light side.

## Don't overdo it

- Not every group needs a card, but do not strip the containers that hold the main structure (navigation, a side panel, a dialog): there they carry the structure.
- Generous space is a default, not a goal. A tool people work in all day (a table, an editor, a console) needs density: keep the groups distinct with the small steps of the scale instead of making people scroll.
- One primary action at most does not mean one at least: a view to read or browse may have none.
- One strong edge is a default: a short centered block is fine, and a single field with its button (search, subscribe) keeps the button on its right, attached to it.
- Hiding is the point of progressive disclosure for what the goal of the view needs rarely. The fail is hiding what it needs often.
- Do not count alignments to the pixel: the question is whether the eye zig-zags.
- Optical centering is for a shape alone in its frame. Icons in a row or beside text follow the shared baseline and the grid of their set: do not nudge each one on its own, and do not correct an icon the design system already drew on its keylines.

## With a design system

Ask it for the values, never invent them: the spacing scale, the grid (columns, gutters, margins), the levels of elevation, the button weights and the type scale; and for its rules of composition, through its tools for agents when it has them (Magma: the domains of its design language, such as rhythm, density, actions, titles, surfaces and widths). This principle chooses which step of the scale for which relation; the design system says what the steps are. Where it sets a rule that differs from one here (buttons aligned right in dialogs, for example), follow the design system and report the difference.
