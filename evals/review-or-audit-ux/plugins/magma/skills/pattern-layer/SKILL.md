---
name: pattern-layer
description: Adapt a Magma pattern to this product - its layer in magma/patterns/<id>.md fixes the open choices and maps the product's situations to its cases, checked with get_pattern. Use when a product wants a Magma pattern narrowed, its own situations answered, or a pattern for a need Magma lacks.
license: MIT
compatibility: A project with @maggioli-design-system/magma installed. Uses the magma MCP server of this plugin.
metadata:
  source: https://github.com/magma-design-system/magma/tree/main/projects/claude-plugin
---

<!-- Generated from projects/claude-plugin/templates/pattern-layer.md by scripts/skills.ts: edit the template. -->

# Adapt a Magma pattern to this product

What to adapt, if given with the command (a pattern, a need, a choice of the product): $ARGUMENTS.

A layer narrows, it never overrides: the "Always true" rules and the cases of a pattern are the same in every product. The format is the section "A product's layer" of the patterns guide: `get_guide` patterns, section "A product's layer".

Nothing is written before the person has seen it rendered: each choice with its options side by side, each case of a pattern of the product, each component proposed to Magma, with `render_preview` on the real components, as `get_guide` mcp, section "Show the person what you mean", says. A correction is rendered and shown again before anything else is asked.

## 1. The pattern

`get_pattern` with the need in words, or with the id if the person named one; then `get_pattern` with the id for the whole pattern: its variables, cases, "Always true" rules, open choices (each with its `default` and what a product `may`) and situations, with the layer of this project already applied if there is one (`layers`).

- A candidate, or no pattern for the need: there is nothing to narrow. Go to step 5.
- A layer already exists (the file the answer names in `layerFile`): change that file, never write a second one.

## 2. What the product decides

Ask the person, one question at a time, with the Magma default as the recommended answer, each question with its render:

- for each open choice: keep the default, or a value within what it `may`. Render the case the choice changes (`render_preview` with `pattern` and `case`), then the same markup with the value the product would take, side by side, the default first. A choice no image shows (a duration, a text read by a screen reader) is asked in words, and said so;
- the situations of the product this pattern should answer, in the product's words. For each one, `get_pattern` with the id and the values of its variables: the case it returns is the one the situation maps to; render it with the texts of the product and let the person confirm it. When the answer lists `missing` variables, ask them.

A wish that changes an "Always true" rule, a case, or a choice the pattern does not leave open is not a layer: say so, and propose an issue on Magma (`get_guide` reporting); write it only once the person agrees.

## 3. The file

Once the person has confirmed every choice and situation on its render, write the file the answer of step 1 names in `layerFile` (`magma/patterns/<id>.md` of the project, which may be a folder below the one you work in): `id` and `extends: magma:<id>` of the Magma pattern, `layer` with the name of the product, `narrows` with the choices that differ from the default, `situations` with the cases they map to. In the body, under `## Why`, one line per choice with its reason and today's date: the history whoever changes it next reads first.

## 4. The check

- `get_pattern` without arguments: `layerErrors` lists what is wrong in `magma/patterns/`. Fix the file until it lists nothing for it; a layer with an error is not applied, and the answers stay Magma's default.
- `get_pattern` with the id: each choice the layer fixes carries `narrowed-by`, each situation it adds carries `layer`.
- `get_pattern` with the id and the values of one situation of the product: the case is the one the layer maps it to.

## 5. A need Magma does not cover

Tell the person no Magma default covers it. Before anything else, the components that hold the role the need asks (a field, a target to drop files on, a bar of actions): `find_component` with the need in words, `get_component` and `get_usage` for each, and `render_preview` of it in the context of the flow (inside a card, a row, a dialog). Then say which of these holds:

- a component does the job as it is: the pattern of the product stands on it, and adds nothing it already does;
- a component holds the role, but not as the flow needs (it does not fit the context, or breaks a rule of the design language or of accessibility): that component is the issue to propose, with what the render showed; never build a second way to do what it does;
- an existing, simpler way already meets the need: use it, and write no pattern;
- no component holds the role: the component is missing too, and comes as a proposal. Write a prototype of it, plain markup with the components Magma has, the element that stands in for it marked `data-prototype="<the tag you propose>"`, render it in the context of the flow and let the person correct it; then its proposal (intent, why no component holds the role, API with props, slots and events, what it is built on, accessibility): `get_guide` reporting, section "A component Magma lacks".

Propose the issue on Magma (`get_guide` reporting, a flow no pattern covers), naming the components you checked and what you found, with the proposal of the missing component, if any, and the image of its prototype. If the product cannot wait, offer a pattern of its own in the same folder (`layerDir` of `get_pattern` without arguments): the shape of a Magma pattern (read one in `node_modules/@maggioli-design-system/magma/agents/patterns/`), its own `layer`, no `extends`, never an id Magma has. Before writing a case of it, render its markup as the product would write it, in the context of the flow, and the options of each decision side by side; write the case once the person has confirmed what they saw. A case that waits on a missing component uses its prototype meanwhile and names the issue. Then the check of step 4, which holds it to the format, the cases and the components of this release. A pattern that comes back in two or three products is the one to propose to Magma.

## 6. The report

The file written, the choices it fixes and the situations it adds, the renders the person confirmed them on, what the check said, and the issues proposed to Magma. Commit nothing unless the person asks to: the layer is the team's, review it as code.
