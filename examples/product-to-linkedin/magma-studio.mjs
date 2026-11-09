// The scene of the Magma Studio video (2026-11-09), an example for /v2:product-to-linkedin:
// one take on the live studio, about 32 seconds.
//
//   node scripts/linkedin-video.ts --scene=examples/product-to-linkedin/magma-studio.mjs --lang=en --out=out
//
// 1. The Start page: its hero plays by itself (a pale banner fixed until the contrast gate passes).
// 2. The Colors menu opens Semantic surface; the target of the default text goes under the floor
//    of the gate (the badge turns red), the page scrolls to its live preview, where the pairs
//    under their floor show, and the keyboard brings the target back while the preview passes.
// 3. The Theme page: a product page, another theme, then dark from the Accessibility panel.
// 4. The Config menu: what a product takes away. Then the closing card.

const TEXTS = {
  en: {
    problem: 'Text, icons and actions too faint to read?',
    fix: 'Magma Studio solves the colours until every contrast passes',
    lower: 'Lower a target: the gate flags it at once',
    preview: 'The live preview marks every pair below it',
    raise: 'Raise it: every contrast passes again',
    theme: 'Judge the theme on a real product page',
    dark: 'In every theme, light and dark',
    config: 'Then take it: tokens for code, Figma, CSS and GIMP',
    line: 'The theme of your product, readable by everyone',
  },
  it: {
    problem: 'Testi, icone e azioni troppo chiari per leggerli?',
    fix: 'Magma Studio risolve i colori finch\u00e9 ogni contrasto passa',
    lower: 'Abbassa un target: il gate lo segnala subito',
    preview: "L'anteprima segna ogni coppia sotto soglia",
    raise: 'Rialzalo: ogni contrasto torna a passare',
    theme: 'Giudica il tema su una vera pagina di prodotto',
    dark: 'In ogni tema, chiaro e scuro',
    config: 'Poi portalo via: token per il codice, Figma, CSS e GIMP',
    line: 'Il tema del tuo prodotto, leggibile da tutti',
  },
};

const BASE = 'https://magma-design-system.github.io/magma/studio/';
/** The product page of the Theme section, in its iframe, with every Magma component hydrated. */
const SCENE_READY = `(() => { const f = document.querySelector('iframe[src*="scene"]'); const d = f?.contentDocument;
  return d?.readyState === 'complete' && d.querySelector('mds-banner, mds-card, mds-button')
    && ![...d.querySelectorAll('*')].some((e) => e.localName.startsWith('mds-') && !e.hasAttribute('hydrated')); })()`;

export default async function scene(t) {
  const text = TEXTS[t.lang] ?? TEXTS.en;

  // Warm up off the take: the studio, its fonts and icons, the product page of Theme.
  await t.open(`${BASE}#/theme`);
  await t.waitFor(SCENE_READY, 15000);
  await t.open('#/colors/palette');
  await t.sleep(800);

  // 1. Start: the take begins as the hero's banner is ready, its play starting by itself.
  await t.open('#/start');
  await t.waitFor(`document.querySelector('figure.start-stage iframe')?.contentDocument?.querySelector('mds-banner')?.hasAttribute('hydrated')`);
  t.mark();
  await t.caption(text.problem);
  await t.probe('start');
  await t.waitFor(`document.querySelector('figure.start-stage')?.dataset.phase === 'fixing'`, 8000);
  await t.caption(text.fix);
  await t.waitFor(`document.querySelector('figure.start-stage')?.dataset.phase === 'fixed'`, 8000);
  await t.probe('fixed');
  await t.sleep(1000);

  // 2. Semantic surface, from the Colors menu.
  await t.caption(null);
  await t.click('#studio-colors', 900);
  await t.sleep(550);
  await t.probe('colors-menu');
  await t.click({ js: `[...document.querySelectorAll('[href="#/colors/semantic-surface"]')].find((e) => e.getBoundingClientRect().width)` }, 650);
  await t.sleep(700);
  await t.settle();
  const target = await t.evaluate(`+document.querySelector('mds-input-range').value`);
  await t.caption(text.lower, { bottom: 24 });
  await t.slide('mds-input-range', 38, 1100);
  await t.sleep(1000);
  await t.probe('lowered');
  // Down to the live preview; the slider keeps the focus the drag gave it.
  await t.caption(text.preview, { bottom: 24 });
  await t.scroll('main.content', 'end');
  // The pointer just right of the badge of the default text, in light: it points, it covers nothing.
  const badge = await t.evaluate(`(() => { const b = [...document.querySelectorAll('.surfaces-preview mds-badge')]
    .find((e) => e.getBoundingClientRect().width).getBoundingClientRect();
    return { x: Math.round(b.right + 12), y: Math.round(b.y + b.height / 2) }; })()`);
  await t.move(badge, 700);
  await t.sleep(1300);
  await t.probe('preview-under');
  await t.caption(text.raise, { bottom: 24 });
  // Every change solves the palette again, so a run of 50 arrows would crawl: PageUp moves a tenth
  // of the range at a time, the arrows only the last steps.
  for (let i = 0; i < 30; i++) {
    const value = await t.evaluate(`+document.querySelector('mds-input-range').value`);
    if (value === target) break;
    if (target - value >= 11) await t.key('PageUp');
    else await t.key(value < target ? 'ArrowRight' : 'ArrowLeft', Math.abs(target - value));
    await t.sleep(160);
  }
  await t.sleep(1100);
  await t.probe('raised');
  const back = await t.evaluate(`+document.querySelector('mds-input-range').value`);
  if (back !== target) throw new Error(`The target came back to ${back}, not ${target}`);

  // 3. Theme: the product page cuts in once hydrated, then another theme, then dark.
  await t.caption(null);
  await t.click({ js: `[...document.querySelectorAll('[href="#/theme"]')].find((e) => e.getBoundingClientRect().width)` }, 900);
  t.pause();
  await t.waitFor(SCENE_READY, 15000);
  await t.sleep(400);
  t.resume();
  await t.caption(text.theme);
  await t.probe('theme');
  await t.choose({ js: `[...document.querySelectorAll('mds-input-select')].find((e) => [...e.querySelectorAll('option')].some((o) => o.value === 'editorial'))` }, 'editorial');
  await t.sleep(1100);
  await t.probe('editorial');
  await t.click('#studio-axis-preferences', 700);
  await t.sleep(600);
  await t.probe('prefs');
  await t.caption(text.dark);
  await t.click({ js: `[...document.querySelectorAll('mds-tab-item')].find((e) => e.getAttribute('value') === 'dark' && e.getBoundingClientRect().width)` }, 700);
  await t.sleep(600);
  await t.key('Escape');
  await t.move({ x: 778, y: 675 }, 600);
  await t.sleep(700);
  await t.probe('dark');

  // 4. Config, then the closing card.
  await t.caption(null);
  await t.click('#studio-config', 900);
  await t.sleep(400);
  await t.caption(text.config);
  await t.probe('config');
  await t.sleep(2200);
  await t.outro({
    logo: 'a.studio-product img',
    title: 'Magma Studio',
    line: text.line,
    url: 'magma-design-system.github.io/magma/studio',
  });
  await t.probe('outro');
}
