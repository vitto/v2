# v2

Vittorio Vittori's design principles for AI agents: a skill and an MCP server that tell an agent which ones apply to what it builds, across UX, design systems and AI, then check the result. Around them, the workflow the work goes through: what it is made of, where it stands, how to see and test it, and the merges a person approves; and, once it ships, how to tell people about it.

v2 is V twice, for Vittorio Vittori. It is also my second version: the one that works inside an agent, with the principles I apply when I design.

## Status

Pilot. Three of the principles on [vittoriovittori.com](https://vittoriovittori.com), one per section, and the drafts of two more, Visual Composition and Accessibility as a Baseline, whose checks ask instead of failing until the decisions taken in real work confirm their rules; the others follow as I rewrite them on the site. The skills are here; the MCP server comes once the format has been tested on real builds.

The workflow skills generalize the epic workflow of [magma-design-system/magma#1320](https://github.com/magma-design-system/magma/pull/1320) to any GitHub repository; their first project is the site itself, [vitto/home](https://github.com/vitto/home).

## Skills

### At a glance

Every skill: what it is for, the words that call it without the command, and what it takes (`<required>`, `[optional]`, the rest said in words). The tables after this one say more about each.

| Skill | For | Say | Options |
|-------|-----|-----|---------|
| `/v2:design-interview [area] [language]` | Before a new view, page, section, tool or editor: an interview that writes the object model its screens come from, and the context a design must fit (UX, UI, visual), in parts it skips when they do not apply. | "intervista", "modello degli oggetti", "come strutturo questa pagina", "prima di costruire la UI", "da dove parto con la UI" | `area`: what is being built, in words.<br>`language`: the language of the interview (`italiano`, `english`, any other); without it, the one you write in.<br>The format of the questions, in words: asked first when not said (the questionnaire in chat, a Markdown file, a Google Doc, Sheet or Form).<br>Call notes or documents attached to the message are read first. |
| `/v2:design-build` | While building or changing UI: the principles that apply, their rules, the checks before handing over, the visual ones on the page as drawn. | none: it loads by itself when Claude builds or changes a UI | None. Text after the command is read with the task. |
| `/v2:design-reframe <request>` | When a request adds to an existing flow or view: places it in the object model first, then says which views are patched or rebuilt. | "aggiungi anche", "vorrei che questa parte facesse anche", "ripensiamo il flusso", "reframe", "non capisco più questa vista" | `request`: what to add or change, in words.<br>Attached notes are placed against the model first. |
| `/v2:taxonomy [area, word or conflict]` | Keeps a project's words consistent: a register in its glossary, each conflict resolved with the lightest move, the hierarchy checked against the data. | "tassonomia", "glossario", "registro dei termini", "come lo chiamiamo", "due parole per la stessa cosa", "questa parola vuol dire due cose", "rinomina" | One, in words: the area, the word or the conflict to start from. |
| `/v2:design-audit <target>` | Audits something already built against the principles and the object model: every check pass, fail or not verifiable, then a Summary of where to start and whether the view does its job. | none in Italian: it loads when asked to review, audit or check the UX or UI of something built | `target`: a page, a component, a folder or the current diff; asked for when missing. |
| `/v2:work-map [mode] [target]` | What a piece of work is made of, before or after it: a diagram, then the same in words. | "mappa", "mappa della lavorazione", "diagramma", "schema", "fammi vedere cosa cambia", "cosa stiamo per fare", "cosa abbiamo fatto", "mappa del glossario", "gerarchia dei concetti" | `planned`: work still to do, from the plan, an issue or the parts of an epic.<br>`done`: work that exists, from its diff, compared with its plan.<br>`glossary`: the hierarchy of the project's taxonomy register, checked against the data.<br>No mode: `done` when there is work, `planned` otherwise.<br>`target`: an issue, a pull request, an epic, a branch, a worktree (its folder) or the glossary; none: the work of this conversation. |
| `/v2:work-status [epic, issue, PR, branch, worktree or subject]` | Where the work stands, as tables, and the next action. Only reads. | "stato", "a che punto siamo", "come siamo messi" | `epic`: an epic number, for its parts in the order they land.<br>An issue or a PR number, a branch, a worktree: that piece of work alone, what it does in plain words, its state, then its map from `/v2:work-map`.<br>A subject, in words: the summary below for that subject only, the related epics first, then the related issues outside an epic, grouped.<br>None: the repository as a summary (each open epic with its parts not merged yet, the open issues outside an epic grouped by subject, open pull requests, local worktrees). |
| `/v2:work-test [epic or PR]` | Shows the work to test: installs, builds and serves it, then lists the pages to open. | "testa", "fammi vedere", "fammelo provare" | `epic`: a local preview with its open parts merged, never pushed.<br>`PR` or a branch: its worktree; asks before creating one.<br>None: the current folder against the default branch. |
| `/v2:work-merge <PR>` | Merges one pull request you approved by naming it, after checking again that nothing holds it. | "ok #N", "mergia", "mergiala" | `PR`: the pull request number; without it, shows the status and asks which. |
| `/v2:agent-route [effort] [model] [work]` | The model and the effort a piece of work needs, so the cheaper ones do what they can. Called in the middle of a conversation, it continues the work in a new session. | "route", "che modello usi", "quale modello", "impegno basso", "impegno alto", "impegno massimo", "fallo con haiku", "fallo con opus", "risparmia token", "continua in una nuova sessione" | Effort: `minimo` minimal (low in Claude Code), `basso` low, `medio` medium, `alto` high, `massimo` max, the costliest; the English names work too.<br>`auto`, or nothing: chosen by weighing the work.<br>Model: `haiku`, `sonnet`, `opus`, `fable`, or a model of another host; one your plan does not cover needs your yes.<br>`work`: the work, in one line.<br>"qui", "here": called in the middle of a conversation, the work stays in this session. |
| `/v2:share-linkedin <url> [description]` | A short video of a live product as the cover of a LinkedIn article, with its title, its body and the text that shares it; you publish it by hand. | "post per linkedin", "video per linkedin", "annuncio su linkedin", "articolo per linkedin", "pubblica su linkedin", "programma il post" | `url`: the address of the live product.<br>`description`: what the product is, when the product does not say it.<br>In words: the language; a post with the native video instead of the article, published now or at a suggested moment once you approve it by its id. |

### Design principles

| Skill | Say | What it does |
|-------|-----|--------------|
| `/v2:design-interview [area] [language]` | "intervista", "come strutturo questa pagina" | Before a new view, section or tool: an interview that writes the object model its screens come from - the goal, the world and words of the person, the entities and their hierarchy, and for each view its focal entity and how much of the others it shows ([docs/object-model.md](docs/object-model.md)). It also asks the context a design must fit, for UX, UI and visual design, in parts it skips whole when they do not apply ([questions](skills/design-interview/questions.md)); in the language you name (`italiano`, `english`), else in yours. It asks first how you want to answer: the questionnaire here in chat (the question dialog, one topic at a time), a Markdown file to answer later, a Google Doc for a call with the team, a Sheet for several people, a Form for many or for people outside the team ([formats](skills/design-interview/formats.md)). Attached call notes are read first: their items are counted, confirmed, and reported as covered, contradicted or not addressed ([docs/notes-intake.md](docs/notes-intake.md)). |
| `design-build` | loads by itself | Which UX, design system and AI design principles apply to the UI being built, the rules to follow, the checks to run before handing over; a new view starts from the object model. The visual checks run on the page as drawn, measured against the tokens and seen on its screenshots, with two rounds of fixing at most ([docs/rendered.md](docs/rendered.md)). |
| `/v2:design-reframe <request>` | "aggiungi anche", "ripensiamo il flusso" | When a request adds to a flow: places it in the object model first, asks only the new questions, shows which views change and whether each is patched or rebuilt; attached notes are placed against the model first. |
| `/v2:taxonomy [area or word]` | "tassonomia", "come lo chiamiamo" | The words of a project as a register in its glossary: an English ID that never changes, a name per language, what each concept is and is not, where it sits, what names it in code and data. Finds two meanings under one name where they meet, resolves each with the lightest of five moves (declared homonym, qualify, rename, alias, split), and repairs the hierarchy edge by edge against the data ([docs/taxonomy.md](docs/taxonomy.md)). |
| `/v2:design-audit <target>` | "audit", "review the UX" | Audits a screen, a component or a change against the principles and the object model: every check as pass, fail or not verifiable, the visual ones on the page as drawn, with its screenshots in the report. It closes with a Summary: the three defects to start from, whether the view does the job its object model gives it, and what the checks leave out, labelled as opinion. |

### Workflow

| Skill | Say | What it does |
|-------|-----|--------------|
| `/v2:work-map [planned \| done \| glossary] [issue, PR, epic, branch, worktree or glossary]` | "mappa", "fammi vedere cosa cambia" | What the work is made of, before it or once done: a line that sums it up, then a Mermaid diagram of its entities, methods, concepts, axes and what people see, grouped by where they live, colored and shaped by kind, marked new, changed or removed, red where it breaks; then the same in words, the diagram drawn to SVG and a page that holds it, both drawn by the Chrome of the computer so they show where no script runs. A done map is compared with its plan: what was not done, what was not planned. Only reads; it goes into an issue or a pull request only on the person's yes. In glossary mode, the hierarchy of the taxonomy register beside the glossary - contains, is a, refers to - every edge with its source, dashed without one, red where the data contradicts it, split by context. |
| `/v2:work-status [epic, issue, PR, branch, worktree or subject]` | "stato", "a che punto siamo" | Where the work stands, as tables: an epic in the order its work lands, one piece of work (what it does in plain words, its state, then its map), the work on one subject (its epics first, then its issues outside an epic, grouped), or the repository as a summary (each open epic with its parts not merged yet, the open issues outside an epic grouped by subject with a summary above each group, open pull requests, local worktrees with work GitHub has not seen), then the next action. Only reads. |
| `/v2:work-test [epic or PR]` | "testa", "fammi vedere" | Shows the work: the local preview of an epic (its open parts merged together, never pushed) or the worktree of a branch; installs, builds and serves it with the project's commands; lists the pages to test (Title, What to test, URL). |
| `/v2:work-merge <PR>` | "ok #N", "mergia" | Carries out the merge of one pull request the person approved by naming it, after checking again that nothing holds it. Never `--auto`, `--admin`, `--squash` or `--rebase`. |
| `/v2:agent-route [auto \| minimo \| basso \| medio \| alto \| massimo] [model]` | "che modello usi", "impegno alto", "fallo con haiku" | The model and the effort a piece of work needs, so the cheaper ones do what they can: weighs the work (light, standard, heavy), keeps it in the session when its model fits, else runs it in a subagent with the model and the effort it needs. Called in the middle of a conversation, it opens a new session under this one, on the model and the effort the work needs, with the message that continues it. Without arguments, all automatic. Never switches the model of the session: the cache holds for one model. Never uses a model or a service billed per use beyond the person's plan without their yes. |

### Sharing the work

| Skill | Say | What it does |
|-------|-----|--------------|
| `/v2:share-linkedin <url> [description]` | "post per linkedin", "video per linkedin", "pubblica su linkedin" | Shares a product on LinkedIn: a short video of the live product (1080x1350, captions, a pointer that really clicks, a closing card), recorded from a scene written for it, as the cover of a LinkedIn article: its title, its body and the text that shares it in the feed, which the person publishes by hand. Asks for the description only when the product does not say it. A post with the native video only when asked for one: published through LinkedIn's API, now or at a suggested moment, only once the person approves that post by naming it. |

## What it does

- **Before building**, the agent finds the principles that apply to the task, across sections: a form that sends AI-generated text needs both Error Prevention and Design for Uncertainty.
- **While building**, it follows their rules and asks the project's design system for the patterns, instead of inventing them.
- **Before handing over**, it runs their checks and reports each one as pass, fail or not verifiable. A check of a draft principle that fails asks the person instead: a defect, or their choice.
- **Around the work**, it draws what the work is made of, before and after, says where an epic or a repository stands, builds a preview to test the parts together, lists the pages to open, and merges only what the person approved, by the rules of [GOVERNANCE.md](GOVERNANCE.md).
- **Once it ships**, it tells people: a video of the live product as the cover of a LinkedIn article, and the text that shares it.

## Install in Claude Code

```
/plugin marketplace add vitto/v2
/plugin install v2@v2
```

`design-build` loads by itself when Claude builds or changes a UI; `/v2:design-interview` comes before a new view, `/v2:design-reframe` before adding to one. `/v2:design-audit <target>` reviews a screen, a component or a change. `/v2:agent-route` picks the model and the effort of a piece of work; the first time it runs on a machine, it offers to add one line to your global instructions, so that it weighs every piece of work. To try a local copy for one session without installing it: `claude --plugin-dir /path/to/v2`.

A new version reaches an installed plugin only when `version` in [.claude-plugin/plugin.json](.claude-plugin/plugin.json) changes: bump it with each release. Before a release, `node scripts/decisions.ts due` says which principles the decisions from the field are ready to change.

## With a design system

The principles say what must be true for the people using the interface and never name a component, so they work with any design system and do not compete with its guidance. When the design system has its own plugin or MCP server, such as [Magma](https://github.com/magma-design-system/magma)'s, use both: the design system says how, v2 says what must hold. When they disagree, the agent follows the design system and reports the difference.

## Where the principles come from

Each principle has a page on the site with its description, its sources and an interactive example for each rule. The files in [`principles/`](principles/) hold what an agent needs: when the principle applies, its rules and its checks. They join the site by id, and each rule links to its example. A draft has no page yet: it names the sources it is inspired by, and its rules grow from the decisions taken in real work. The format is described in [`principles/README.md`](principles/README.md); [`docs/pilot-audit.md`](docs/pilot-audit.md) is the first audit made with it.

### Principles that grow from your decisions

When you call a failing check your choice, answer the question of a draft, or ask for a correction on what an agent built, `design-build` and `design-audit` ask why in one line, at the end of the session, and write the decision to your decisions log. When three decisions from different views agree on a rule, for the same kind of view, they propose a change to the principle, in our own words; it lands only on your yes, as a pull request and a new version. The log is yours and private, since it may name clients: v2 only knows its path. Set it once in `~/.claude/settings.json`, then start a new session:

```json
{ "env": { "V2_DECISIONS_LOG": "~/notes/decisions.jsonl" } }
```

Without it, a decision stays in the project, in its object model's Exceptions. The format, the counting and the moments: [docs/decisions-log.md](docs/decisions-log.md).

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
| `node scripts/status.ts [epic, issue, PR, branch or worktree] [--branch=] [--repo=] [--config=]` | the epic table, one piece of work, or the summary of the repository | nothing |
| `node scripts/preview.ts <epic> [--branch=] [--dir=] [--repo=] [--config=]` | rebuilds the local preview of the epic | only the preview folder and its local branch; it refuses to run over work of its own |
| `node scripts/pages.ts [--base=] [--head=] [--<server>=<url>] [--config=]` | the pages to test what changed | nothing |
| `node scripts/merge.ts <pr> [--approved="<words>"] [--repo=] [--config=]` | checks a merge; with the person's words naming the pull request, carries it out | the merge, only then |
| `node scripts/rendered.ts --url= [--widths=] [--themes=] [--theme-attribute=] [--selector=] [--height=] [--wait=] [--out=]` | the rendered checks of a page: its screenshots at each width and theme, blurred and in greyscale, and its measures against the tokens of the design system ([docs/rendered.md](docs/rendered.md)); `--snippet` prints the measures for the browser of a session | only a new folder outside the checkout |
| `node scripts/linkedin-video.ts --scene=<file> [--lang=] [--name=] [--out=] [--probe]` | records the video of a scene, its contact sheet and its cover (Sharing the work) | only the files of `--out` |
| `node scripts/linkedin-auth.ts [--status] [--sign-out] [--port=]` | signs the person in to LinkedIn in their browser, or says until when they are | the token in the Keychain |
| `node scripts/linkedin-post.ts --video= --cover= --text= --visibility= --at= [--zone=] [--title=] [--approved="<words>"]` | checks a post and gives its id; with the person's words naming that id, publishes it or schedules it. `--rehearse` goes to LinkedIn and stops before the post; `--suggest`, `--queue`, `--cancel=<id>` | the post on LinkedIn, only then; a scheduled post's job on this Mac |

The skills let Claude Code run `status`, `preview`, `pages` and `rendered` without asking; `merge.ts`, `linkedin-auth.ts` and `linkedin-post.ts` always ask for permission, a second gate after the person's ok.

The status of an epic matches, table and next action, what `nx run magma:epic.status` prints for the same epic in Magma.

## Sharing the work

`/v2:share-linkedin` reads what the product is from the product itself, looks at it at 1080x1350, writes a scene of three to five moments, checks each step with a probe, records the take, checks it on a contact sheet, and writes the article the video is the cover of: its title, its body and the text that shares it. The person publishes the article by hand, since LinkedIn's API cannot create one. A post with the native video, when they ask for one, they post by hand, or approve it and the skill publishes it, now or at a moment it suggests.

The article is the format because it reached more people: on the author's account, an article with a 4:5 video cover had 1,984 impressions, 27 reactions and 12 comments after two weeks, a post with a native 4:5 video 92 impressions and 5 reactions after 18 hours. In the feed the cover filled its card; the native video played in a landscape frame with bands on its sides.

The recording is [scripts/linkedin-video.ts](scripts/linkedin-video.ts): headless Chrome over the DevTools Protocol, real input events, the pointer and the captions drawn in the page, ffmpeg for a 30 fps H.264 video. Its header says how, its `Take` interface is what a scene drives the product with, and [examples/share-linkedin/magma-studio.mjs](examples/share-linkedin/magma-studio.mjs) is a complete scene: the video of Magma Studio.

```bash
node scripts/linkedin-video.ts --scene=<scene.mjs> --probe --out=probe
node scripts/linkedin-video.ts --scene=<scene.mjs> --lang=en --name=<product> --out=out
```

It needs Google Chrome or Chromium (or `CHROME` naming another) and `ffmpeg` with `ffprobe`, besides Node 24.

### Publishing on LinkedIn

For a post with the native video, when the person asks for one instead of the article, [scripts/linkedin-post.ts](scripts/linkedin-post.ts) publishes it through LinkedIn's official API (the Videos API, then the Posts API), only with the words of the person naming that post. Its dry run checks the video, the cover, the text, the visibility, the time and the account, and gives the post an id, a fingerprint of all of them: the approval names the id ("pubblica 3f9a2c1d"), so it covers exactly what the person saw, once. Anything changed makes another id.

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
- The files of the workflow are English and ASCII. Every answer of a script is Markdown tables (the map adds its diagram), and its header says where each answer comes from.
- The map of `/v2:work-map` is specified on its parts (the checks of the JSON, the marks and styles, the Mermaid it writes, the comparison with a plan, the relations of a glossary map, the map hidden in a body and read back); how Mermaid draws it is checked by opening its page.
- The recorder of `/v2:share-linkedin` is specified on its pure parts (the frames of a take and its cuts, the easing of a move); the take itself needs Chrome and ffmpeg, so it is checked by recording the example scene.
- The rendered checks are specified on their pure parts (colours and contrast, the kinds of tokens and the scale, left edges, crowded targets, a PNG through every filter, contrast on pixels, the report), and once in headless Chrome on a page with known faults; that one runs where Chrome is, not in CI, whose runner may refuse Chrome's sandbox.
- The publisher is specified with no network: the requests of the sign-in, the Videos API and the Posts API, made against a `fetch` of the specs that records them; the text in LinkedIn's little text format; the id and the words that approve it; the checks; the suggested moments; the job of a scheduled post. A real post needs the person's account: `--rehearse` checks all of it but the post itself, and a first post approved checks the rest.
- The plugin itself is specified as it ships, in [scripts/plugin.spec.ts](scripts/plugin.spec.ts): every skill's frontmatter parses (a SKILL.md whose YAML does not parse loads with empty metadata, and nothing says so), its `name` is its folder, it has a `description`; the manifests are JSON, and the marketplace lists this plugin. The frontmatter is read with no package ([scripts/lib/frontmatter.ts](scripts/lib/frontmatter.ts)), so it keeps to the YAML the skills use: one `key: value` per line, the value plain, quoted or a block; a list or a map is refused until that reader learns it.
- `claude plugin validate . --strict` (`npm run validate` without `--strict`) checks more, by hand: CI does not install the Claude Code CLI.
- `evals/` holds a suite in the format of `claude plugin eval`: does each skill still do its job, and on which model ([evals/README.md](evals/README.md), results in [evals/RESULTS.md](evals/RESULTS.md)). It runs by hand, on a login, when a model ships or a skill changes, never in `npm test`.
- The same `npm test` runs on every pull request and on `main`, in [.github/workflows/test.yml](.github/workflows/test.yml): it is the check `/v2:work-merge` waits for.

### Layout

```
.claude-plugin/   marketplace.json (the marketplace) and plugin.json (the plugin)
.github/          the workflow that runs the specs
skills/<name>/    one folder per skill: SKILL.md
principles/       the principles, one file each, by section of the site
docs/             the formats of the object model, the taxonomy register and the decisions log, the rendered checks, reading notes, the pilot audit
scripts/          one script per job of the workflow, and its spec beside it; plugin.spec.ts, the plugin itself
scripts/lib/      what the scripts share: git and gh, the configuration, the epic, the worktrees
examples/         the .claude/v2.json of real projects; the scene of a LinkedIn video
evals/            the cases of `claude plugin eval`, one folder each with its fixture; the results
schema/           the JSON Schema of .claude/v2.json
GOVERNANCE.md     the rules of the workflow
```

### Adding a skill

A skill is a folder `skills/<name>/SKILL.md` (invoked as `/v2:<name>`): its description says what it does, when to use it, and the Italian words that call it. A script it needs goes in `scripts/` with its spec, reads through `scripts/lib/`, and is called as `node ${CLAUDE_PLUGIN_ROOT}/scripts/<script>.ts`. Skills of one family share a prefix (`design-`), so they read as a group. The MCP server will go in a `.mcp.json` at the root of the plugin.

## License

[MIT](LICENSE)
