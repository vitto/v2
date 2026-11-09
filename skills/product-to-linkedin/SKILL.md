---
name: product-to-linkedin
description: 'Announce a product on LinkedIn: a short video of the live product (1080x1350, captions in the frame, a pointer that clicks, drags and types for real, a closing card) recorded from a scene written for it, and the text of the post that carries the video. Use when asked for a LinkedIn post, video or article about a product, a site, a release or a feature; in Italian "post per linkedin", "video per linkedin", "annuncio su linkedin", "articolo per linkedin".'
argument-hint: "<url> [description]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/linkedin-video.ts *), Bash(ffmpeg *), Bash(ffprobe *)
---

# Announce a product on LinkedIn

What to announce: $ARGUMENTS. The first word is the address of the live product; the rest, when
given, is what the person says the product is.

Before each step, say in one line what it does. The script `${CLAUDE_PLUGIN_ROOT}/scripts/linkedin-video.ts`
says in its header how it records and which traps it already handles; its `Take` interface is
the toolkit a scene drives the product with.

## 1. What the product is

- Read it from the product before asking: the title, the description and the `og:` tags of its
  page (`curl -sL <url>`), its own words (the hero, the list of what it offers, the steps it
  explains), its README or changelog when the repository is at hand. A description the person
  gave comes first.
- Ask only when none of these says what the product is and who it is for: one question, the
  description, nothing else.
- Every claim of the captions and of the post is true of the live product today: numbers are read
  from it, not remembered; what is coming is said only when the product itself says it.
- Other products are not named: a trend may be described, a competitor never.

## 2. The format

A **post with a native video** and a short text above it, unless the person asks for something
else:

- the video plays by itself, muted, in the feed: its captions carry the message, it needs no
  audio;
- the text above it shows its first two or three lines before "see more": the news and the
  promise go there;
- an article is long form that opens off the feed: write one only when the person asks for it,
  with the video inside and a title of its own.

The video: 1080x1350 (4:5, the format that fills the most of a phone's feed), 20 to 35 seconds,
5 to 8 captions of one idea each and at most about 50 characters, the product's own words, then a
closing card with its name, one line and its address.

## 3. The scene

1. **Look at the product at 1080x1350** in a browser (the Browser pane, resized): the take uses
   that viewport, one CSS pixel per pixel, so the product keeps its desktop layout. Note the
   selectors of what the take touches.
2. **Choose three to five moments**, in this order: the promise (a hero, the problem it solves),
   one real interaction whose effect shows, where the result is judged, how to take it away or
   start; then the closing card.
3. **Write the scene** in the scratchpad of the session, not in the product's repository unless
   the person asks: a module whose default export is `async (t) => {}`, captions per language in
   it (`t.lang`). The complete example is
   `${CLAUDE_PLUGIN_ROOT}/examples/product-to-linkedin/magma-studio.mjs`.

What the scene must get right (each one cost a take):

- **Warm up off the take**: open every page once before `t.mark()`, so fonts, icons and frames
  are cached; mark when the first page is ready.
- **The effect is on screen when it happens.** When a control and what it changes do not fit in
  1350 pixels, act on the control, scroll to the effect (`t.scroll`), and go on with the keyboard
  (`t.key`): the control keeps the focus the pointer gave it. A change the viewer cannot see is a
  wasted second.
- **A run of keys crawls when each key makes the product work** (a range that solves a palette
  again at each step): PageUp and PageDown move a range a tenth at a time; keep the arrows for the
  last steps.
- **A caption never covers what changes**: move it with `{ bottom }`; keep it off the controls the
  pointer is about to use.
- **No page while it loads**: `t.pause()` after the click that navigates, wait for the page ready
  (`t.waitFor`), `t.resume()`; the video cuts to it. An iframe reloads at every visit, so a warm
  up is not enough for it.
- **Real input, not scripts**: `t.click`, `t.slide`, `t.key` send real events, and the product
  reacts as to a person; `element.click()` often does not. A native select is the exception: its
  popup never renders in a headless take, so `t.choose` shows the click and sets the value.
- **Leave the product as found** when the take changes something it keeps (a value, a draft):
  bring it back in the take, which also shows that it can be undone. The take runs in a fresh
  profile, but a scene may also run in a person's browser.

## 4. Probe, record, check

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/linkedin-video.ts --scene=<scene.mjs> --probe --out=<scratchpad>/probe
```

Look at every screenshot: each `t.probe()` of the scene is one. Fix the scene until every step
shows what it should, then record each language:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/linkedin-video.ts --scene=<scene.mjs> --lang=en --name=<product> --out=<scratchpad>/out
```

It writes the video, its contact sheet (one frame a second) and its cover (the closing card).
Read the sheet, and at full size the frames where something changes
(`ffmpeg -ss <s> -i <video> -frames:v 1 <png>`). The take is right when:

- it lasts 20 to 35 seconds, and no moment drags (a run of keys, a wait) or flashes (a page
  loading);
- every caption is readable, on screen long enough to read, and covers nothing that changes;
- the pointer is where the eye should go, and every effect happens in the frame;
- the closing card holds about three seconds.

Then copy the videos and covers where the person finds them (`~/Downloads/<product>-linkedin-<lang>.mp4`,
`-cover-<lang>.png`) and send them.

## 5. The post

Plain text, since LinkedIn renders no Markdown, in a code block ready to paste:

```text
<the news, in one line>
<what it does, for whom, in one or two lines of the product's own words>

<three to five lines, one thing a person can do each, an emoji at most at the start>

<an arrow> <the address>

<one line: what comes next, if the product says it, and an invitation to feedback>

<three to five hashtags>
```

- **The link preview**: check `og:title`, `og:description` and `og:image` of the address with
  `curl`. LinkedIn reads them once and keeps them: when they are wrong or missing, say so before
  the person posts, and after the fix point to the Post Inspector
  (https://www.linkedin.com/post-inspector/) to refresh them.
- **The language**: the language the person asks for; when they write in one language and the
  product speaks another, offer both.
- The person publishes. Never sign in to LinkedIn or post on their behalf.

## What it needs

Node 24, Google Chrome or Chromium (or `CHROME` naming another), `ffmpeg` and `ffprobe` on the
`PATH`. When one is missing, the script says which; say how to install it (on macOS,
`brew install ffmpeg`) and stop.
