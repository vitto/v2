/*
  The rendered checks (docs/rendered.md): the page as drawn, measured against the tokens of its
  design system and photographed to be looked at, at each width and in each theme. The skills
  /v2:design-build and /v2:design-audit run it.

    node scripts/rendered.ts --url=<address> [--widths=360,1440] [--themes=light,dark]
        [--theme-attribute=<name>] [--selector=<css>] [--height=900] [--wait=500] [--out=<folder>]
        for each width and theme: the screenshot, the same blurred and in greyscale, and the
        measures; the report in <out>/report.md (printed too), the measures in <out>/measure.json
    node scripts/rendered.ts --snippet [--selector=<css>]
        the measures as one JavaScript expression, for the browser of a session when this computer
        has no Chrome: its value is what measure.json holds for one width and theme

  Where each answer comes from:

  - the page: Chrome (scripts/lib/chrome.ts), a window of each width by --height (a phone below
    768 px: the mobile flag of Emulation.setDeviceMetricsOverride), read once its load event
    fired, the network stayed quiet for half a second (10 seconds at most), its fonts loaded and
    --wait milliseconds passed;
  - the theme: prefers-color-scheme (Emulation.setEmulatedMedia), dark for a theme whose name says
    dark; with --theme-attribute, that attribute of the root element set to the theme's name too,
    for a design system that switches on an attribute (data-theme="dark");
  - the screenshots: the whole page, up to four windows tall; with --selector, its first element
    and 16 px around it; blurred (filter: blur(6px) on the root, VC2) and in greyscale
    (filter: grayscale(1), AB3), taken after the measures, since a filter on the root moves what
    is fixed;
  - the measures: scripts/lib/measure.ts, run in the page;
  - the folder: --out, else a new folder in the temporary folder of the system, never the checkout.
*/
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { isMain, parseArgs, type Args } from './lib/args.ts';
import { findChrome, launch, type Session } from './lib/chrome.ts';
import { cell, plural, table } from './lib/markdown.ts';
import { blend, contrast, pageExpression, toHex, type Kind, type Measure, type Rgba } from './lib/measure.ts';
import { decodePng, pixelAt, type Pixels } from './lib/png.ts';

export interface Run {
  width: number;
  theme: string;
  /** The screenshots, in the folder of the report. */
  files: { page?: string; blur?: string; grey?: string };
  measure?: Measure;
  /** Why this width and theme has no measures. */
  error?: string;
}

const MARGIN = 16;

/** `360,1440`: the widths, smallest first. */
export const widthsOf = (raw = '360,1440'): number[] => {
  const widths = [...new Set(raw.split(',').map((part) => part.trim()).filter(Boolean).map(Number))];
  for (const width of widths)
    if (!Number.isInteger(width) || width < 200 || width > 4000)
      throw new Error(`--widths takes whole numbers of CSS px between 200 and 4000, not ${raw}`);
  if (!widths.length) throw new Error('--widths names no width');
  return widths.sort((a, b) => a - b);
};

/** `light,dark`: the names of the themes, in order. */
export const themesOf = (raw = 'light'): string[] => {
  const themes = [...new Set(raw.split(',').map((part) => part.trim()).filter(Boolean))];
  for (const theme of themes) if (!/^[a-z][a-z0-9-]*$/i.test(theme)) throw new Error(`Not the name of a theme: ${theme}`);
  if (!themes.length) throw new Error('--themes names no theme');
  return themes;
};

/** An address a browser opens: http, https or file. */
export const addressOf = (raw: string | undefined): string => {
  if (!raw) throw new Error('Give the address of the page: --url=<address>');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Not an address: ${raw}`);
  }
  if (!/^(https?|file):$/.test(url.protocol)) throw new Error(`Not an address a browser opens: ${raw}`);
  return url.href;
};

/**
 * The contrast of the texts over a picture, a canvas or a gradient, on the pixels under them in a
 * screenshot taken with every text hidden: 24 points across the box of each text, and the tenth
 * percentile of their ratios, so a stray pixel does not decide alone. A text outside the image
 * stays not measurable.
 */
export const onPixels = (
  pending: Measure['contrast']['pending'],
  image: Pixels,
): { checked: number; fails: Measure['contrast']['fails']; left: Measure['contrast']['pending'] } => {
  const fails: Measure['contrast']['fails'] = [];
  const left: Measure['contrast']['pending'] = [];
  let checked = 0;
  for (const text of pending) {
    const { x, y, width, height } = text.box;
    const samples: { ratio: number; bg: Rgba }[] = [];
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 3; j++) {
        const px = x + (width * (i + 0.5)) / 8;
        const py = y + (height * (j + 0.5)) / 3;
        if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
        const [r, g, b] = pixelAt(image, px, py);
        const bg: Rgba = [r, g, b, 1];
        samples.push({ ratio: contrast(blend(text.fg, bg), bg), bg });
      }
    if (!samples.length) {
      left.push(text);
      continue;
    }
    checked++;
    const low = samples.sort((a, b) => a.ratio - b.ratio)[Math.floor(samples.length / 10)];
    if (low.ratio < text.needs - 0.005)
      fails.push({
        where: text.where,
        text: text.text,
        fg: toHex(text.fg),
        bg: toHex(low.bg),
        ratio: Math.round(low.ratio * 100) / 100,
        needs: text.needs,
        approximate: false,
        picture: true,
      });
  }
  return { checked, fails, left };
};

const KINDS: Record<Kind, string> = {
  color: 'colour',
  space: 'space',
  radius: 'radius',
  'font-size': 'font size',
  'font-weight': 'weight',
  'line-height': 'line height',
  shadow: 'shadow',
  length: 'length',
};

const listed = (values: { value: string; count: number }[], unit = '') =>
  values.map((v) => `${v.value}${unit} (${v.count})`).join(', ') || 'none';

/** The report of one width and theme. */
export const section = (run: Run): string[] => {
  const out = [`### ${run.width} px, ${run.theme}`, ''];
  const files = [run.files.page, run.files.blur && `blurred \`${run.files.blur}\``, run.files.grey && `greyscale \`${run.files.grey}\``];
  if (run.files.page) out.push(`Screenshots: \`${run.files.page}\`, ${files.slice(1).filter(Boolean).join(', ')}.`, '');
  else out.push('Screenshots: none.', '');
  if (run.error || !run.measure) return [...out, `Not measured: ${run.error ?? 'no answer from the page'}.`, ''];
  const m = run.measure;

  const kinds = Object.entries(m.tokens.byKind)
    .sort((a, b) => b[1] - a[1])
    .map(([kind, n]) => `${KINDS[kind as Kind] ?? kind} ${n}`)
    .join(', ');
  out.push(`Tokens read: ${m.tokens.count}${kinds ? ` (${kinds})` : ''}.`);
  if (m.tokens.unreadable)
    out.push(`${plural(m.tokens.unreadable, 'style sheet')} could not be read (another origin): the tokens they declare are missing.`);
  if (!m.tokens.count) out.push('No token on the root element: the values cannot be compared with a scale.');
  out.push('');

  out.push(`**Off the scale** (CU1, VC5): ${plural(m.offScale.total, 'value')}`, '');
  if (m.offScale.rows.length)
    out.push(
      ...table(
        ['Kind', 'Value', 'As', 'Where', 'Nearest token', 'Times'],
        m.offScale.rows.map((row) => [
          KINDS[row.kind],
          cell(`\`${row.value}\``),
          cell(row.as.join(', ')),
          cell(row.where.map((w) => `\`${w}\``).join(', ')),
          cell(row.nearest ?? '-'),
          String(row.count),
        ]),
      ),
      '',
    );
  if (m.offScale.total > m.offScale.rows.length) out.push(`+${m.offScale.total - m.offScale.rows.length} more in measure.json.`, '');
  if (m.offScale.untested.length) out.push(`No token to compare with, so not checked: ${m.offScale.untested.map((k) => KINDS[k]).join(', ')}.`, '');

  out.push(
    '**Distinct values**',
    '',
    ...table(
      ['What', 'How many', 'Values (times)'],
      [
        ['Text sizes', String(m.distinct.sizes.length), cell(listed(m.distinct.sizes, ' px'))],
        ['Weights', String(m.distinct.weights.length), cell(listed(m.distinct.weights))],
        ['Text colours', String(m.distinct.textColors.length), cell(listed(m.distinct.textColors))],
        ['Fills', String(m.distinct.fills.length), cell(listed(m.distinct.fills))],
      ],
    ),
    '',
  );

  const c = m.contrast;
  const notes = [
    c.unknown && `${c.unknown} over a picture and outside the screenshot, not measurable`,
    c.approximate && `${c.approximate} under an opacity or a backdrop filter, approximate`,
  ].filter(Boolean);
  out.push(`**Contrast of text** (AB1): ${plural(c.checked, 'text')} checked, ${c.failCount} below the threshold${notes.length ? `; ${notes.join('; ')}` : ''}`, '');
  if (c.fails.length)
    out.push(
      ...table(
        ['Where', 'Text', 'Colour on background', 'Ratio', 'Needs'],
        c.fails.map((f) => [
          cell(`\`${f.where}\``),
          cell(f.text),
          `\`${f.fg}\` on \`${f.bg}\``,
          `${f.ratio}:1${f.approximate ? ' (approximate)' : ''}${f.picture ? ' (over a picture)' : ''}`,
          `${f.needs}:1`,
        ]),
      ),
      '',
    );
  const k = m.controls;
  out.push(
    `**Contrast of controls** (AB2): ${plural(k.checked, 'control')} checked, ${k.fails.length} below 3:1${k.unknown ? `; ${k.unknown} drawn by the browser or over an image, not measurable` : ''}`,
    '',
  );
  if (k.fails.length)
    out.push(...table(['Where', 'Border or fill', 'Background'], k.fails.map((f) => [cell(`\`${f.where}\``), `${f.ratio}:1`, `\`${f.bg}\``])), '');

  const t = m.targets;
  out.push(`**Targets** (AB6, AB7): ${plural(t.checked, 'target')}, ${t.crowdedCount} under 24 px and crowded, ${t.under44} under 44 px`, '');
  if (t.crowded.length)
    out.push(...table(['Where', 'Size (px)', 'Touches'], t.crowded.map((x) => [cell(`\`${x.where}\``), x.size, cell(`\`${x.touches}\``)])), '');

  const edges = m.edges.top.map((e) => `x ${e.x} (${e.count}: \`${e.where[0]}\`)`).join(', ');
  out.push(`**Left edges** (VC9): ${m.edges.count}${edges ? `, the most used ${edges}` : ''}.`, '');
  out.push(
    `**Line length** (WCAG 1.4.8): the longest ${m.lines.longest} characters a line; over 80: ${
      m.lines.over.length ? m.lines.over.map((l) => `\`${l.where}\` (${l.perLine})`).join(', ') : 'none'
    }.`,
    '',
  );
  return out;
};

/** The whole report: what it is, then a section per width and theme. */
export const report = (url: string, folder: string, runs: Run[]): string[] => [
  `## Rendered checks of ${url}`,
  '',
  `The screenshots, this report and measure.json are in \`${folder}\`. The measured tables answer the checks in brackets; the seen checks are read on the screenshots (docs/rendered.md).`,
  '',
  ...runs.flatMap(section),
];

/** Waits until `ready` says so, `limit` milliseconds at most. */
const until = async (ready: () => boolean, limit: number) => {
  const start = Date.now();
  while (!ready() && Date.now() - start < limit) await sleep(50);
};

const evaluate = async <T>(page: Session, expression: string): Promise<T> => {
  const answer = await page.send<{ result: { value: T }; exceptionDetails?: { exception?: { description?: string }; text: string } }>(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
  );
  if (answer.exceptionDetails)
    throw new Error(answer.exceptionDetails.exception?.description?.split('\n')[0] ?? answer.exceptionDetails.text);
  return answer.result.value;
};

const FRAMES = 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))';

/** The image of the page, or of the first element of `selector` and a margin around it. */
const capture = async (page: Session, width: number, height: number, selector?: string): Promise<Buffer> => {
  let clip: { x: number; y: number; width: number; height: number; scale: number };
  if (selector) {
    const box = await evaluate<{ x: number; y: number; width: number; height: number } | null>(
      page,
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null;
        const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; })()`,
    );
    if (!box || !box.width || !box.height) throw new Error(`nothing visible matches ${selector}`);
    const x = Math.max(0, box.x - MARGIN);
    const y = Math.max(0, box.y - MARGIN);
    clip = { x, y, width: box.width + (box.x - x) + MARGIN, height: box.height + (box.y - y) + MARGIN, scale: 1 };
  } else {
    const metrics = await page.send<{ cssContentSize: { height: number } }>('Page.getLayoutMetrics');
    clip = { x: 0, y: 0, width, height: Math.min(height * 4, Math.ceil(metrics.cssContentSize.height)), scale: 1 };
  }
  const { data } = await page.send<{ data: string }>('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
  return Buffer.from(data, 'base64');
};

const number = (args: Args, name: string, fallback: number): number => {
  const raw = args.value(name);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`--${name} takes a whole number, not ${raw}`);
  return n;
};

/** Opens the page in each width and theme, measures it and shoots it. */
export const check = async (options: {
  url: string;
  widths: number[];
  themes: string[];
  themeAttribute?: string;
  selector?: string;
  height: number;
  wait: number;
  folder: string;
  chrome: string;
}): Promise<Run[]> => {
  const { url, widths, themes, height, wait, folder, selector } = options;
  const profile = mkdtempSync(path.join(tmpdir(), 'v2-rendered-profile-'));
  const { child, page } = await launch(options.chrome, profile, { width: widths[widths.length - 1], height });
  const state = { loads: 0, network: Date.now() };
  page.on('Page.loadEventFired', () => state.loads++);
  for (const event of ['Network.requestWillBeSent', 'Network.loadingFinished', 'Network.loadingFailed'])
    page.on(event, () => (state.network = Date.now()));
  const runs: Run[] = [];
  try {
    await page.send('Page.enable');
    await page.send('Network.enable');
    for (const theme of themes) {
      await page.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: /dark/i.test(theme) ? 'dark' : 'light' }],
      });
      for (const width of widths) {
        const run: Run = { width, theme, files: {} };
        runs.push(run);
        try {
          await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
          const loads = state.loads;
          const navigation = await page.send<{ errorText?: string }>('Page.navigate', { url });
          if (navigation.errorText) throw new Error(`the page does not open: ${navigation.errorText}`);
          await until(() => state.loads > loads, 30000);
          if (state.loads === loads) throw new Error('the page did not finish loading in 30 seconds');
          await until(() => Date.now() - state.network > 500, 10000);
          await evaluate(page, 'document.fonts ? document.fonts.ready.then(() => true) : true');
          if (options.themeAttribute)
            await evaluate(page, `document.documentElement.setAttribute(${JSON.stringify(options.themeAttribute)}, ${JSON.stringify(theme)})`);
          await evaluate(page, FRAMES);
          await sleep(wait);

          const measured = await evaluate<Measure | { error: string }>(page, pageExpression({ selector }));
          if ('error' in measured) throw new Error(measured.error);
          run.measure = measured;
          if (measured.contrast.pending.length) {
            await evaluate(page, `(() => { const s = document.createElement('style'); s.id = 'v2-rendered-no-text';
              s.textContent = '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important; }';
              (document.head ?? document.documentElement).appendChild(s); })(); ${FRAMES}`);
            const pixels = decodePng(await capture(page, width, height));
            await evaluate(page, `document.getElementById('v2-rendered-no-text')?.remove(); ${FRAMES}`);
            const found = onPixels(measured.contrast.pending, pixels);
            const c = measured.contrast;
            c.checked += found.checked;
            c.unknown -= found.checked;
            c.failCount += found.fails.length;
            c.fails = [...c.fails, ...found.fails].sort((a, b) => a.ratio - b.ratio).slice(0, Math.max(40, c.fails.length));
            c.pending = found.left;
          }

          const name = `${width}-${theme}`;
          for (const [key, filter] of [
            ['page', ''],
            ['blur', 'blur(6px)'],
            ['grey', 'grayscale(1)'],
          ] as const) {
            await evaluate(page, `document.documentElement.style.setProperty('filter', ${JSON.stringify(filter)}); ${FRAMES}`);
            const file = key === 'page' ? `${name}.png` : `${name}-${key}.png`;
            writeFileSync(path.join(folder, file), await capture(page, width, height, selector));
            run.files[key] = file;
          }
          await evaluate(page, `document.documentElement.style.removeProperty('filter')`);
        } catch (error) {
          run.error = (error as Error).message;
        }
      }
    }
  } finally {
    page.close();
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await Promise.race([exited, sleep(3000)]);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  return runs;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.flag('snippet')) {
    console.log(pageExpression({ selector: args.value('selector') }));
    return;
  }
  const url = addressOf(args.value('url'));
  const widths = widthsOf(args.value('widths'));
  const themes = themesOf(args.value('themes'));
  const chrome = findChrome();
  if (!chrome) {
    console.log(
      [
        'No Chrome on this computer (install Google Chrome or Chromium, or set CHROME to its path).',
        'The rendered checks are not verifiable this way: run the measures in the browser of the session instead,',
        'with the expression `node scripts/rendered.ts --snippet` prints, at the same widths (docs/rendered.md).',
      ].join('\n'),
    );
    process.exitCode = 2;
    return;
  }
  const out = args.value('out');
  const folder = out ? path.resolve(out) : mkdtempSync(path.join(tmpdir(), 'v2-rendered-'));
  mkdirSync(folder, { recursive: true });
  const runs = await check({
    url,
    widths,
    themes,
    themeAttribute: args.value('theme-attribute'),
    selector: args.value('selector'),
    height: number(args, 'height', 900) || 900,
    wait: number(args, 'wait', 500),
    folder,
    chrome,
  });
  const lines = report(url, folder, runs);
  writeFileSync(path.join(folder, 'report.md'), `${lines.join('\n')}\n`);
  writeFileSync(path.join(folder, 'measure.json'), `${JSON.stringify(runs, null, 2)}\n`);
  console.log(lines.join('\n'));
  if (runs.every((run) => run.error)) process.exitCode = 1;
};

if (isMain(import.meta.url))
  main().catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  });
