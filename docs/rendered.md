# The rendered checks

The checks of the principles have three levels, named after where their answer comes from: `code`, read in the code; `runtime`, the running page and an action on it (the keyboard, the focus, the accessibility tree, a state reached by acting); `rendered`, the page as drawn. A view can pass every `code` and `runtime` check and still read as a wall of boxes, with five text sizes and spacing off the scale: the `rendered` checks are where that shows, and where the visual checks of the principles get an answer instead of a guess.

They come in two kinds:

- **Measured**, the same every time: the computed styles of every visible element against the tokens of the design system, the contrast of text and controls, the size of targets, the left edges, the length of lines. `scripts/rendered.ts` reads them.
- **Seen**, a judgment on the screenshots: blurred, in greyscale, the order of importance, the references of the visual profile. Each written with what was looked at.

## Opening the page

- The page runs the project's own way: its dev server, its `.claude/launch.json`. With real or long data: the longest names, the biggest numbers, the empty fields. A view checked with three short rows says nothing about the hundredth.
- `node scripts/rendered.ts --url=<address> --widths=<narrowest>,<widest>` opens it in the Chrome of the computer, headless, with nothing to install. `--themes=light,dark` for each theme, `--selector=<css>` for one component. It writes the screenshots, `report.md` and `measure.json` to a new folder outside the checkout, and names it.
- Without Chrome, the same measures run in the browser of the session: `node scripts/rendered.ts --snippet` prints them as one JavaScript expression, whose value is the measures of the page the browser shows. Set the window to each width first, and take the screenshots with the browser's own tool, with `filter: blur(6px)` and then `filter: grayscale(1)` on the root. The texts over a picture stay not measurable that way: they need the pixels.
- With neither, the `rendered` checks are not verifiable, never a pass.

## The widths

At least two, the narrowest and the widest the view supports, from the first that says:

1. the object model, when it states the widths the view supports;
2. the design system: its first and its last breakpoint;
3. 360 and 1440.

Add a width in between when a breakpoint changes the layout, such as a sidebar that folds.

## The themes

Every theme the view supports. `--themes=light,dark` sets `prefers-color-scheme`, dark for a theme whose name says dark; a design system that switches themes on an attribute of the root also needs `--theme-attribute=<name>` (`data-theme`), which is set to the name of the theme.

## Measured

| What | How | Answers |
| --- | --- | --- |
| Values off the scale: spacing (padding, margin, gap), font sizes, weights, line heights, colours (of text, fills and borders), radii, shadows | against the tokens: the custom properties with a value on the root, resolved there, their kind from their value and then their name. On the scale within half a pixel, a colour within 2 on each channel; a token that is a unit the scale multiplies (Tailwind's `--spacing`) takes every whole multiple | CU1, VC5 |
| Distinct text sizes, weights, text colours and fills | counted, with how often each is used | the seen checks; the visual profile (#24) |
| Contrast of text | over what is painted under its first line, which may be an element placed beside it rather than an ancestor; over a picture, a canvas or a gradient, on the pixels of a screenshot taken with every text hidden | AB1 |
| Contrast of controls | the border or the fill of a field against the background around it, 3:1 | AB2 |
| Targets | 24 by 24 px, or spaced so their 24 px circles touch nothing (WCAG 2.5.8); how many are under 44 px | AB6, AB7 |
| Left edges | where the text of each block starts, within 2 px, the most used first | VC9 |
| Line length | the characters of a block of text over its lines; over 80 is reported (WCAG 1.4.8) | a measure, no check yet |

Never off the scale: 0, hairlines of 1 px, side margins equal to each other (auto, centring), radii of half the box or more (a pill, a circle). A style sheet of another origin cannot be read: the report says how many, and their tokens are missing. Text in a disabled control is left out of contrast, as WCAG leaves it out; a link inside a sentence is left out of targets.

## Seen

On the screenshots of each width and theme, each judgment written with what was looked at:

- **Blurred** (VC2): do the groups, the focal entity and the main action still stand out?
- **Greyscale** (AB3): does the order of importance still hold, carried by size, weight, space and contrast, and is everything colour says said another way?
- **The order of importance**: is the order read on the image the one the object model gives, the focal entity first?
- **The references** (#24): side by side with the references of the visual profile, when there is one: what matches, what does not.
- Every other check at level `rendered` of a loaded principle that the tables do not answer: in Visual Composition, proximity (VC3), what looks interactive (VC6), where actions sit (VC8), baselines (VC10), what is visible (VC11), the narrowest width (VC12), optical centring (VC14); in Accessibility as a Baseline, the icon of each status (AB4); in the object model, OM1 and OM4.

A seen check is never a pass without its screenshot. The screenshots stay beside the report: show them to the person, so they see what the agent saw.

## In design-build: two rounds

After building, shoot and measure, fix, shoot and measure again: two rounds of fixing at most. What still fails after the second is handed over as failing, with its screenshot and its row, never hidden. Two rounds are enough for the fix of a fix, such as a gap fixed at the widest width that breaks the narrowest; each round costs screenshots, which is context, and a check the design system makes fail would go round forever.

## In design-audit

The same checks, on a page that exists. The screenshots go in the report, and the rows of the tables merge by place with the other results.

## Don't overdo it

- A value off the scale is a question before it is a fix: a widget of a third party, a value the design system lacks (it then goes to the design system as a proposal, CU10), an optical correction someone made on purpose.
- The counts are not a verdict: five text sizes can be right for a dense tool. They are what the seen checks and the visual profile weigh.
- Left edges count every block, so a table has an edge per column. The question stays whether the eye zig-zags (VC9).
- A contrast measured through an opacity or a backdrop filter is approximate: look at the screenshot before calling it a fail.
