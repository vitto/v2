/// <reference lib="dom" />
/*
  What the measured checks of the `rendered` level read on a page (docs/rendered.md): the computed
  styles of every visible element against the tokens of the design system, the contrast of text
  and of controls, the size of targets, the length of lines and the left edges text starts from.

  It runs in the page, not in Node: scripts/rendered.ts sends it to headless Chrome through the
  DevTools Protocol, and `node scripts/rendered.ts --snippet` prints it for the browser of a
  session. So each function of PAGE uses only its arguments, the other functions of PAGE and the
  globals of a page, and `pageExpression` joins their sources: node strips the types when it loads
  this file, so the source of each function is JavaScript.

  Where each answer comes from:

  - the tokens: every custom property the readable style sheets declare (adopted ones included)
    that has a value on the root element, resolved there; its kind from what its value parses as
    (a colour, a length, a shadow, a number), then from its name (radius, weight, line height,
    font size, space); a length whose name says no kind is a length of any kind;
  - a value on the scale: within half a pixel of a token of its kind, or of a length of any kind;
    a colour within 2 on each channel. Never off the scale: 0, hairlines of 1 px, side margins
    equal to each other (auto, centring), radii of half the box or more (a pill, a circle);
  - colours: painted on a 1 x 1 canvas and read back when they are not rgb(), so oklch(),
    color-mix() and the rest compare in sRGB;
  - contrast (WCAG 1.4.3): the colour of the text over the backgrounds of its ancestors, up to the
    first opaque one, else the canvas of the page (white, or the dark canvas when the root asks for
    a dark colour scheme and the page is dark); under a background image it is not measurable, under
    an opacity below 1 approximate; large text (24 px, or 18.66 px and bold) needs 3:1, the rest
    4.5:1; text in a disabled control is left out;
  - controls (WCAG 1.4.11): fields, selects, text areas and the roles of a control, by their border
    or their fill against the background around them, 3:1; a checkbox or a radio the browser draws
    is not measurable;
  - targets (WCAG 2.5.8): whatever a pointer acts on, 24 x 24 CSS px, or a 24 px circle on its centre
    that touches no other target and no other such circle; a target inside another is not touching
    it, and a link inside a sentence is left out;
  - line length: the characters of a block of text over its lines, its height over its line height;
  - left edges: where the text of each block starts, grouped within 2 px.
*/

export type Rgba = [number, number, number, number];
export type Kind = 'color' | 'space' | 'radius' | 'font-size' | 'font-weight' | 'line-height' | 'shadow' | 'length';

export interface Token {
  name: string;
  kind: Kind;
  /** A length in px, or a weight. */
  px?: number;
  /** A line height without a unit. */
  factor?: number;
  rgba?: Rgba;
  /** A shadow, as the page computes it. */
  text?: string;
  /** A unit the spacing scale multiplies: every whole multiple is on the scale. */
  grid?: boolean;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MeasureOptions {
  /** Measure only inside the elements this selector matches. */
  selector?: string;
  /** The most rows of each list. */
  max?: number;
}

export interface OffScale {
  kind: Kind;
  value: string;
  /** The properties it was found in. */
  as: string[];
  where: string[];
  nearest?: string;
  count: number;
}

export interface Measure {
  url: string;
  width: number;
  dark: boolean;
  elements: number;
  tokens: { count: number; byKind: Record<string, number>; unreadable: number };
  offScale: { total: number; rows: OffScale[]; untested: Kind[] };
  distinct: Record<'sizes' | 'weights' | 'textColors' | 'fills', { value: string; count: number }[]>;
  contrast: {
    checked: number;
    unknown: number;
    approximate: number;
    failCount: number;
    fails: { where: string; text: string; fg: string; bg: string; ratio: number; needs: number; approximate: boolean; picture?: boolean }[];
    /** Texts over a picture, a canvas or a gradient, for the pixels of the screenshot. */
    pending: { where: string; text: string; fg: Rgba; needs: number; box: Box }[];
  };
  controls: { checked: number; unknown: number; fails: { where: string; ratio: number; bg: string }[] };
  targets: { checked: number; under44: number; crowdedCount: number; crowded: { where: string; size: string; touches: string }[] };
  edges: { count: number; top: { x: number; count: number; where: string[] }[] };
  lines: { longest: number; over: { where: string; perLine: number; lines: number }[] };
}

/** `rgb()`, `rgba()`, `#rgb`, `#rrggbb`, `#rrggbbaa`: red, green, blue 0-255 and alpha 0-1; null for anything else. */
export const parseColor = (text: string): Rgba | null => {
  const value = text.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(value);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const at = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [at(0), at(2), at(4), h.length === 8 ? Math.round((at(6) / 255) * 1000) / 1000 : 1];
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(value);
  if (!fn) return null;
  const parts = fn[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const channel = (p: string) => (p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p));
  const alpha = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
  const out: Rgba = [channel(parts[0]), channel(parts[1]), channel(parts[2]), alpha];
  return out.some((v) => Number.isNaN(v)) ? null : out;
};

/** `#rrggbb`, or `#rrggbbaa` when it is translucent. */
export const toHex = (c: Rgba): string => {
  const two = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${two(c[0])}${two(c[1])}${two(c[2])}${c[3] < 1 ? two(c[3] * 255) : ''}`;
};

/** The relative luminance of WCAG. */
export const luminance = (c: Rgba): number => {
  const linear = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
};

/** The contrast ratio of WCAG, 1 to 21. */
export const contrast = (a: Rgba, b: Rgba): number => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

/** `top` painted over `bottom`, which may be translucent too. */
export const blend = (top: Rgba, bottom: Rgba): Rgba => {
  const alpha = top[3] + bottom[3] * (1 - top[3]);
  if (alpha === 0) return [0, 0, 0, 0];
  const mix = (i: number) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / alpha;
  return [mix(0), mix(1), mix(2), alpha];
};

/** Within 2 on each channel, and 0.02 of alpha. */
export const sameColor = (a: Rgba, b: Rgba): boolean =>
  Math.abs(a[0] - b[0]) <= 2 && Math.abs(a[1] - b[1]) <= 2 && Math.abs(a[2] - b[2]) <= 2 && Math.abs(a[3] - b[3]) <= 0.02;

/** One space between words. */
export const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * A shadow without the layers that draw nothing (transparent, or every length 0), as utility
 * frameworks add them to compose rings and shadows; `none` when no layer is left.
 */
export const cleanShadow = (text: string): string => {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (text[i] === ',' && depth === 0) {
      layers.push(text.slice(start, i));
      start = i + 1;
    }
  }
  layers.push(text.slice(start));
  const kept = layers.map(squash).filter((layer) => {
    if (!layer || layer === 'none') return false;
    const color = /(?:rgba?|hsla?)\([^)]*\)/.exec(layer);
    const parsed = color ? parseColor(color[0]) : null;
    if (parsed && parsed[3] === 0) return false;
    const lengths = layer.replace(/\([^)]*\)/g, '').match(/-?\d*\.?\d+px/g) ?? [];
    return lengths.some((length) => parseFloat(length) !== 0);
  });
  return kept.join(', ') || 'none';
};

/** A spacing token that is a unit the scale multiplies (Tailwind's --spacing), not a step of it. */
export const isGridUnit = (name: string): boolean => /^--([a-z0-9]+-)?(spacing|space|grid|baseline)(-(unit|base))?$/i.test(name);

/**
 * The kind of a token: from what its value parses as (`supports`, CSS.supports in the page), then
 * from its name. Null when it is none of the kinds the checks compare.
 */
export const tokenKind = (
  name: string,
  raw: string,
  supports: { color: boolean; length: boolean; shadow: boolean },
): Kind | null => {
  const n = name.toLowerCase();
  if (supports.color) return 'color';
  if (supports.length) {
    if (/%/.test(raw)) return null;
    if (/radius|rounded|corner/.test(n)) return 'radius';
    if (/line-?height|leading/.test(n)) return 'line-height';
    if (/font-?size|text-?size|type-?(scale|size)|heading|display|body|caption/.test(n)) return 'font-size';
    if (/space|spacing|gap|gutter|margin|padding|inset|stack|offset|indent/.test(n)) return 'space';
    return 'length';
  }
  if (/^-?\d*\.?\d+$/.test(raw.trim())) {
    const number = Number(raw);
    if (/weight/.test(n)) return 'font-weight';
    if (/line-?height|leading/.test(n)) return 'line-height';
    if (/z-?index|layer|opacity|alpha|order|ratio|duration|delay|scale|columns|flex|count|index/.test(n)) return null;
    if (Number.isInteger(number) && number >= 100 && number <= 900 && number % 100 === 0) return 'font-weight';
    if (number >= 0.8 && number <= 3) return 'line-height';
    return null;
  }
  if (supports.shadow && raw.trim() !== 'none' && (/shadow|elevation|depth/.test(n) || /rgb|hsl|#|oklch|oklab|lab\(|lch\(|color|inset|,/.test(raw)))
    return 'shadow';
  return null;
};

/**
 * Whether a value is on the scale of its kind: true; false with the nearest token; null when the
 * design system has no token to compare it with.
 */
export const onScale = (
  kind: Kind,
  value: { px?: number; rgba?: Rgba; text?: string; fontSize?: number },
  tokens: Token[],
): { ok: boolean | null; nearest?: string } => {
  const lengths = kind === 'space' || kind === 'radius' || kind === 'font-size';
  const own = tokens.filter((t) => t.kind === kind);
  const scale = [...own, ...(lengths ? tokens.filter((t) => t.kind === 'length') : [])];
  if (!scale.length) return { ok: null };
  const px = (v: number) => `${Math.round(v * 100) / 100}px`;
  if (kind === 'color' && value.rgba) {
    const c = value.rgba;
    if (scale.some((t) => t.rgba && sameColor(t.rgba, c))) return { ok: true };
    const far = (t: Token) => (t.rgba ? Math.hypot(t.rgba[0] - c[0], t.rgba[1] - c[1], t.rgba[2] - c[2], (t.rgba[3] - c[3]) * 255) : Infinity);
    const near = [...scale].sort((a, b) => far(a) - far(b))[0];
    return { ok: false, nearest: near.rgba ? `${near.name} (${toHex(near.rgba)})` : near.name };
  }
  if (kind === 'shadow') {
    const text = squash(value.text ?? '');
    return scale.some((t) => t.text === text) ? { ok: true } : { ok: false };
  }
  if (value.px === undefined) return { ok: null };
  const v = value.px;
  const of = (t: Token) => (t.factor !== undefined ? t.factor * (value.fontSize ?? 16) : (t.px ?? NaN));
  const tolerance = kind === 'font-weight' ? 0 : 0.5;
  const steps = scale.filter((t) => !t.grid && Number.isFinite(of(t)));
  if (steps.some((t) => Math.abs(of(t) - v) <= tolerance)) return { ok: true };
  const grid = scale.find((t) => t.grid && (t.px ?? 0) > 0);
  if (grid && grid.px) {
    const times = Math.round(v / grid.px);
    if (Math.abs(times * grid.px - v) <= tolerance) return { ok: true };
    return { ok: false, nearest: `${grid.name} x ${times} (${px(times * grid.px)})` };
  }
  // the nearest among the tokens of its own kind, when the design system names some
  const named = steps.filter((t) => t.kind === kind);
  const near = (named.length ? named : steps).sort((a, b) => Math.abs(of(a) - v) - Math.abs(of(b) - v))[0];
  if (!near) return { ok: null };
  return { ok: false, nearest: `${near.name} (${kind === 'font-weight' ? of(near) : px(of(near))})` };
};

/** The left edges, `tolerance` px apart at most within one, the most used first. */
export const clusterEdges = (
  starts: { x: number; where: string }[],
  tolerance = 2,
): { x: number; count: number; where: string[] }[] => {
  const sorted = [...starts].sort((a, b) => a.x - b.x);
  const groups: { x: number; count: number; where: string[] }[] = [];
  for (const start of sorted) {
    const last = groups[groups.length - 1];
    if (last && start.x - last.x <= tolerance) {
      last.count++;
      if (last.where.length < 2 && !last.where.includes(start.where)) last.where.push(start.where);
    } else groups.push({ x: Math.round(start.x), count: 1, where: [start.where] });
  }
  return groups.sort((a, b) => b.count - a.count || a.x - b.x);
};

/**
 * The targets smaller than `size` x `size` whose circle of `size` px on their centre touches
 * another target, or the circle of another small target (WCAG 2.5.8), each with the first it
 * touches. A target that holds this one entirely (a row that is clickable) is not touching it.
 */
export const crowdedTargets = (
  targets: { box: Box; where: string }[],
  size = 24,
): { where: string; box: Box; touches: string }[] => {
  const small = (b: Box) => b.width < size || b.height < size;
  const centre = (b: Box) => [b.x + b.width / 2, b.y + b.height / 2];
  const holds = (outer: Box, inner: Box) =>
    outer.x <= inner.x + 0.5 &&
    outer.y <= inner.y + 0.5 &&
    outer.x + outer.width >= inner.x + inner.width - 0.5 &&
    outer.y + outer.height >= inner.y + inner.height - 0.5;
  const out: { where: string; box: Box; touches: string }[] = [];
  targets.forEach((target, i) => {
    if (!small(target.box)) return;
    const [cx, cy] = centre(target.box);
    for (let j = 0; j < targets.length; j++) {
      if (j === i) continue;
      const other = targets[j].box;
      if (holds(other, target.box) || holds(target.box, other)) continue;
      const dx = Math.max(other.x - cx, 0, cx - (other.x + other.width));
      const dy = Math.max(other.y - cy, 0, cy - (other.y + other.height));
      const [ox, oy] = centre(other);
      if (Math.hypot(dx, dy) < size / 2 || (small(other) && Math.hypot(cx - ox, cy - oy) < size)) {
        out.push({ where: target.where, box: target.box, touches: targets[j].where });
        return;
      }
    }
  });
  return out;
};

/** Everything the measured checks read, in the page. */
export const measure = (options: MeasureOptions): Measure | { error: string } => {
  const max = options.max ?? 40;
  const roots = options.selector ? Array.from(document.querySelectorAll(options.selector)) : [document.body];
  if (!roots.length) return { error: `nothing matches ${options.selector}` };
  const round = (v: number) => Math.round(v * 100) / 100;
  const px = (v: string) => parseFloat(v) || 0;

  // colours, through a canvas when they are not rgb()
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const paint = canvas.getContext('2d', { willReadFrequently: true });
  const colors = new Map<string, Rgba | null>();
  const rgba = (css: string): Rgba | null => {
    if (colors.has(css)) return colors.get(css) ?? null;
    let out = parseColor(css);
    if (!out && paint && CSS.supports('color', css)) {
      paint.clearRect(0, 0, 1, 1);
      paint.fillStyle = css;
      paint.fillRect(0, 0, 1, 1);
      const d = paint.getImageData(0, 0, 1, 1).data;
      out = [d[0], d[1], d[2], Math.round((d[3] / 255) * 1000) / 1000];
    }
    colors.set(css, out);
    return out;
  };

  // the tokens: custom properties with a value on the root
  const root = document.documentElement;
  const rootStyle = getComputedStyle(root);
  const names = new Set<string>();
  let unreadable = 0;
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      const style = (rule as CSSStyleRule).style;
      if (style) for (let i = 0; i < style.length; i++) if (style[i].startsWith('--')) names.add(style[i]);
      const inner = (rule as CSSGroupingRule).cssRules;
      if (inner) visit(inner);
    }
  };
  for (const sheet of [...Array.from(document.styleSheets), ...(document.adoptedStyleSheets ?? [])]) {
    try {
      visit(sheet.cssRules);
    } catch {
      unreadable++;
    }
  }
  for (let i = 0; i < root.style.length; i++) if (root.style[i].startsWith('--')) names.add(root.style[i]);

  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;border:0 solid';
  root.appendChild(probe);
  const probed = getComputedStyle(probe);
  const resolve = (property: string, name: string) => {
    probe.style.setProperty(property, `var(${name})`);
    const value = probed.getPropertyValue(property);
    probe.style.removeProperty(property);
    return value;
  };
  const tokens: Token[] = [];
  for (const name of names) {
    // Tailwind's own plumbing (rings, transforms), not tokens of the design system
    if (name.startsWith('--tw-')) continue;
    const raw = rootStyle.getPropertyValue(name).trim();
    if (!raw) continue;
    const supports = {
      color: CSS.supports('color', raw),
      length: CSS.supports('margin-left', raw) && raw !== 'auto',
      shadow: CSS.supports('box-shadow', raw),
    };
    const kind = tokenKind(name, raw, supports);
    if (!kind) continue;
    if (kind === 'color') {
      const c = rgba(resolve('color', name));
      if (c) tokens.push({ name, kind, rgba: c });
    } else if (kind === 'shadow') {
      const text = cleanShadow(resolve('box-shadow', name));
      if (text !== 'none') tokens.push({ name, kind, text });
    } else if (kind === 'font-weight') tokens.push({ name, kind, px: Number(resolve('font-weight', name)) });
    else if (kind === 'line-height' && !supports.length) tokens.push({ name, kind, factor: Number(raw) });
    else {
      const value = parseFloat(resolve('margin-left', name));
      const grid = (kind === 'space' || kind === 'length') && isGridUnit(name);
      if (Number.isFinite(value)) tokens.push({ name, kind: grid ? 'space' : kind, px: Math.abs(value), ...(grid ? { grid } : {}) });
    }
  }

  // the elements, open shadow roots included
  const skip = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'LINK', 'META', 'HEAD', 'TITLE']);
  const svgNs = 'http://www.w3.org/2000/svg';
  const elements: Element[] = [];
  const stack: Element[] = [...roots].reverse();
  while (stack.length && elements.length < 20000) {
    const el = stack.pop() as Element;
    if (skip.has(el.tagName) || el === probe) continue;
    elements.push(el);
    if (el.namespaceURI === svgNs) continue;
    const kids = [...Array.from(el.children), ...(el.shadowRoot ? Array.from(el.shadowRoot.children) : [])];
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }

  const parentOf = (e: Element): Element | null => e.parentElement ?? ((e.getRootNode() as ShadowRoot).host || null);
  const label = (el: Element): string => {
    const parts: string[] = [];
    let e: Element | null = el;
    while (e && parts.length < 3 && e !== document.body && e !== root) {
      const id = e.id && /^[A-Za-z][\w-]*$/.test(e.id) ? `#${e.id}` : '';
      const classes = Array.from(e.classList).filter((c) => /^[A-Za-z_][\w-]*$/.test(c)).slice(0, 2);
      let part = id || e.tagName.toLowerCase() + classes.map((c) => `.${c}`).join('');
      const tag = e.tagName;
      const twins = e.parentElement ? Array.from(e.parentElement.children).filter((c) => c.tagName === tag) : [];
      if (!id && twins.length > 1) part += `:nth-of-type(${twins.indexOf(e) + 1})`;
      parts.unshift(part);
      if (id) break;
      e = parentOf(e);
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
  };
  const visible = (el: Element, r: DOMRect) => {
    if (r.width <= 0 || r.height <= 0) return false;
    const check = (el as Element & { checkVisibility?: (o: object) => boolean }).checkVisibility;
    return check ? check.call(el, { opacityProperty: true, visibilityProperty: true }) : getComputedStyle(el).visibility !== 'hidden';
  };
  const ownText = (el: Element) =>
    squash(
      Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent ?? '')
        .join(' '),
    );

  const scheme = rootStyle.colorScheme || 'normal';
  const dark = /dark/.test(scheme) && (!/light/.test(scheme) || matchMedia('(prefers-color-scheme: dark)').matches);
  const canvasColor: Rgba = dark ? [18, 18, 18, 1] : [255, 255, 255, 1];
  const below = new Map<Element, { color: Rgba | null; approximate: boolean }>();
  const under = (el: Element | null): { color: Rgba | null; approximate: boolean } => {
    if (el && below.has(el)) return below.get(el) as { color: Rgba | null; approximate: boolean };
    const layers: Rgba[] = [];
    let approximate = false;
    let unknown = false;
    for (let e = el; e; e = parentOf(e)) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== 'none') {
        unknown = true;
        break;
      }
      if (Number(s.opacity) < 1) approximate = true;
      const c = rgba(s.backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    let color: Rgba | null = canvasColor;
    for (let i = layers.length - 1; i >= 0; i--) color = blend(layers[i], color);
    const result = { color: unknown ? null : color, approximate };
    if (el) below.set(el, result);
    return result;
  };

  const off = new Map<string, OffScale>();
  const untested = new Set<Kind>();
  // what the current element already counted: a padding of 13 px on four sides is one element
  let counted = new Set<string>();
  const note = (kind: Kind, value: { px?: number; rgba?: Rgba; text?: string; fontSize?: number }, shown: string, as: string, el: Element) => {
    const result = onScale(kind, value, tokens);
    if (result.ok === null) untested.add(kind);
    if (result.ok !== false) return;
    const key = `${kind}|${shown}`;
    const hit = off.get(key) ?? { kind, value: shown, as: [], where: [], nearest: result.nearest, count: 0 };
    if (!counted.has(key)) hit.count++;
    counted.add(key);
    if (!hit.as.includes(as)) hit.as.push(as);
    const where = label(el);
    if (hit.where.length < 3 && !hit.where.includes(where)) hit.where.push(where);
    off.set(key, hit);
  };
  const tally = { sizes: new Map<string, number>(), weights: new Map<string, number>(), textColors: new Map<string, number>(), fills: new Map<string, number>() };
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  const TARGET =
    'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], [role=menuitem], [role=option], [tabindex]:not([tabindex="-1"])';
  const CONTROL =
    'input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]):not([type=image]), select, textarea, [role=checkbox], [role=radio], [role=switch], [role=textbox], [role=combobox], [role=slider], [role=spinbutton]';
  const DISABLED = ':disabled, [aria-disabled="true"], [inert]';
  const BLOCK = /^(block|list-item|flex|grid|table-cell|table-caption|flow-root)$/;
  const sides = ['top', 'right', 'bottom', 'left'];

  const contrastFails: Measure['contrast']['fails'] = [];
  const counts = { checked: 0, unknown: 0, approximate: 0, controls: 0, controlsUnknown: 0 };
  const controlFails: Measure['controls']['fails'] = [];
  const starts: { x: number; where: string }[] = [];
  const lines: Measure['lines']['over'] = [];
  let longest = 0;
  const targets: { box: Box; where: string }[] = [];
  const texts: { el: Element; fg: Rgba; size: number; weight: number; text: string; box: Box; x: number; y: number }[] = [];
  const pending: Measure['contrast']['pending'] = [];

  for (const el of elements) {
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    counted = new Set<string>();
    const s = getComputedStyle(el);
    const svg = el.namespaceURI === svgNs;

    if (!svg) {
      for (const side of sides) {
        const p = px(s.getPropertyValue(`padding-${side}`));
        if (p > 1) note('space', { px: p }, `${round(p)}px`, 'padding', el);
      }
      const left = px(s.marginLeft);
      const right = px(s.marginRight);
      const centred = Math.abs(left) > 1 && Math.abs(left - right) <= 1;
      const margins: [string, number][] = [
        ['top', px(s.marginTop)],
        ['bottom', px(s.marginBottom)],
      ];
      if (!centred) margins.push(['left', left], ['right', right]);
      for (const [, v] of margins) if (Math.abs(v) > 1) note('space', { px: Math.abs(v) }, `${round(Math.abs(v))}px`, 'margin', el);
      if (/flex|grid/.test(s.display))
        for (const gap of [s.rowGap, s.columnGap]) {
          const v = px(gap);
          if (v > 1) note('space', { px: v }, `${round(v)}px`, 'gap', el);
        }

      const radii = new Set<number>();
      for (const corner of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) {
        const raw = s.getPropertyValue(`border-${corner}-radius`).split(' ')[0];
        if (!raw || raw.endsWith('%')) continue;
        const v = px(raw);
        if (v > 1 && v < Math.min(r.width, r.height) / 2 - 0.5) radii.add(round(v));
      }
      for (const v of radii) note('radius', { px: v }, `${v}px`, 'border-radius', el);

      const shadow = s.boxShadow && s.boxShadow !== 'none' ? cleanShadow(s.boxShadow) : 'none';
      if (shadow !== 'none') note('shadow', { text: shadow }, shadow.length > 48 ? `${shadow.slice(0, 45)}...` : shadow, 'box-shadow', el);

      const fill = rgba(s.backgroundColor);
      if (fill && fill[3] > 0) {
        note('color', { rgba: fill }, toHex(fill), 'background', el);
        bump(tally.fills, toHex(fill));
      }
      const borders = new Set<string>();
      for (const side of sides) {
        if (px(s.getPropertyValue(`border-${side}-width`)) <= 0 || /none|hidden/.test(s.getPropertyValue(`border-${side}-style`))) continue;
        const c = rgba(s.getPropertyValue(`border-${side}-color`));
        if (c && c[3] > 0) borders.add(toHex(c));
      }
      for (const hex of borders) note('color', { rgba: parseColor(hex) ?? undefined }, hex, 'border', el);
    }

    const text = svg ? '' : ownText(el);
    if (text) {
      const size = px(s.fontSize);
      const weight = Number(s.fontWeight) || 400;
      bump(tally.sizes, `${round(size)}`);
      bump(tally.weights, `${weight}`);
      note('font-size', { px: size }, `${round(size)}px`, 'font-size', el);
      note('font-weight', { px: weight }, `${weight}`, 'font-weight', el);
      if (s.lineHeight !== 'normal') note('line-height', { px: px(s.lineHeight), fontSize: size }, `${round(px(s.lineHeight))}px`, 'line-height', el);
      const fg = rgba(s.color);
      if (fg) {
        note('color', { rgba: fg }, toHex(fg), 'color', el);
        bump(tally.textColors, toHex(fg));
        const node = Array.from(el.childNodes).find((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
        if (node && !el.closest(DISABLED)) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const b = range.getBoundingClientRect();
          // the point on the first line, since the middle of a text on several lines may fall between them
          const line = range.getClientRects()[0] ?? b;
          const box = { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height };
          if (box.width && box.height)
            texts.push({ el, fg, size, weight, text, box, x: line.left + line.width / 2 + scrollX, y: line.top + line.height / 2 + scrollY });
        }
      }
      if (BLOCK.test(s.display)) {
        const node = Array.from(el.childNodes).find((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
        if (node) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const first = range.getClientRects()[0];
          if (first) starts.push({ x: first.left, where: label(el) });
        }
        const nested = Array.from(el.children).some((child) => BLOCK.test(getComputedStyle(child).display));
        if (!nested) {
          const lineHeight = s.lineHeight === 'normal' ? size * 1.2 : px(s.lineHeight);
          const count = Math.max(1, Math.round((r.height - px(s.paddingTop) - px(s.paddingBottom)) / lineHeight));
          const all = squash((el as HTMLElement).innerText ?? text);
          if (count >= 2) {
            const perLine = Math.round(all.length / count);
            longest = Math.max(longest, perLine);
            if (perLine > 80) lines.push({ where: label(el), perLine, lines: count });
          }
        }
      }
    }

    if (el.matches(TARGET)) {
      const parent = el.parentElement;
      const inline =
        el.tagName === 'A' &&
        s.display === 'inline' &&
        !!parent &&
        Array.from(parent.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
      if (!inline && r.width * r.height > 4)
        targets.push({ box: { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }, where: label(el) });
    }

    if (el.matches(CONTROL) && !el.closest(DISABLED)) {
      const type = (el as HTMLInputElement).type ?? '';
      if (s.appearance === 'auto' && /checkbox|radio|range|color|file/.test(type)) counts.controlsUnknown++;
      else {
        const around = under(parentOf(el));
        if (!around.color) counts.controlsUnknown++;
        else {
          counts.controls++;
          let best = 1;
          for (const side of sides) {
            if (px(s.getPropertyValue(`border-${side}-width`)) <= 0 || /none|hidden/.test(s.getPropertyValue(`border-${side}-style`))) continue;
            const c = rgba(s.getPropertyValue(`border-${side}-color`));
            if (c) best = Math.max(best, contrast(blend(c, around.color), around.color));
          }
          const own = rgba(s.backgroundColor);
          if (own && own[3] > 0) best = Math.max(best, contrast(blend(own, around.color), around.color));
          if (best < 2.995) controlFails.push({ where: label(el), ratio: round(best), bg: toHex(around.color) });
        }
      }
    }
  }
  probe.remove();

  // contrast: what is painted under the middle of the text, which may not be an ancestor (a text
  // over a picture placed beside it); every element takes the pointer meanwhile, so a picture that
  // lets it through still counts; a point outside the window is brought in by scrolling
  const hits = document.createElement('style');
  hits.textContent = '* { pointer-events: auto !important; }';
  (document.head ?? root).appendChild(hits);
  const media = /^(IMG|VIDEO|CANVAS|IFRAME|PICTURE|OBJECT|EMBED)$/;
  const painted = (el: Element, x: number, y: number): { color: Rgba | null; approximate: boolean } => {
    // inside a shadow root, its own elementsFromPoint, which does not stop at the host
    const scope = el.getRootNode() as Document | ShadowRoot;
    const stack = (scope.elementsFromPoint ? scope : document).elementsFromPoint(x, y);
    let from = -1;
    for (let e: Element | null = el; e && from < 0; e = parentOf(e)) from = stack.indexOf(e);
    if (from < 0) return under(el);
    const layers: Rgba[] = [];
    let approximate = false;
    for (const e of stack.slice(from)) {
      const s = getComputedStyle(e);
      if (Number(s.opacity) === 0) continue;
      if (media.test(e.tagName) || (e.namespaceURI === svgNs && e !== el) || s.backgroundImage !== 'none') return { color: null, approximate };
      if (Number(s.opacity) < 1 || (s.backdropFilter && s.backdropFilter !== 'none')) approximate = true;
      const c = rgba(s.backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    let color: Rgba = canvasColor;
    for (let i = layers.length - 1; i >= 0; i--) color = blend(layers[i], color);
    return { color, approximate };
  };
  const startX = scrollX;
  const startY = scrollY;
  for (const t of texts.sort((a, b) => a.y - b.y)) {
    if (t.y < scrollY || t.y >= scrollY + innerHeight)
      window.scrollTo({ left: startX, top: Math.max(0, t.y - innerHeight / 2), behavior: 'instant' as ScrollBehavior });
    const x = t.x - scrollX;
    const y = t.y - scrollY;
    const back = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight ? painted(t.el, x, y) : under(t.el);
    if (!back.color) {
      // over a picture, a canvas or a gradient: measured on the pixels of the screenshot instead
      counts.unknown++;
      if (pending.length < 300)
        pending.push({
          where: label(t.el),
          text: t.text.length > 40 ? `${t.text.slice(0, 37)}...` : t.text,
          fg: t.fg,
          needs: t.size >= 24 || (t.size >= 18.66 && t.weight >= 700) ? 3 : 4.5,
          box: t.box,
        });
      continue;
    }
    counts.checked++;
    if (back.approximate) counts.approximate++;
    const ratio = contrast(blend(t.fg, back.color), back.color);
    const needs = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700) ? 3 : 4.5;
    if (ratio < needs - 0.005)
      contrastFails.push({
        where: label(t.el),
        text: t.text.length > 40 ? `${t.text.slice(0, 37)}...` : t.text,
        fg: toHex(t.fg),
        bg: toHex(back.color),
        ratio: round(ratio),
        needs,
        approximate: back.approximate,
      });
  }
  window.scrollTo({ left: startX, top: startY, behavior: 'instant' as ScrollBehavior });
  hits.remove();

  const crowded = crowdedTargets(targets.slice(0, 2000));
  const sorted = (m: Map<string, number>, byValue: boolean) =>
    [...m.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => (byValue ? parseFloat(a.value) - parseFloat(b.value) : b.count - a.count));
  const rows = [...off.values()].sort((a, b) => b.count - a.count);
  const byKind: Record<string, number> = {};
  for (const t of tokens) byKind[t.kind] = (byKind[t.kind] ?? 0) + 1;
  const edges = clusterEdges(starts);
  return {
    url: location.href,
    width: innerWidth,
    dark,
    elements: elements.length,
    tokens: { count: tokens.length, byKind, unreadable },
    offScale: { total: rows.length, rows: rows.slice(0, max), untested: [...untested] },
    distinct: {
      sizes: sorted(tally.sizes, true),
      weights: sorted(tally.weights, true),
      textColors: sorted(tally.textColors, false),
      fills: sorted(tally.fills, false),
    },
    contrast: {
      checked: counts.checked,
      unknown: counts.unknown,
      approximate: counts.approximate,
      failCount: contrastFails.length,
      fails: contrastFails.sort((a, b) => a.ratio - b.ratio).slice(0, max),
      pending,
    },
    controls: { checked: counts.controls, unknown: counts.controlsUnknown, fails: controlFails.slice(0, max) },
    targets: {
      checked: targets.length,
      under44: targets.filter((t) => t.box.width < 44 || t.box.height < 44).length,
      crowdedCount: crowded.length,
      crowded: crowded.slice(0, max).map((c) => ({ where: c.where, size: `${round(c.box.width)} x ${round(c.box.height)}`, touches: c.touches })),
    },
    edges: { count: edges.length, top: edges.slice(0, 8) },
    lines: { longest, over: lines.sort((a, b) => b.perLine - a.perLine).slice(0, max) },
  };
};

/** The functions the page needs, by the name they call each other with. */
export const PAGE = {
  parseColor,
  toHex,
  luminance,
  contrast,
  blend,
  sameColor,
  squash,
  cleanShadow,
  isGridUnit,
  tokenKind,
  onScale,
  clusterEdges,
  crowdedTargets,
  measure,
};

/** One JavaScript expression whose value is the measure of the page it runs in. */
export const pageExpression = (options: MeasureOptions = {}): string =>
  [
    '(() => {',
    ...Object.entries(PAGE).map(([name, fn]) => `const ${name} = ${fn.toString()};`),
    `return measure(${JSON.stringify(options)});`,
    '})()',
  ].join('\n');
