---
name: setup
description: Bring the Magma design system (@maggioli-design-system) into a project - the package of its framework (web components, React, Angular), the bootstrap of the installed AGENTS.md, the check. Use when asked to install, add or set up Magma, or to fix a Magma setup that does not work.
license: MIT
compatibility: A Node.js project with npm, pnpm or yarn. Uses the magma MCP server of this plugin once Magma is installed.
metadata:
  source: https://github.com/magma-design-system/magma/tree/main/projects/claude-plugin
---

<!-- Generated from projects/claude-plugin/templates/setup.md by scripts/skills.ts: edit the template. -->

# Set up Magma in this project

Arguments given with the command, if any (a framework, a folder): $ARGUMENTS. Without them, detect the framework and work in the project's root.

## 1. Pick the target

Read `package.json` and the sources. One package per target:

| Target | Package |
| --- | --- |
| Plain HTML / vanilla JS | `@maggioli-design-system/magma` |
| React / Next.js | `@maggioli-design-system/magma-react` |
| Angular >= 20 | `@maggioli-design-system/magma-angular` |

Ask the person only what detection leaves open (which framework, when several are present).

## 2. Install, then follow the installed bootstrap

1. Install the package of the target with the project's package manager (React and Angular install `@maggioli-design-system/magma` too).
2. Open the `AGENTS.md` of the installed package (`node_modules/@maggioli-design-system/<package>/AGENTS.md`) and follow its steps 1 to 4: they are the bootstrap of this version (the version matrix, styles in their cascade-layer order, fonts, icons, registration, editor autocomplete, the lint, the MCP server). Do not set Magma up from memory: the installed guide is the source.
3. This plugin already runs here, so the bootstrap asks nothing about it (its step 3.7), and it starts the MCP server: write no `.mcp.json` entry for Claude Code. Unless the project keeps `.claude/` out of git, declare the plugin for the team in the committed `.claude/settings.json`, merged into what is there:

```json
{
  "extraKnownMarketplaces": {
    "magma": { "source": { "source": "github", "repo": "magma-design-system/magma" }, "autoUpdate": true }
  },
  "enabledPlugins": { "magma@magma": true }
}
```

   That file downloads the plugin for nobody: each colleague installs it once per clone (`claude plugin install magma@magma --scope project`), and the Magma block the bootstrap writes into the project's `AGENTS.md` (its step 3.8) makes their agent propose it. Write the `.vscode/mcp.json`, `.cursor/mcp.json` or `opencode.json` entry of `agents/mcp.md` only for the people of the team who use those clients.

## 3. Check

1. The magma MCP server of this plugin has its tools only once Magma is installed: when it was not at the beginning of the session, the server started with none, so reconnect it (`/mcp`).
2. Call its `check_setup` tool and fix what it reports, each item with the guide it names.
3. Build the app and confirm that an `mds-*` component renders and that the icons it names load.
4. Report what was installed, the cascade order used, the icon route and path, and the lint and MCP configuration.
