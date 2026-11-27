---
name: migrate
description: Migrate a project from Magma 1 to Magma 2 with the official codemod - dry run, its report, the write on a clean git tree, then what the build and the lint report. Use when asked to upgrade or migrate from Magma 1, or when code uses names Magma 2 no longer has.
license: MIT
compatibility: A project in git with Magma 1 code. Runs the codemod with npx.
metadata:
  source: https://github.com/magma-design-system/magma/tree/main/projects/claude-plugin
---

<!-- Generated from projects/claude-plugin/templates/migrate.md by scripts/skills.ts: edit the template. -->

# Migrate from Magma 1 to Magma 2

The folders to migrate, if given with the command: $ARGUMENTS. Without them, the sources of the project (`src`).

## 1. Prepare

1. Check the installed version of `@maggioli-design-system/magma` in `package.json`. The codemod rewrites code; the packages are upgraded with the setup of Magma 2 (`/magma:setup`), before or after the rewrite.
2. Make sure the git tree is clean: the codemod writes in place, and `git checkout` is the undo.

## 2. Dry run

```bash
npx @maggioli-design-system/magma-codemods --path src --report-md magma-migration.md
```

`magma-codemods` prints a diff and a summary and writes nothing by default. Read `magma-migration.md`: the decisions it cannot take alone (a raw colour with no single role, a removed prop) are listed by token and by file.

## 3. Write

```bash
npx @maggioli-design-system/magma-codemods --path src --write --accept-semantic=exact
```

`--accept-semantic=exact` also writes the raw palette classes whose role has the same value; `--accept-semantic=near` the near ones too, to review one by one. Angular external templates need `--framework angular`. Run `npx @maggioli-design-system/magma-codemods --help` for every option.

## 4. Finish

1. Resolve the decisions of the report by hand: `suggest_role` of the magma server gives the role of a colour, `get_component` the props of a component.
2. Build the app, run the Magma lint, and fix what they report (`/magma:review` checks the result).
3. Report what the codemod changed, the decisions taken by hand, and what is left.
