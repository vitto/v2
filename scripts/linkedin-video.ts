/*
  A short video of a product for LinkedIn: 1080x1350 (4:5, the format that fills the most of a
  phone's feed), 30 fps, H.264, no audio, the message carried by captions in the frame. The skill
  /v2:product-to-linkedin writes the scene and runs this.

    node scripts/linkedin-video.ts --scene=<scene.mjs> [--lang=en] [--out=<folder>] [--name=<name>]
        records the scene into <out>/<name>-<lang>.mp4, with its contact sheet
        <name>-<lang>-sheet.png (one frame a second, to check the take) and its cover
        <name>-<lang>-cover.png (the last frame, the closing card)
    node scripts/linkedin-video.ts --scene=<scene.mjs> --probe [--lang=en] [--out=<folder>]
        runs the scene without recording: a screenshot at each t.probe() of the scene, into
        <out>/probe-<n>-<name>.jpg, to check every step before the take

  The scene is a module whose default export is `async (t) => { ... }`: it drives the product
  through `t` (the Take below) in headless Chrome, which records from `t.mark()` to its end.

  Where each part comes from:

  - the frames: Page.startScreencast of the Chrome DevTools Protocol, each timestamped by the
    compositor and lasting until the next; ffmpeg joins them at a constant 30 fps (concat
    demuxer), converted to BT.709 limited range, the range players expect;
  - the pointer, its click ring, the captions and the closing card: drawn in the page, over it,
    because a headless screencast has no cursor. The clicks, drags and keys are real input events
    (Input.dispatchMouseEvent, Input.dispatchKeyEvent), so the product reacts as to a person;
  - Chrome: the CHROME variable, else the usual place of Google Chrome or Chromium; ffmpeg and
    ffprobe: the PATH.

  Traps it already handles (the skill lists the ones a scene must handle):

  - the concat demuxer stretches the last frame: the length of the take is set on the output;
  - a drag follows the clock, not a count of steps, so slow round trips do not stretch it;
  - a frame and the mark of the take are compared on the clock of the frames (the smallest gap
    between a frame and its arrival puts this script's clock on it);
  - a run of keys sends each down and up together, or a round trip per event makes it crawl;
  - what a page shows while it loads or hydrates stays out of the video between t.pause() and
    t.resume(): the video cuts to the page ready.
*/
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { isMain, parseArgs } from './lib/args.ts';

export const WIDTH = 1080;
export const HEIGHT = 1350;
export const FPS = 30;

/** Where an action points: a CSS selector, a point of the page, or a JS expression giving an element. */
export type Target = string | { x: number; y: number } | { js: string };

export interface Outro {
  /** The title, large. */
  title: string;
  /** One line under it: what the product is. */
  line?: string;
  /** The address, as people type it. */
  url?: string;
  /** The logo: an image URL or data URI, or a selector of an <img> of the page. */
  logo?: string;
  /** The colours of the card; the defaults are a light grey and a dark blue. */
  background?: string;
  color?: string;
  accent?: string;
}

/** What a scene drives the product with. Every position is in pixels of the page. */
export interface Take {
  lang: string;
  width: number;
  height: number;
  /** Loads a page; a `#...` changes only the hash, as a single-page app does. */
  open: (url: string) => Promise<void>;
  /** Waits until every custom element of the page is defined and the fonts are in. */
  settle: () => Promise<void>;
  /** Waits until a JS expression is truthy. */
  waitFor: (expression: string, timeout?: number) => Promise<void>;
  /** The take starts here: what came before is left out of the video. */
  mark: () => void;
  /**
   * Leaves out what follows, until t.resume(): a page that loads or hydrates, a wait. The video
   * cuts from the frame before the pause to the frame at the resume.
   */
  pause: () => void;
  resume: () => void;
  /** Shows the pointer where it is (it shows by itself at its first move). */
  pointer: (shown?: boolean) => Promise<void>;
  move: (target: Target, ms?: number) => Promise<void>;
  click: (target?: Target, ms?: number) => Promise<void>;
  /** Presses where the pointer is and drags to a target. */
  drag: (to: Target, ms?: number) => Promise<void>;
  /**
   * Drags the thumb of a range input (or of the one in a component's shadow root) to a value; the
   * arrows take the last steps a pixel misses, so it lands on the value.
   */
  slide: (range: Target, value: number, ms?: number) => Promise<void>;
  /** Presses a key: Escape, Enter, Tab, ArrowRight, ...; `times` presses `gap` ms apart. */
  key: (key: string, times?: number, gap?: number) => Promise<void>;
  /**
   * Picks an option of a select (or of the one in a component's shadow root): the pointer clicks
   * it, then the value is set with an input and a change event, since the popup of a native
   * select never shows in a headless screencast.
   */
  choose: (select: Target, value: string, ms?: number) => Promise<void>;
  /**
   * Scrolls a container (the page when null) to a position, `end`, or a target (placed 24 pixels
   * under its top), and waits until it stops.
   */
  scroll: (container: Target | null, to: number | 'end' | Target, smooth?: boolean) => Promise<void>;
  /** A caption at the bottom of the frame, `bottom` pixels up; null hides it. */
  caption: (text: string | null, place?: { bottom?: number }) => Promise<void>;
  /** The closing card, faded in over the page; it holds for `ms`. */
  outro: (card: Outro, ms?: number) => Promise<void>;
  /** The centre of a target. */
  center: (target: Target) => Promise<{ x: number; y: number }>;
  evaluate: <T = unknown>(expression: string) => Promise<T>;
  sleep: (ms: number) => Promise<void>;
  /** A screenshot under --probe; nothing otherwise. */
  probe: (name: string) => Promise<void>;
}

export interface Frame {
  file: string;
  /** When the compositor drew it, in seconds. */
  t: number;
}

/** The ease in and out of a move, for t from 0 to 1. */
export const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** A stretch of the take that goes in the video, in seconds on the clock of the frames. */
export interface Segment {
  start: number;
  end: number;
}

/** How long the video lasts: its segments end to end. */
export const lengthOf = (segments: Segment[]): number =>
  segments.reduce((sum, { start, end }) => sum + Math.max(0, end - start), 0);

/**
 * The concat list of ffmpeg for the frames of a take. Each segment opens on the last frame drawn
 * before it starts (the page as it stands then), and each frame lasts until the next one or the
 * end of its segment; segments follow each other with a cut.
 */
export const concatList = (frames: Frame[], segments: Segment[]): string => {
  const sorted = [...frames].sort((a, b) => a.t - b.t);
  const lines: string[] = [];
  let last = '';
  for (const { start, end } of segments) {
    if (end <= start) continue;
    const first = Math.max(0, sorted.findLastIndex((frame) => frame.t <= start));
    const kept = sorted.slice(first).filter((frame, i) => i === 0 || frame.t < end);
    if (!kept.length || kept[0].t >= end) continue;
    kept[0] = { ...kept[0], t: Math.max(kept[0].t, start) };
    kept.forEach((frame, i) => {
      lines.push(`file '${frame.file}'\nduration ${((kept[i + 1]?.t ?? end) - frame.t).toFixed(4)}`);
      last = frame.file;
    });
  }
  if (!lines.length) throw new Error('No frame in the take: was t.mark() called before the scene moved?');
  return `ffconcat version 1.0\n${lines.join('\n')}\nfile '${last}'\n`;
};

/** Where Chrome is: CHROME, else the usual places. */
export const findChrome = (env = process.env): string | null => {
  if (env.CHROME) return env.CHROME;
  const places = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const place of places) if (existsSync(place)) return place;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const found = spawnSync('which', [name], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  return null;
};

/** The key codes of the keys a scene presses. */
const KEYS: Record<string, { code: string; keyCode: number }> = {
  Escape: { code: 'Escape', keyCode: 27 },
  Enter: { code: 'Enter', keyCode: 13 },
  Tab: { code: 'Tab', keyCode: 9 },
  ' ': { code: 'Space', keyCode: 32 },
  ArrowLeft: { code: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { code: 'ArrowUp', keyCode: 38 },
  ArrowRight: { code: 'ArrowRight', keyCode: 39 },
  ArrowDown: { code: 'ArrowDown', keyCode: 40 },
  PageUp: { code: 'PageUp', keyCode: 33 },
  PageDown: { code: 'PageDown', keyCode: 34 },
  Home: { code: 'Home', keyCode: 36 },
  End: { code: 'End', keyCode: 35 },
};

/** The element of a target, as a JS expression run in the page. */
export const elementOf = (target: Exclude<Target, { x: number; y: number }>): string =>
  typeof target === 'string' ? `document.querySelector(${JSON.stringify(target)})` : `(${target.js})`;

// Drawn in the page: the pointer, its click ring, the caption. Idempotent.
const OVERLAY = (font: string) => `(() => {
  if (document.getElementById('lv-pointer')) return;
  const style = document.createElement('style');
  style.textContent = \`
    #lv-pointer { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;
      width: 40px; height: 40px; opacity: 0; transition: opacity 300ms ease;
      filter: drop-shadow(0 3px 6px rgb(0 0 0 / 0.35)); will-change: transform; }
    #lv-ring { position: fixed; left: 0; top: 0; z-index: 2147483646; pointer-events: none;
      width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%;
      background: rgb(0 85 255 / 0.28); border: 3px solid rgb(0 85 255 / 0.7);
      opacity: 0; transform: scale(0.3); }
    #lv-ring.on { animation: lv-ring 520ms ease-out; }
    @keyframes lv-ring { 0% { opacity: 1; transform: scale(0.3); } 100% { opacity: 0; transform: scale(1.4); } }
    #lv-caption { position: fixed; left: 50%; bottom: 110px; z-index: 2147483645; pointer-events: none;
      transform: translate(-50%, 16px); opacity: 0; transition: opacity 320ms ease, transform 320ms ease;
      max-width: 960px; width: max-content; box-sizing: border-box; padding: 20px 34px;
      border-radius: 22px; background: rgb(12 18 38 / 0.92); color: #fff;
      font: 700 38px/1.22 ${font}; letter-spacing: -0.01em; text-align: center;
      box-shadow: 0 12px 40px rgb(0 0 0 / 0.28); }
    #lv-caption.on { opacity: 1; transform: translate(-50%, 0); }
    #lv-outro { position: fixed; inset: 0; z-index: 2147483640; display: grid; place-content: center;
      justify-items: center; gap: 28px; opacity: 0; transition: opacity 600ms ease;
      font-family: ${font}; text-align: center; padding: 80px; }
    #lv-outro.on { opacity: 1; }
    #lv-outro img { width: 200px; height: 200px; object-fit: contain; }
    #lv-outro .t { font-weight: 800; font-size: 88px; line-height: 1; letter-spacing: -0.02em; }
    #lv-outro .l { font-weight: 500; font-size: 42px; line-height: 1.25; max-width: 820px; opacity: 0.85; }
    #lv-outro .u { margin-top: 24px; font-weight: 700; font-size: 34px; padding: 16px 30px;
      border-radius: 999px; background: #fff; box-shadow: 0 6px 24px rgb(0 0 0 / 0.1); }
  \`;
  document.head.append(style);
  const pointer = document.createElement('div');
  pointer.id = 'lv-pointer';
  pointer.innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40"><path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const ring = document.createElement('div');
  ring.id = 'lv-ring';
  const caption = document.createElement('div');
  caption.id = 'lv-caption';
  document.body.append(ring, pointer, caption);
})()`;

interface Session {
  send: <T = any>(method: string, params?: object) => Promise<T>;
  on: (method: string, listener: (params: any) => void) => void;
  close: () => void;
}

/** A DevTools Protocol session on a page. */
const connect = (url: string): Promise<Session> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map<number, { ok: (value: any) => void; ko: (error: Error) => void }>();
    const listeners = new Map<string, ((params: any) => void)[]>();
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.id) {
        const call = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) call?.ko(new Error(message.error.message));
        else call?.ok(message.result);
      } else for (const listener of listeners.get(message.method) ?? []) listener(message.params);
    };
    ws.onerror = () => reject(new Error(`No DevTools session at ${url}`));
    ws.onopen = () =>
      resolve({
        send: (method, params = {}) =>
          new Promise((ok, ko) => {
            pending.set(++id, { ok, ko });
            ws.send(JSON.stringify({ id, method, params }));
          }),
        on: (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]),
        close: () => ws.close(),
      });
  });

/** Chrome headless on a free port, which it writes in its profile. */
const launch = async (chrome: string, profile: string) => {
  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-color-profile=srgb',
      `--window-size=${WIDTH},${HEIGHT}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  const file = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (existsSync(file)) {
      const [port] = (await readFile(file, 'utf8')).split('\n');
      if (port) {
        const target = (await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()) as {
          webSocketDebuggerUrl: string;
        };
        return { child, page: await connect(target.webSocketDebuggerUrl) };
      }
    }
    await sleep(100);
  }
  child.kill();
  throw new Error(`Chrome did not start: ${chrome}`);
};

const run = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const scene = args.value('scene');
  if (!scene) throw new Error('Name the scene: --scene=<file.mjs>');
  const lang = args.value('lang') ?? 'en';
  const out = path.resolve(args.value('out') ?? 'out');
  const name = args.value('name') ?? path.basename(scene).replace(/\.[^.]+$/, '');
  const probing = args.flag('probe');
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome not found: install Google Chrome or set CHROME to its executable');
  for (const tool of ['ffmpeg', 'ffprobe'])
    if (spawnSync(tool, ['-version']).status !== 0) throw new Error(`${tool} not found on the PATH`);
  const drive = (await import(pathToFileURL(path.resolve(scene)).href)).default as (t: Take) => Promise<void>;
  if (typeof drive !== 'function') throw new Error(`${scene} has no default export (async (t) => {})`);

  await mkdir(out, { recursive: true });
  const profile = await mkdtemp(path.join(tmpdir(), 'linkedin-video-profile-'));
  const work = await mkdtemp(path.join(tmpdir(), 'linkedin-video-frames-'));
  const { child, page } = await launch(chrome, profile);
  try {
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
    await page.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: 'light' },
        { name: 'prefers-reduced-motion', value: 'no-preference' },
      ],
    });

    const frames: (Frame & { at: number })[] = [];
    let n = 0;
    page.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      page.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      const file = path.join(work, `f${String(++n).padStart(5, '0')}.jpg`);
      frames.push({ file, t: metadata.timestamp, at: Date.now() / 1000 });
      writeFile(file, Buffer.from(data, 'base64')).catch(() => {});
    });

    const evaluate = async <T = unknown>(expression: string): Promise<T> => {
      const { result, exceptionDetails } = await page.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (exceptionDetails) throw new Error(`${exceptionDetails.exception?.description ?? 'error'}\n  in: ${expression.slice(0, 200)}`);
      return result.value as T;
    };
    const overlay = async () => {
      const font = await evaluate<string>(`getComputedStyle(document.body).fontFamily`);
      await evaluate(OVERLAY(font.replace(/"/g, "'").replace(/`/g, '')));
    };
    const center = async (target: Target) => {
      if (typeof target === 'object' && 'x' in target) return target;
      for (let i = 0; i < 80; i++) {
        const found = await evaluate<{ x: number; y: number } | null>(`(() => { const e = ${elementOf(target)};
          if (!e) return null; const b = e.getBoundingClientRect(); if (!b.width) return null;
          return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()`);
        if (found) return found;
        await sleep(100);
      }
      throw new Error(`Nothing on the page for ${JSON.stringify(target)}`);
    };

    let at = { x: Math.round(WIDTH * 0.7), y: Math.round(HEIGHT * 0.72) };
    let shown = false;
    const place = (x: number, y: number, ms = 0) =>
      evaluate(`(() => { const p = document.getElementById('lv-pointer');
        p.style.transition = 'opacity 300ms ease, transform ${ms}ms cubic-bezier(.45,.05,.25,1)';
        p.style.transform = 'translate(${x - 4}px, ${y - 2}px)'; })()`);
    const pointer = async (show = true) => {
      await overlay();
      await place(at.x, at.y);
      await evaluate(`document.getElementById('lv-pointer').style.opacity = '${show ? 1 : 0}'`);
      shown = show;
    };
    const move = async (target: Target, ms = 800) => {
      if (!shown) await pointer(true);
      const { x, y } = await center(target);
      await place(x, y, ms);
      await sleep(ms);
      at = { x, y };
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    };
    const mouse = (type: string, x: number, y: number, buttons: number) =>
      page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1 });
    const click = async (target?: Target, ms = 800) => {
      if (target !== undefined) await move(target, ms);
      await sleep(120);
      await evaluate(`(() => { const r = document.getElementById('lv-ring');
        r.style.left = '${at.x}px'; r.style.top = '${at.y}px';
        r.classList.remove('on'); void r.offsetWidth; r.classList.add('on'); })()`);
      await mouse('mousePressed', at.x, at.y, 1);
      await sleep(70);
      await mouse('mouseReleased', at.x, at.y, 0);
    };
    const drag = async (to: Target, ms = 1100) => {
      const start = at;
      const end = await center(to);
      await sleep(100);
      await mouse('mousePressed', start.x, start.y, 1);
      const t0 = Date.now();
      for (;;) {
        const t = Math.min(1, (Date.now() - t0) / ms);
        const x = Math.round(start.x + (end.x - start.x) * ease(t));
        const y = Math.round(start.y + (end.y - start.y) * ease(t));
        await Promise.all([place(x, y), mouse('mouseMoved', x, y, 1)]);
        if (t === 1) break;
        await sleep(12);
      }
      await mouse('mouseReleased', end.x, end.y, 0);
      at = end;
    };
    const rangeOf = (target: Exclude<Target, { x: number; y: number }>) =>
      `(() => { const e = ${elementOf(target)}; return e?.matches?.('input[type=range]') ? e : e?.shadowRoot?.querySelector('input[type=range]'); })()`;
    const slide = async (range: Target, value: number, ms = 1100) => {
      if (typeof range === 'object' && 'x' in range) throw new Error('t.slide needs the range, not a point');
      const r = await evaluate<{ x: number; y: number; w: number; min: number; max: number; value: number }>(`(() => {
        const i = ${rangeOf(range)}; const b = i.getBoundingClientRect();
        return { x: b.x, y: b.y + b.height / 2, w: b.width, min: +i.min || 0, max: +(i.max || 100), value: +i.value }; })()`);
      // The thumb is inset by about half its width at each end of the track.
      const thumb = 8;
      const xOf = (v: number) => Math.round(r.x + thumb + ((v - r.min) / (r.max - r.min)) * (r.w - 2 * thumb));
      await move({ x: xOf(r.value), y: Math.round(r.y) }, 900);
      await drag({ x: xOf(value), y: Math.round(r.y) }, ms);
      // A pixel is not a step (a zoom, the inset of the thumb): the arrows take it the last steps,
      // the range keeping the focus the drag gave it.
      const reached = await evaluate<number>(`+${rangeOf(range)}.value`);
      if (reached !== value) await key(reached < value ? 'ArrowRight' : 'ArrowLeft', Math.abs(value - reached), 40);
    };
    const key = async (name: string, times = 1, gap = 0) => {
      const known = KEYS[name] ?? { code: name.length === 1 ? `Key${name.toUpperCase()}` : name, keyCode: name.toUpperCase().charCodeAt(0) };
      const event = { key: name, code: known.code, windowsVirtualKeyCode: known.keyCode };
      for (let i = 0; i < times; i++) {
        // Down and up together: a round trip each would make a run of keys crawl.
        await Promise.all([
          page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...event, ...(name.length === 1 ? { text: name } : {}) }),
          page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...event }),
        ]);
        if (gap && i < times - 1) await sleep(gap);
      }
    };
    const choose = async (select: Target, value: string, ms = 900) => {
      if (typeof select === 'object' && 'x' in select) throw new Error('t.choose needs the select, not a point');
      await click(select, ms);
      await sleep(250);
      await evaluate(`(() => { const e = ${elementOf(select)};
        const s = e.matches('select') ? e : e.shadowRoot?.querySelector('select');
        s.value = ${JSON.stringify(value)};
        s.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        s.dispatchEvent(new Event('change', { bubbles: true, composed: true })); })()`);
    };
    const scroll = async (container: Target | null, to: number | 'end' | Target, smooth = true) => {
      const box =
        container === null ? 'document.scrollingElement' : typeof container === 'object' && 'x' in container ? null : elementOf(container);
      if (!box) throw new Error('t.scroll needs a container, not a point');
      const behavior = smooth ? 'smooth' : 'instant';
      // To an element, the browser places it (24 pixels under the top), whatever zoom the page has.
      // A selector is an element too: only a number, `end` and a point scroll to a position.
      const go =
        to !== 'end' && typeof to !== 'number' && !(typeof to === 'object' && 'x' in to)
          ? `{ const e = ${elementOf(to)}; e.style.scrollMarginTop = '24px'; e.scrollIntoView({ behavior: '${behavior}', block: 'start' }); }`
          : `b.scrollTo({ top: ${to === 'end' ? '1e7' : typeof to === 'number' ? to : to.y}, behavior: '${behavior}' });`;
      await evaluate(`(async () => { const b = ${box}; ${go}
        let last = -1; while (b.scrollTop !== last) { last = b.scrollTop; await new Promise((r) => setTimeout(r, 120)); } })()`);
    };
    const caption = async (text: string | null, where: { bottom?: number } = {}) => {
      await overlay();
      if (text === null) {
        await evaluate(`document.getElementById('lv-caption').classList.remove('on')`);
        return;
      }
      await evaluate(`(() => { const c = document.getElementById('lv-caption');
        const show = () => { c.textContent = ${JSON.stringify(text)}; c.style.bottom = '${where.bottom ?? 110}px'; c.classList.add('on'); };
        if (c.classList.contains('on')) { c.classList.remove('on'); setTimeout(show, 330); } else show(); })()`);
    };
    const outro = async (card: Outro, ms = 3300) => {
      await caption(null);
      await evaluate(`(() => { const card = ${JSON.stringify(card)}; const o = document.createElement('div'); o.id = 'lv-outro';
        o.style.background = card.background ?? '#f2f2f2'; o.style.color = card.color ?? '#0c1226';
        let logo = card.logo;
        if (logo && !/^(data:|https?:|\\/)/.test(logo)) logo = document.querySelector(logo)?.getAttribute('src') ?? undefined;
        if (logo) { const img = document.createElement('img'); img.alt = ''; img.src = logo; o.append(img); }
        for (const [cls, text] of [['t', card.title], ['l', card.line], ['u', card.url]]) {
          if (!text) continue; const d = document.createElement('div'); d.className = cls; d.textContent = text; o.append(d); }
        const u = o.querySelector('.u'); if (u) u.style.color = card.accent ?? '#00379e';
        document.body.append(o); void o.offsetWidth; o.classList.add('on');
        const p = document.getElementById('lv-pointer'); if (p) p.style.opacity = '0'; })()`);
      await sleep(ms);
    };
    const settle = () =>
      evaluate<void>(`(async () => {
        const undefinedOnes = () => [...document.querySelectorAll('*')].filter((e) => e.localName.includes('-') && !customElements.get(e.localName)).length;
        const deadline = Date.now() + 15000;
        while (undefinedOnes() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
        await document.fonts.ready;
        await new Promise((r) => setTimeout(r, 300));
      })()`);
    let shot = 0;
    // The stretches of the take that go in the video, on this script's clock.
    let segments: Segment[] = [];
    let since: number | null = null;
    const now = () => Date.now() / 1000;
    const take: Take = {
      lang,
      width: WIDTH,
      height: HEIGHT,
      open: async (url) => {
        if (url.startsWith('#')) await evaluate(`location.hash = ${JSON.stringify(url)}`);
        else {
          const loaded = new Promise<void>((ok) => page.on('Page.loadEventFired', () => ok()));
          await page.send('Page.navigate', { url });
          await Promise.race([loaded, sleep(15000)]);
          shown = false;
        }
        await settle();
      },
      settle,
      waitFor: async (expression, timeout = 10000) => {
        const deadline = Date.now() + timeout;
        while (!(await evaluate(`!!(${expression})`))) {
          if (Date.now() > deadline) throw new Error(`Still false after ${timeout} ms: ${expression}`);
          await sleep(40);
        }
      },
      mark: () => {
        segments = [];
        since = now();
      },
      pause: () => {
        if (since !== null) segments.push({ start: since, end: now() });
        since = null;
      },
      resume: () => {
        if (since === null && segments.length) since = now();
      },
      pointer,
      move,
      click,
      drag,
      slide,
      key,
      choose,
      scroll,
      caption,
      outro,
      center,
      evaluate,
      sleep: (ms) => sleep(ms),
      probe: async (label) => {
        if (!probing) return;
        const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
        const file = path.join(out, `probe-${String(++shot).padStart(2, '0')}-${label.replace(/[^\w-]+/g, '-')}.jpg`);
        await writeFile(file, Buffer.from(data, 'base64'));
        console.log(file);
      },
    };

    if (!probing)
      await page.send('Page.startScreencast', { format: 'jpeg', quality: 100, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 });
    const began = Date.now();
    await drive(take);
    take.pause();
    if (probing) {
      console.log(`probe: ${shot} screenshots in ${out}, the scene ran in ${((Date.now() - began) / 1000).toFixed(1)} s`);
      return;
    }
    await page.send('Page.stopScreencast');
    await sleep(300);
    if (!segments.length) throw new Error('The scene never called t.mark(): where does the take start?');
    // The clock of the frames: the smallest gap between a frame and its arrival.
    const offset = Math.min(...frames.map((frame) => frame.at - frame.t));
    const onFrames = segments.map(({ start, end }) => ({ start: start - offset, end: end - offset }));
    const list = path.join(work, 'frames.txt');
    await writeFile(list, concatList(frames, onFrames));
    const video = path.join(out, `${name}-${lang}.mp4`);
    const length = lengthOf(onFrames);
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `fps=${FPS},format=rgb24,scale=${WIDTH}:${HEIGHT}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-movflags', '+faststart', '-an', '-t', length.toFixed(3), video,
    ]);
    const rows = Math.ceil(length / 8);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vf', `fps=1,scale=216:-1,tile=8x${rows}:padding=4`, '-frames:v', '1', path.join(out, `${name}-${lang}-sheet.png`)]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', '-0.4', '-i', video, '-frames:v', '1', path.join(out, `${name}-${lang}-cover.png`)]);
    const size = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'compact=p=0:nk=1', video], { encoding: 'utf8' }).trim();
    console.log(`${video}: ${length.toFixed(1)} s, ${frames.length} frames captured (${size.replace('|', ' s, ')} bytes)`);
    console.log(`  sheet: ${path.join(out, `${name}-${lang}-sheet.png`)}\n  cover: ${path.join(out, `${name}-${lang}-cover.png`)}`);
  } finally {
    page.close();
    child.kill();
    await sleep(300);
    await rm(profile, { recursive: true, force: true });
    await rm(work, { recursive: true, force: true });
  }
};

if (isMain(import.meta.url)) {
  run().then(
    () => process.exit(0),
    (error: Error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
