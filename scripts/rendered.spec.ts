import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { deflateSync } from 'node:zlib';
import { findChrome } from './lib/chrome.ts';
import {
  blend,
  cleanShadow,
  clusterEdges,
  contrast,
  crowdedTargets,
  isGridUnit,
  onScale,
  pageExpression,
  parseColor,
  toHex,
  tokenKind,
  type Measure,
  type Token,
} from './lib/measure.ts';
import { decodePng, pixelAt } from './lib/png.ts';
import { addressOf, check, onPixels, report, section, themesOf, widthsOf, type Run } from './rendered.ts';

const near = (actual: number, expected: number, within = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= within, `${actual} is not ${expected}`);

describe('colours', () => {
  it('parses rgb(), rgba() and hex, in both syntaxes, and nothing else', () => {
    assert.deepEqual(parseColor('#fff'), [255, 255, 255, 1]);
    assert.deepEqual(parseColor('#1d1d1b'), [29, 29, 27, 1]);
    assert.deepEqual(parseColor('rgb(10, 20, 30)'), [10, 20, 30, 1]);
    assert.deepEqual(parseColor('rgba(0, 0, 0, 0.5)'), [0, 0, 0, 0.5]);
    assert.deepEqual(parseColor('rgb(10 20 30 / 50%)'), [10, 20, 30, 0.5]);
    assert.equal(parseColor('oklch(55% 0.15 250)'), null);
    assert.equal(parseColor('red'), null);
  });

  it('writes hex, with alpha only when translucent', () => {
    assert.equal(toHex([255, 0, 0, 1]), '#ff0000');
    assert.equal(toHex([255, 255, 255, 0.6]), '#ffffff99');
  });

  it('measures the contrast of WCAG', () => {
    near(contrast([0, 0, 0, 1], [255, 255, 255, 1]), 21);
    near(contrast([118, 118, 118, 1], [255, 255, 255, 1]), 4.54);
    near(contrast([255, 255, 255, 1], [118, 118, 118, 1]), 4.54);
  });

  it('paints a translucent colour over another', () => {
    const [r, g, b, a] = blend([0, 0, 0, 0.5], [255, 255, 255, 1]);
    near(r, 127.5);
    near(g, 127.5);
    near(b, 127.5);
    assert.equal(a, 1);
  });
});

describe('tokens', () => {
  const none = { color: false, length: false, shadow: false };

  it('takes the kind from the value, then from the name', () => {
    assert.equal(tokenKind('--color-text', '#111', { ...none, color: true }), 'color');
    assert.equal(tokenKind('--space-4', '16px', { ...none, length: true }), 'space');
    assert.equal(tokenKind('--radius-md', '6px', { ...none, length: true }), 'radius');
    assert.equal(tokenKind('--font-size-body', '1rem', { ...none, length: true }), 'font-size');
    assert.equal(tokenKind('--size-4', '1rem', { ...none, length: true }), 'length');
    assert.equal(tokenKind('--font-weight-bold', '700', none), 'font-weight');
    assert.equal(tokenKind('--leading-tight', '1.25', none), 'line-height');
    assert.equal(tokenKind('--shadow-1', '0 1px 2px rgba(0,0,0,.2)', { ...none, shadow: true }), 'shadow');
  });

  it('leaves out what the checks do not compare', () => {
    assert.equal(tokenKind('--z-modal', '50', none), null);
    assert.equal(tokenKind('--opacity-muted', '0.8', none), null);
    assert.equal(tokenKind('--width-half', '50%', { ...none, length: true }), null);
    // two lengths parse as a shadow, but a padding is not one
    assert.equal(tokenKind('--button-padding', '4px 8px', { ...none, shadow: true }), null);
  });

  it('knows a unit the scale multiplies from a step of it', () => {
    assert.equal(isGridUnit('--spacing'), true);
    assert.equal(isGridUnit('--space-unit'), true);
    assert.equal(isGridUnit('--magma-spacing'), true);
    assert.equal(isGridUnit('--space-4'), false);
    assert.equal(isGridUnit('--spacing-3xl'), false);
  });

  it('drops the layers of a shadow that draw nothing', () => {
    const composed = 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 4px 6px -1px';
    assert.equal(cleanShadow(composed), 'rgba(0, 0, 0, 0.1) 0px 4px 6px -1px');
    assert.equal(cleanShadow('rgba(0, 0, 0, 0) 0px 0px 0px 0px'), 'none');
    assert.equal(cleanShadow('rgb(0, 0, 255) 0px 0px 0px 1px'), 'rgb(0, 0, 255) 0px 0px 0px 1px');
  });
});

describe('the scale', () => {
  const spaces: Token[] = [
    { name: '--space-2', kind: 'space', px: 8 },
    { name: '--space-4', kind: 'space', px: 16 },
  ];

  it('is on it within half a pixel, off it with the nearest token', () => {
    assert.deepEqual(onScale('space', { px: 16.4 }, spaces), { ok: true });
    assert.deepEqual(onScale('space', { px: 13 }, spaces), { ok: false, nearest: '--space-4 (16px)' });
  });

  it('cannot say without a token of the kind', () => {
    assert.deepEqual(onScale('radius', { px: 4 }, spaces), { ok: null });
  });

  it('takes every whole multiple of a unit', () => {
    const grid: Token[] = [{ name: '--spacing', kind: 'space', px: 4, grid: true }];
    assert.deepEqual(onScale('space', { px: 12 }, grid), { ok: true });
    assert.deepEqual(onScale('space', { px: 13 }, grid), { ok: false, nearest: '--spacing x 3 (12px)' });
  });

  it('compares a length of any kind, and names the nearest of its own kind first', () => {
    const tokens: Token[] = [
      { name: '--size-5', kind: 'length', px: 20 },
      { name: '--font-size-title', kind: 'font-size', px: 24 },
    ];
    assert.deepEqual(onScale('font-size', { px: 20 }, tokens), { ok: true });
    assert.deepEqual(onScale('font-size', { px: 21 }, tokens), { ok: false, nearest: '--font-size-title (24px)' });
  });

  it('reads a line height without a unit against the font size', () => {
    const tokens: Token[] = [{ name: '--leading-body', kind: 'line-height', factor: 1.5 }];
    assert.deepEqual(onScale('line-height', { px: 24, fontSize: 16 }, tokens), { ok: true });
    assert.equal(onScale('line-height', { px: 22, fontSize: 16 }, tokens).ok, false);
  });

  it('matches colours within 2 on each channel, shadows exactly', () => {
    const tokens: Token[] = [
      { name: '--color-text', kind: 'color', rgba: [29, 29, 27, 1] },
      { name: '--shadow-1', kind: 'shadow', text: 'rgba(0, 0, 0, 0.2) 0px 1px 2px 0px' },
    ];
    assert.deepEqual(onScale('color', { rgba: [30, 28, 27, 1] }, tokens), { ok: true });
    assert.deepEqual(onScale('color', { rgba: [200, 200, 200, 1] }, tokens), { ok: false, nearest: '--color-text (#1d1d1b)' });
    assert.deepEqual(onScale('shadow', { text: 'rgba(0, 0, 0, 0.2) 0px 1px 2px 0px' }, tokens), { ok: true });
    assert.deepEqual(onScale('shadow', { text: 'rgba(0, 0, 0, 0.3) 0px 1px 2px 0px' }, tokens), { ok: false });
  });
});

describe('left edges', () => {
  it('groups starts within 2 px, the most used first', () => {
    const edges = clusterEdges([
      { x: 16, where: 'h1' },
      { x: 17, where: 'p' },
      { x: 32, where: 'li' },
      { x: 16.5, where: 'label' },
      { x: 100, where: 'aside' },
    ]);
    assert.deepEqual(
      edges.map((e) => [e.x, e.count]),
      [
        [16, 3],
        [32, 1],
        [100, 1],
      ],
    );
    assert.deepEqual(edges[0].where, ['h1', 'label']);
  });
});

describe('targets', () => {
  const box = (x: number, y: number, width: number, height = width) => ({ x, y, width, height });

  it('finds small targets whose circles touch', () => {
    const crowded = crowdedTargets([
      { box: box(0, 0, 18), where: 'a' },
      { box: box(20, 0, 18), where: 'b' },
    ]);
    assert.deepEqual(
      crowded.map((c) => [c.where, c.touches]),
      [
        ['a', 'b'],
        ['b', 'a'],
      ],
    );
  });

  it('lets small targets far enough apart, big ones, and one inside another', () => {
    assert.deepEqual(
      crowdedTargets([
        { box: box(0, 0, 18), where: 'a' },
        { box: box(48, 0, 18), where: 'b' },
      ]),
      [],
    );
    assert.deepEqual(
      crowdedTargets([
        { box: box(0, 0, 24), where: 'a' },
        { box: box(24, 0, 24), where: 'b' },
      ]),
      [],
    );
    assert.deepEqual(
      crowdedTargets([
        { box: box(0, 0, 300, 48), where: 'row' },
        { box: box(10, 15, 18), where: 'icon' },
      ]),
      [],
    );
  });
});

describe('the expression for the page', () => {
  it('is JavaScript, with every function the measure calls', () => {
    const expression = pageExpression({ selector: 'main' });
    assert.doesNotThrow(() => new Function(`return ${expression}`));
    assert.match(expression, /return measure\(\{"selector":"main"\}\);/);
    for (const name of ['parseColor', 'onScale', 'crowdedTargets', 'cleanShadow']) assert.match(expression, new RegExp(`const ${name} = `));
  });
});

/** A PNG with every filter, written as the specification says, to read it back. */
const encodePng = (width: number, height: number, channels: number, data: Uint8Array): Buffer => {
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const filter = y % 5;
    raw[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x;
      const a = x >= channels ? data[at - channels] : 0;
      const b = y > 0 ? data[at - stride] : 0;
      const c = x >= channels && y > 0 ? data[at - stride - channels] : 0;
      const p = a + b - c;
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      const predicted = [0, a, b, (a + b) >> 1, paeth][filter];
      raw[y * (stride + 1) + 1 + x] = (data[at] - predicted) & 255;
    }
  }
  const chunk = (type: string, body: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(body.length);
    return Buffer.concat([length, Buffer.from(type, 'ascii'), body, Buffer.alloc(4)]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = { 1: 0, 2: 4, 3: 2, 4: 6 }[channels] ?? 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

describe('PNG', () => {
  for (const channels of [3, 4]) {
    it(`reads back ${channels} channels through every filter`, () => {
      const width = 7;
      const height = 10;
      const data = Uint8Array.from({ length: width * height * channels }, (_, i) => (i * 37 + (i >> 3) * 11) & 255);
      const image = decodePng(encodePng(width, height, channels, data));
      assert.equal(image.width, width);
      assert.equal(image.height, height);
      assert.deepEqual(image.data, data);
    });
  }

  it('refuses what is not a PNG', () => {
    assert.throws(() => decodePng(Buffer.from('GIF89a')), /not a PNG/);
  });

  it('gives a pixel as RGBA', () => {
    const image = decodePng(encodePng(2, 1, 3, Uint8Array.from([255, 0, 0, 0, 0, 255])));
    assert.deepEqual(pixelAt(image, 1, 0), [0, 0, 255, 1]);
  });
});

describe('contrast on the pixels', () => {
  // 20 x 20: white, with the right half black
  const data = new Uint8Array(20 * 20 * 3).fill(255);
  for (let y = 0; y < 20; y++) for (let x = 10; x < 20; x++) data.fill(0, (y * 20 + x) * 3, (y * 20 + x) * 3 + 3);
  const image = decodePng(encodePng(20, 20, 3, data));
  const text = (box: { x: number; y: number; width: number; height: number }) => ({
    where: 'h1',
    text: 'Title',
    fg: [255, 255, 255, 1] as [number, number, number, number],
    needs: 3,
    box,
  });

  it('passes white text over black pixels, fails it over white ones', () => {
    const black = onPixels([text({ x: 10, y: 0, width: 10, height: 10 })], image);
    assert.equal(black.checked, 1);
    assert.deepEqual(black.fails, []);
    const white = onPixels([text({ x: 0, y: 0, width: 10, height: 10 })], image);
    assert.equal(white.fails[0].bg, '#ffffff');
    assert.equal(white.fails[0].ratio, 1);
    assert.equal(white.fails[0].picture, true);
  });

  it('leaves a text outside the screenshot not measurable', () => {
    const outside = onPixels([text({ x: 0, y: 40, width: 10, height: 10 })], image);
    assert.equal(outside.checked, 0);
    assert.equal(outside.left.length, 1);
  });
});

describe('the command line', () => {
  it('reads widths smallest first, and refuses what is not one', () => {
    assert.deepEqual(widthsOf('1440, 360,360'), [360, 1440]);
    assert.deepEqual(widthsOf(), [360, 1440]);
    assert.throws(() => widthsOf('100'), /between 200 and 4000/);
    assert.throws(() => widthsOf('wide'), /whole numbers/);
  });

  it('reads themes, and addresses a browser opens', () => {
    assert.deepEqual(themesOf('light,dark'), ['light', 'dark']);
    assert.throws(() => themesOf('dark mode'), /Not the name of a theme/);
    assert.equal(addressOf('http://localhost:5173'), 'http://localhost:5173/');
    assert.throws(() => addressOf(undefined), /--url/);
    assert.throws(() => addressOf('ftp://x'), /Not an address a browser opens/);
  });
});

const sample: Measure = {
  url: 'http://localhost/',
  width: 360,
  dark: false,
  elements: 40,
  tokens: { count: 3, byKind: { space: 2, color: 1 }, unreadable: 1 },
  offScale: {
    total: 1,
    rows: [{ kind: 'space', value: '13px', as: ['padding'], where: ['div.card'], nearest: '--space-4 (16px)', count: 1 }],
    untested: ['radius'],
  },
  distinct: {
    sizes: [{ value: '16', count: 4 }],
    weights: [{ value: '400', count: 4 }],
    textColors: [{ value: '#1d1d1b', count: 4 }],
    fills: [],
  },
  contrast: {
    checked: 4,
    unknown: 0,
    approximate: 0,
    failCount: 1,
    fails: [{ where: 'p.faint', text: 'Faint', fg: '#c8c8c8', bg: '#ffffff', ratio: 1.67, needs: 4.5, approximate: false }],
    pending: [],
  },
  controls: { checked: 0, unknown: 0, fails: [] },
  targets: { checked: 2, under44: 2, crowdedCount: 0, crowded: [] },
  edges: { count: 1, top: [{ x: 16, count: 4, where: ['h1'] }] },
  lines: { longest: 60, over: [] },
};

describe('the report', () => {
  it('shows a width and theme as tables, with the checks they answer', () => {
    const text = section({ width: 360, theme: 'light', files: { page: 'a.png', blur: 'b.png', grey: 'g.png' }, measure: sample }).join('\n');
    assert.match(text, /^### 360 px, light/);
    assert.match(text, /Screenshots: `a.png`, blurred `b.png`, greyscale `g.png`\./);
    assert.match(text, /1 style sheet could not be read/);
    assert.match(text, /\*\*Off the scale\*\* \(CU1, VC5\): 1 value/);
    assert.match(text, /\| space \| `13px` \| padding \| `div.card` \| --space-4 \(16px\) \| 1 \|/);
    assert.match(text, /not checked: radius/);
    assert.match(text, /\| `p.faint` \| Faint \| `#c8c8c8` on `#ffffff` \| 1.67:1 \| 4.5:1 \|/);
    assert.match(text, /\*\*Left edges\*\* \(VC9\): 1, the most used x 16/);
  });

  it('says why a width and theme was not measured', () => {
    const runs: Run[] = [{ width: 1440, theme: 'dark', files: {}, error: 'the page does not open: net::ERR_CONNECTION_REFUSED' }];
    const text = report('http://localhost/', '/tmp/x', runs).join('\n');
    assert.match(text, /Not measured: the page does not open: net::ERR_CONNECTION_REFUSED\./);
  });
});

// Headless Chrome on a page with known faults; left out where there is no Chrome, and in CI,
// whose runner may refuse Chrome's sandbox.
const chrome = findChrome();
describe('in Chrome', { skip: !chrome ? 'no Chrome on this computer' : process.env.CI ? 'not in CI' : false }, () => {
  it('measures and shoots a page at each width and theme', async () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'v2-rendered-spec-'));
    try {
      const page = path.join(folder, 'page.html');
      writeFileSync(
        page,
        `<!doctype html><html><head><style>
        :root { --space-2: 8px; --space-4: 16px; --color-text: #1d1d1b; --color-surface: #fff; --font-size-body: 16px; }
        @media (prefers-color-scheme: dark) { :root { --color-text: #eee; --color-surface: #1a1a1a; } }
        body { margin: 0; padding: var(--space-4); background: var(--color-surface); color: var(--color-text); font: var(--font-size-body)/1.5 sans-serif; }
        .card { padding: 13px; } .faint { color: #c8c8c8; }
        .icons button { width: 18px; height: 18px; padding: 0; margin: 0 2px 0 0; border: 0; background: var(--color-text); }
        .hero { position: relative; padding: var(--space-4); } .hero canvas { position: absolute; inset: 0; width: 100%; height: 100%; background: #000; }
        .hero p { position: relative; color: #fff; margin: 0; }
        </style></head><body>
        <div class="card"><p class="faint">Faint caption</p><a href="#">Open</a></div>
        <div class="icons"><button aria-label="a"></button><button aria-label="b"></button></div>
        <div class="hero"><canvas></canvas><p>White on a canvas</p></div>
        </body></html>`,
      );
      const runs = await check({
        url: `file://${page}`,
        widths: [360],
        themes: ['light', 'dark'],
        height: 600,
        wait: 0,
        folder,
        chrome: chrome as string,
      });
      assert.deepEqual(
        runs.map((run) => [run.theme, run.error]),
        [
          ['light', undefined],
          ['dark', undefined],
        ],
      );
      for (const file of ['360-light.png', '360-light-blur.png', '360-light-grey.png', '360-dark.png'])
        assert.ok(existsSync(path.join(folder, file)), file);
      const [light, dark] = runs.map((run) => run.measure as Measure);
      assert.ok(light.offScale.rows.some((row) => row.kind === 'space' && row.value === '13px'));
      assert.deepEqual(
        light.contrast.fails.map((f) => f.where),
        ['div.card:nth-of-type(1) > p.faint'],
      );
      // the white text over the black canvas is measured on the pixels, and passes
      assert.equal(light.contrast.unknown, 0);
      assert.equal(light.targets.crowdedCount, 2);
      assert.ok(dark.contrast.fails.some((f) => f.where.endsWith('> a') && f.fg === '#0000ee'));
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
