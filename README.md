# v2

Vittorio Vittori's design principles for AI agents: a skill and an MCP server that tell an agent which ones apply to what it builds, across UX, design systems and AI, then check the result. Around them, the workflow the work goes through: where it stands, how to see and test it, and the merges a person approves; and, once it ships, how to tell people about it.

v2 is V twice, for Vittorio Vittori. It is also my second version: the one that works inside an agent, with the principles I apply when I design.

## Status

Pilot. Three of the principles on [vittoriovittori.com](https://vittoriovittori.com), one per section; the others follow as I rewrite them on the site. The skills are here; the MCP server comes once the format has been tested on real builds.

The workflow skills generalize the epic workflow of [magma-design-system/magma#1320](https://github.com/magma-design-system/magma/pull/1320) to any GitHub repository; their first project is the site itself, [vitto/home](https://github.com/vitto/home).

## Skills

### Design principles

| Skill | Say | What it does |
|-------|-----|--------------|
| `design` | loads by itself | Which UX, design system and AI design principles apply to the UI being built, the rules to follow, the checks to run before handing over. |
| `/v2:audit <target>` | "audit", "review the UX" | Audits a screen, a component or a change against the principles: every check as pass, fail or not verifiable. |

### Workflow

| Skill | Say | What it does |
|-------|-----|--------------|
| `/v2:status [epic]` | "stato", "a che punto siamo" | Where the work stands, as tables: an epic in the order its work lands, or the repository (open epics, open pull requests, local worktrees with work GitHub has not seen), then the next action. Only reads. |
| `/v2:test [epic or PR]` | "testa", "fammi vedere" | Shows the work: the local preview of an epic (its open parts merged together, never pushed) or the worktree of a branch; installs, builds and serves it with the project's commands; lists the pages to test (Title, What to test, URL). |
| `/v2:merge <PR>` | "ok #N", "mergia" | Carries out the merge of one pull request the person approved by naming it, after checking again that nothing holds it. Never `--auto`, `--admin`, `--squash` or `--rebase`. |

### Sharing the work

`/v2:share-to-linkedin` reads what the product is from the product itself, looks at it at 1080x1350, writes a scene of three to five moments, checks each step with a probe, records the take, checks it on a contact sheet, and writes the post. Then the person posts it by hand, or approves it and the skill publishes it, now or at a moment it suggests.

The recording is [scripts/linkedin-video.ts](scripts/linkedin-video.ts): headless Chrome over the DevTools Protocol, real input events, the pointer and the captions drawn in the page, ffmpeg for a 30 fps H.264 video. Its header says how, its `Take` interface is what a scene drives the product with, and [examples/share-to-linkedin/magma-studio.mjs](examples/share-to-linkedin/magma-studio.mjs) is a complete scene: the video of Magma Studio.

```bash
node scripts/linkedin-video.ts --scene=<scene.mjs> --probe --out=probe
node scripts/linkedin-video.ts --scene=<scene.mjs> --lang=en --name=<product> --out=out
```

It needs Google Chrome or Chromium (or `CHROME` naming another) and `ffmpeg` with `ffprobe`, besides Node 24.

### Publishing on LinkedIn

[scripts/linkedin-post.ts](scripts/linkedin-post.ts) publishes a post with a native video through LinkedIn's official API (the Videos API, then the Posts API), only with the words of the person naming that post. Its dry run checks the video, the cover, the text, the visibility, the time and the account, and gives the post an id, a fingerprint of all of them: the approval names the id ("pubblica 3f9a2c1d"), so it covers exactly what the person saw, once. Anything changed makes another id.

**When.** `--suggest` gives the next good moments for the audience's time zone: working days, Tuesday to Thursday first, mid-morning, then mid-afternoon, and Italy's public holidays skipped for Europe/Rome. They follow what the studies of LinkedIn engagement of 2026 agree on; they are a suggestion, not a measure of your audience. LinkedIn's API publishes at once and cannot schedule, so a post scheduled waits on this Mac: with the approval the video is uploaded and processed, and a one-shot launchd job creates the post at its minute. The Mac must be on and awake then; more than 30 minutes late, nothing goes out and a notification says so. `--queue` lists the scheduled posts, `--cancel=<id>` cancels one.

**The setup, once, by you** (macOS):

1. At [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps), create an app (LinkedIn asks for a LinkedIn Page to associate with it).
2. In its **Products** tab, add **Share on LinkedIn** (it grants `w_member_social`, to post as you) and **Sign In with LinkedIn using OpenID Connect** (`openid`, `profile`: who you are).
3. In its **Auth** tab, add `http://localhost:8723/callback` to the **Authorized redirect URLs** (another port: pass the same `--port=` to `linkedin-auth.ts`).
4. Put its **Client ID** and **Primary Client Secret** in the Keychain. Each command asks for the value, hidden, so it never lands in a file, the shell history or a conversation:

   ```bash
   security add-generic-password -s v2-linkedin -a client-id -w
   security add-generic-password -s v2-linkedin -a client-secret -w
   ```

5. Sign in: `node scripts/linkedin-auth.ts` opens LinkedIn in your browser; you sign in and allow the app there. The token goes to the Keychain (`v2-linkedin`, account `token`) and lasts 60 days, after which you sign in again (LinkedIn gives a self-serve app no refresh token); `--status` says until when, `--sign-out` removes it.

## Development

```bash
npm test
```

- `node:test`, no dependency. The preview, the worktrees and the configuration are tested on real git repositories in a temporary folder (with a bare repository as origin); the merge end to end with a `gh` of the specs first on the `PATH`, which records what it is asked to run.
- Only erasable TypeScript (Node strips the types): no `enum`, no `namespace`, imports with their `.ts` extension and `import type` for types. [tsconfig.json](tsconfig.json) serves the editor and a type check (`tsc -p .` with `@types/node`).
- The files of the workflow are English and ASCII. Every answer of a script is Markdown tables, and its header says where each answer comes from.
- The recorder of `/v2:share-to-linkedin` is specified on its pure parts (the frames of a take and its cuts, the easing of a move); the take itself needs Chrome and ffmpeg, so it is checked by recording the example scene.
- The publisher is specified with no network: the requests of the sign-in, the Videos API and the Posts API, made against a `fetch` of the specs that records them; the text in LinkedIn's little text format; the id and the words that approve it; the checks; the suggested moments; the job of a scheduled post. A real post needs the person's account, so it is checked by publishing one, approved.
- `claude plugin validate . --strict` checks the manifests.
- The same `npm test` runs on every pull request and on `main`, in [.github/workflows/test.yml](.github/workflows/test.yml): it is the check `/v2:merge` waits for.

### Layout

```
.claude-plugin/   marketplace.json (the marketplace) and plugin.json (the plugin)
.github/          the workflow that runs the specs
skills/<name>/    one folder per skill: SKILL.md
principles/       the principles, one file each, by section of the site
docs/             the pilot audit
scripts/          one script per job of the workflow, and its spec beside it
scripts/lib/      what the scripts share: git and gh, the configuration, the epic, the worktrees
examples/         the .claude/v2.json of real projects; the scene of a LinkedIn video
schema/           the JSON Schema of .claude/v2.json
GOVERNANCE.md     the rules of the workflow
```

### Adding a skill

A skill is a folder `skills/<name>/SKILL.md` (invoked as `/v2:<name>`): its description says what it does, when to use it, and the Italian words that call it. A script it needs goes in `scripts/` with its spec, reads through `scripts/lib/`, and is called as `node ${CLAUDE_PLUGIN_ROOT}/scripts/<script>.ts`. Next planned: `ui`, the practices of UI and design systems beside `design` and `audit`, with vitto/home as its first project. The MCP server will go in a `.mcp.json` at the root of the plugin.

## License

[MIT](LICENSE)
