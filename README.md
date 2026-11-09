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

| Skill | Say | What it does |
|-------|-----|--------------|
| `/v2:share-to-linkedin <url> [description]` | "post per linkedin", "video per linkedin", "pubblica su linkedin" | Shares a product on LinkedIn: a short video of the live product (1080x1350, captions, a pointer that really clicks, a closing card), recorded from a scene written for it, and the text of the post that carries it. Asks for the description only when the product does not say it. Publishes the post through LinkedIn's API, now or at a suggested moment, only once the person approves that post by naming it. |

## What it does

- **Before building**, the agent finds the principles that apply to the task, across sections: a form that sends AI-generated text needs both Error Prevention and Design for Uncertainty.
- **While building**, it follows their rules and asks the project's design system for the patterns, instead of inventing them.
- **Before handing over**, it runs their checks and reports each one as pass, fail or not verifiable.
- **Around the work**, it says where an epic or a repository stands, builds a preview to test the parts together, lists the pages to open, and merges only what the person approved, by the rules of [GOVERNANCE.md](GOVERNANCE.md).
- **Once it ships**, it tells people: a video of the live product and the post that carries it, published on LinkedIn when the person approves it.

## Install in Claude Code

```
/plugin marketplace add vitto/v2
/plugin install v2@v2
```

`design` loads by itself when Claude builds or changes a UI. `/v2:audit <target>` reviews a screen, a component or a change. To try a local copy for one session without installing it: `claude --plugin-dir /path/to/v2`.

A new version reaches an installed plugin only when `version` in [.claude-plugin/plugin.json](.claude-plugin/plugin.json) changes: bump it with each release.

## With a design system

The principles say what must be true for the people using the interface and never name a component, so they work with any design system and do not compete with its guidance. When the design system has its own plugin or MCP server, such as [Magma](https://github.com/magma-design-system/magma)'s, use both: the design system says how, v2 says what must hold. When they disagree, the agent follows the design system and reports the difference.

## Where the principles come from

Each principle has a page on the site with its description, its sources and an interactive example for each rule. The files in [`principles/`](principles/) hold what an agent needs: when the principle applies, its rules and its checks. They join the site by id, and each rule links to its example. The format is described in [`principles/README.md`](principles/README.md); [`docs/pilot-audit.md`](docs/pilot-audit.md) is the first audit made with it.

## The workflow

The rules every workflow skill follows are in [GOVERNANCE.md](GOVERNANCE.md): a person decides every merge, naming the pull request (rule 1); parts go into the branch of their epic, the epic into the default branch (rule 2); branches start from issues (rule 3); sync, test, then push (rule 4); the local preview is never pushed (rule 5).

### What it needs

- Node 24 or later (the scripts are TypeScript run by Node as it is, with no build and no npm dependency);
- git, and [gh](https://cli.github.com) signed in to GitHub;
- a GitHub repository. Epics are issues with [sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues); the order of their parts comes from the "blocked by" dependencies.

Everything else is optional, per project, in `.claude/v2.json`.

### Per project: `.claude/v2.json`

Without the file every workflow skill works from git and GitHub alone. The file adds what they cannot know: how the project merges, installs, builds and serves, and where its changes show. The scripts check it and name any wrong key; [schema/v2.schema.json](schema/v2.schema.json) describes it for an editor. When a worktree or the preview has no file of its own, the one of the main worktree is used, so the file may stay uncommitted.

| Key | What | Default |
|-----|------|---------|
| `merge.method` | `merge` (a merge commit) or `queue` (the merge queue of the default branch) | the queue when GitHub has one, else `merge` |
| `merge.blockingWorkflows` | workflows whose unfinished runs hold every merge into the default branch: `"publish.yml"` or `{ "workflow": "publish.yml", "event": "workflow_dispatch" }` | none |
| `preview.dir` | the folder of the preview of an epic: `{main}` the main worktree, `{repo}` its name, `{epic}` the number | `{main}-wt-{epic}-preview` |
| `preview.install` | the install command, run once | none |
| `preview.installed` | what the install creates (when missing, the install is due) | `node_modules` |
| `preview.build` | the build commands, in order | none |
| `preview.serve` | the servers: `{ "name", "url", "command", "cwd" }`, on ports other than the person's checkout | none |
| `pages` | where a change shows: a list of rules, below | none |
| `ignoreCommits` | commit subjects with nothing to test (regular expressions) | `["^chore\\(release\\)"]` |

#### Pages to test

A changed file goes to the first rule that takes it; whatever no rule takes is listed under "no page in the browser", so no change goes unseen. Patterns are relative to the root of the repository: `**` any folders, `*` and `?` within a folder, `{a,b}` alternatives, `{name}` a capture.

| Rule | Takes | Links |
|------|-------|-------|
| `{ "type": "storybook", "server", "root", "groups" }` | files under `root`: a folder of `groups` (`src/components/{component}/**`) makes one row; a file that is an entry of the index makes its own | the docs page and stories of the running Storybook's `index.json` whose `importPath` is in the folder; no address is guessed without the index |
| `{ "type": "static", "server", "files", "path" }` | the files of `files` | one page per file: `path` filled with the captures (`src/pages/{page}.astro` and `/{page}`); a last segment `index` is the folder; a deleted page is said so |
| `{ "type": "static", "server", "files", "links", "title", "note" }` | the files of `files` | the same `links` for all of them (shared components, styles) |
| `{ "type": "command", "server", "files", "command" }` | the files of `files` | what the project's command prints: it runs with `sh` in the root of the checkout, gets `{ files, base, head, url }` as JSON on its input, and prints `[{ "title", "links": [{ "label", "url" }], "note" }]` (a URL starting with `/` is on its server) |

Two complete examples:

- [examples/home.v2.json](examples/home.v2.json): an Astro site (vitto/home); pages by file path, the shared parts of the site to the main pages, the dev server on port 4411;
- [examples/magma.v2.json](examples/magma.v2.json): a design system; the merge queue and its release workflow, Storybook entries by component, the studio pages through a command that reads the routes of the studio, previews by file path.

### The scripts

The workflow skills run them; they also run by hand, from the folder of the project. Each one says in its header where every answer comes from.

| Script | What | Changes |
|--------|------|---------|
| `node scripts/status.ts [epic] [--branch=] [--repo=] [--config=]` | the epic table, or the repository | nothing |
| `node scripts/preview.ts <epic> [--branch=] [--dir=] [--repo=] [--config=]` | rebuilds the local preview of the epic | only the preview folder and its local branch; it refuses to run over work of its own |
| `node scripts/pages.ts [--base=] [--head=] [--<server>=<url>] [--config=]` | the pages to test what changed | nothing |
| `node scripts/merge.ts <pr> [--approved="<words>"] [--repo=] [--config=]` | checks a merge; with the person's words naming the pull request, carries it out | the merge, only then |
| `node scripts/linkedin-video.ts --scene=<file> [--lang=] [--name=] [--out=] [--probe]` | records the video of a scene, its contact sheet and its cover (Sharing the work) | only the files of `--out` |
| `node scripts/linkedin-auth.ts [--status] [--sign-out] [--port=]` | signs the person in to LinkedIn in their browser, or says until when they are | the token in the Keychain |
| `node scripts/linkedin-post.ts --video= --cover= --text= --visibility= --at= [--zone=] [--title=] [--approved="<words>"]` | checks a post and gives its id; with the person's words naming that id, publishes it or schedules it. `--rehearse` goes to LinkedIn and stops before the post; `--suggest`, `--queue`, `--cancel=<id>` | the post on LinkedIn, only then; a scheduled post's job on this Mac |

The skills let Claude Code run `status`, `preview` and `pages` without asking; `merge.ts`, `linkedin-auth.ts` and `linkedin-post.ts` always ask for permission, a second gate after the person's ok.

The status of an epic matches, table and next action, what `nx run magma:epic.status` prints for the same epic in Magma.

## Sharing the work

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

1. At [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) (**My apps**), **Create app**: a name (it shows when you authorize it), a LinkedIn Page, a square logo of 100 pixels or more. The app stays tied to its Page for good: a company Page of your own (**Create a new LinkedIn Page** in the form), never your employer's, whose admins would have to approve it. The Page only owns the app: the posts are yours, as `w_member_social` posts for the member who signs in.
2. In the **Products** tab of the app (the row of tabs under its name, not **Products** of the top bar, which is a catalogue), **Request access** for **Share on LinkedIn** (it grants `w_member_social`, to post as you) and **Sign In with LinkedIn using OpenID Connect** (`openid`, `profile`: who you are). Both must be under **Added products**; the **Auth** tab then lists their scopes under **OAuth 2.0 scopes** ("No permissions added" means none is there yet).
3. In its **Auth** tab, add `http://localhost:8723/callback` to the **Authorized redirect URLs for your app**, exactly (another port: pass the same `--port=` to `linkedin-auth.ts`).
4. Put its **Client ID** and **Primary Client Secret** in the Keychain. Each command asks for the value, hidden, so it never lands in a file, the shell history or a conversation:

   ```bash
   security add-generic-password -s v2-linkedin -a client-id -w
   security add-generic-password -s v2-linkedin -a client-secret -w
   ```

5. Sign in: `node scripts/linkedin-auth.ts` opens LinkedIn in your browser; you sign in and allow the app there. When LinkedIn refuses it, the script says why: a redirect URL that does not match step 3, or a scope whose product step 2 has not added yet (it names the product). The token goes to the Keychain (`v2-linkedin`, account `token`) and lasts 60 days, after which you sign in again (LinkedIn gives a self-serve app no refresh token); `--status` says until when, `--sign-out` removes it.
6. Try it without publishing: the command of a post with `--rehearse` and no `--approved` goes all the way to LinkedIn and stops before the post. It checks your sign-in, uploads the video and its cover (they stay on LinkedIn in no post, seen by nobody), waits until LinkedIn has processed them, and prints the post it would send. With `--at=` a time a few minutes ahead, it also schedules the job of this Mac, which at that minute checks again and stops before the post; a notification says how it went.

   ```bash
   node scripts/linkedin-post.ts --video=<mp4> --cover=<png> --text=<txt> --visibility=CONNECTIONS --at=now --rehearse
   ```

## Development

```bash
npm test
```

- `node:test`, no dependency. The preview, the worktrees and the configuration are tested on real git repositories in a temporary folder (with a bare repository as origin); the merge end to end with a `gh` of the specs first on the `PATH`, which records what it is asked to run.
- Only erasable TypeScript (Node strips the types): no `enum`, no `namespace`, imports with their `.ts` extension and `import type` for types. [tsconfig.json](tsconfig.json) serves the editor and a type check (`tsc -p .` with `@types/node`).
- The files of the workflow are English and ASCII. Every answer of a script is Markdown tables, and its header says where each answer comes from.
- The recorder of `/v2:share-to-linkedin` is specified on its pure parts (the frames of a take and its cuts, the easing of a move); the take itself needs Chrome and ffmpeg, so it is checked by recording the example scene.
- The publisher is specified with no network: the requests of the sign-in, the Videos API and the Posts API, made against a `fetch` of the specs that records them; the text in LinkedIn's little text format; the id and the words that approve it; the checks; the suggested moments; the job of a scheduled post. A real post needs the person's account: `--rehearse` checks all of it but the post itself, and a first post approved checks the rest.
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
