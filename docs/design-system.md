# The project's design system

The principles never name a component: how a piece is built is the call of the project's design system. So the design skills ask it before they build, judge or record anything. When the design system ships tools for agents, they ask it through those tools, which answer from the version installed in the project. A guide read by hand answers from whatever the agent remembers of it. This file says how `design-build`, `design-audit`, `design-reframe` and `design-interview` find the design system, how they make sure its tools are in the session, and what they do with a piece it has nothing for.

Why it exists: on 2026-11-24 a build went on with the guides alone, because the plugin of the design system was on the machine but not enabled for the project. It made a card, a tile and a badge by hand where the design system had components for them, and the person was not told.

## 1. Find it

Find it from the project, never from memory or from the conversation alone:

- the dependencies of the project's manifests (`package.json`, and those of its workspaces in a monorepo; the equivalent manifest in another ecosystem): a package of a design system, the company's or a public one;
- its docs and its instructions for agents (`CLAUDE.md`, `AGENTS.md`), when they name one;
- its own folder of shared components, when the design system lives in the project.

Then read what it ships for agents from the installed package and its docs, never guessed: an MCP server (a `bin` of the package, or a server its README documents), a Claude Code plugin and its skills, guides for agents. For example, a project on Magma has a `@maggioli-design-system/*` dependency. The package ships the `magma-mcp` server, and the `magma@magma` plugin adds the `magma:ui`, `magma:pattern-layer` and `magma:review` skills.

Say in one line which design system it is, its installed version and the tools it ships. When the project is the design system itself, its source and its docs give the answers, and the tools it ships are checked as below.

With no design system, the existing equivalents in the codebase are the system (Consistency Over Uniformity, With a design system), and DS1 does not apply.

## 2. Its tools in the session

A tool is loaded when it is in the session: the server's tools are in the list of tools, and the plugin's skills are in the list of skills. A deferred tool counts once the host's tool search finds it. A server or a plugin that is on the machine but not enabled for this project is not loaded.

When the design system ships tools for agents and they are not all loaded, stop:

- `design-build`: before writing any code;
- `design-audit`: before the checks;
- `design-interview` and `design-reframe`: before recording a pattern or a block by id.

Then tell the person three things:

- **What is missing**: the server, the plugin, and which skills.
- **What it would give**, as the design system's docs say. Typically: the components and their APIs in the installed version, the patterns and the building blocks by id, and a review or lint of what is written before it is saved.
- **How to enable it**, and who each way reaches:
  - **For the person, in every project**: the plugin at user scope (`claude plugin install <plugin>@<marketplace> --scope user`).
  - **For everyone on the project**: the project's committed `.claude/settings.json` (`--scope project`). It changes the repository, so it is the team's call.
  - **For the person, in this project only**: the personal `.claude/settings.local.json` (`--scope local`), which is never committed.

  A server alone, with no plugin, is added the same three ways (`claude mcp add --scope user|project|local`).

Then ask: enable it, and which way, or go on with the guides only. Wait for the answer. Nothing is enabled without the person's yes, because it changes their settings. A plugin or a server enabled now may load only in a new session: say so. The step is done once its tools are in the session.

Going on with the guides only is the person's choice, never a silent fallback. Read the guides and docs of the design system from the installed package (in `node_modules`, not from memory). Then say in the hand-over that the components were found by reading, not asked for through the tools.

A design system that ships no tools for agents has nothing to stop for: its docs and the codebase are the source.

## 3. A component for every piece

Before writing the markup of any piece of the UI (a card, a tile, a badge, a list, a header, an empty state, a field), ask the design system through its tools for a component, a building block or a pattern with that purpose. Use what it has as designed, with its own slots, variants and tones. Never build a structure that goes around them, such as:

- markup that looks like one of its components;
- a wrapper that restyles one;
- a component of the codebase that does the job of one of its own.

A piece built without one is a **gap**, never filled silently. Report each gap in the hand-over with three things:

- **The piece**, and where it is (the file and the line).
- **What was asked** of the design system, and what it answered: nothing with that purpose, or something close that does not fit, and why.
- **The resolution proposed**, one of the three in the object model's Conflicts (`object-model.md`, section 8):
  - **The method adapts**: what the design system has is right, so the piece is rebuilt with it, and the request or the model changes.
  - **The design system changes**: a new id (a component, a block, a pattern) or a change to an existing one. It is proposed as an issue on the design system's repository, opened only on the person's yes.
  - **The product decides**: the piece stays in the product only, in the product's own pattern layer (Magma: `/magma:pattern-layer`), not as loose markup in a page.

Until the person chooses, the piece stays as close to the design system as it allows: its tokens, and its nearest component. A gap in a view that has an object model also goes to the model's Conflicts.

## 4. The check

**DS1** · must · code. Is every piece of the UI built or changed made with the design system's component, building block or pattern for its purpose, used as designed? Is every piece made without one reported as a gap with its proposed resolution?
Verify:

1. List the pieces that are not components of the design system: elements styled by hand, and components of the codebase that do the job of one of its own.
2. For each one, find the design system's answer. When it ships tools for agents, the answer comes through them. It comes from its guides only when the person chose to go on with the guides (step 2).
3. Find the gap in the report.

A piece with no component and no reported gap fails. So does an answer taken from the guides when the tools were missing and the person was not asked. A gap the person already resolved passes: an issue open on the design system, or a pattern in the product's own layer.

`design-build` runs DS1 before handing over, and `design-audit` runs it on its target. Without a design system, it does not apply.
