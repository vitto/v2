# v2

Vittorio Vittori’s design principles for AI agents: a skill and an MCP server that tell an agent which ones apply to what it builds, across UX, design systems and AI, then check the result.

v2 is V twice, for Vittorio Vittori. It is also my second version: the one that works inside an agent, with the principles I apply when I design.

## Status

Pilot. Three of the principles on [vittoriovittori.com](https://vittoriovittori.com), one per section; the others follow as I rewrite them on the site. The skills are here; the MCP server comes once the format has been tested on real builds.

## What it does

- **Before building**, the agent finds the principles that apply to the task, across sections: a form that sends AI-generated text needs both Error Prevention and Design for Uncertainty.
- **While building**, it follows their rules and asks the project's design system for the patterns, instead of inventing them.
- **Before handing over**, it runs their checks and reports each one as pass, fail or not verifiable.

## Install in Claude Code

```
/plugin marketplace add vitto/v2
/plugin install v2@v2
```

`design` loads by itself when Claude builds or changes a UI. `/v2:audit <target>` reviews a screen, a component or a change.

## With a design system

The principles say what must be true for the people using the interface and never name a component, so they work with any design system and do not compete with its guidance. When the design system has its own plugin or MCP server, such as [Magma](https://github.com/magma-design-system/magma)'s, use both: the design system says how, v2 says what must hold. When they disagree, the agent follows the design system and reports the difference.

## Where the principles come from

Each principle has a page on the site with its description, its sources and an interactive example for each rule. The files in [`principles/`](principles/) hold what an agent needs: when the principle applies, its rules and its checks. They join the site by id, and each rule links to its example. The format is described in [`principles/README.md`](principles/README.md); [`docs/pilot-audit.md`](docs/pilot-audit.md) is the first audit made with it.

## License

[MIT](LICENSE)
