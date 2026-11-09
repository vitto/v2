// The scene of the Magma Studio video (2026-11-09), an example for /v2:product-to-linkedin:
// one take on the live studio, about 32 seconds.
//
//   node scripts/linkedin-video.ts --scene=examples/product-to-linkedin/magma-studio.mjs --lang=en --out=out
//
// 1. The Start page: its hero plays by itself (a pale banner fixed until the contrast gate passes).
// 2. The Colors menu opens Semantic surface, at 90% so the studio lays its targets beside their
//    live preview; the page scrolls to them, the target of the default text goes under the floor
//    of the gate (the preview marks the pairs under it), then back up (the preview passes).
// 3. The Theme page: a product page, dark from the Accessibility panel, then from a neutral theme
//    to a warm one.
// 4. The Config menu: what a product takes away. Then the closing card.

const TEXTS = {
  en: {
    problem: 'Text, icons and actions too faint to read?',
    fix: 'Magma Studio solves the colours until every contrast passes',
    lower: 'Lower a target: the preview flags it at once',
    raise: 'Raise it: every contrast passes again',
    theme: 'Judge the theme on a real product page',
    dark: 'Light or dark, at a click',
    warm: 'And every theme, from neutral to warm',
    config: 'Then take it: tokens for code, Figma, CSS and GIMP',
    line: 'The theme of your product, readable by everyone',
  },
  it: {
    problem: 'Testi, icone e azioni troppo chiari per leggerli?',
    fix: 'Magma Studio risolve i colori finch\u00e9 ogni contrasto passa',
    lower: "Abbassa un target: l'anteprima lo segnala subito",
    raise: 'Rialzalo: ogni contrasto torna a passare',
    theme: 'Giudica il tema su una vera pagina di prodotto',
    dark: 'Chiaro o scuro, con un clic',
    warm: 'E ogni tema, da neutro a caldo',
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
  // At 90% (a content 1200 pixels wide) the studio sets the targets beside their live preview:
  // the zoom is set while the take is cut, so the page comes in already laid out.
  t.pause();
  await t.waitFor(`document.querySelector('mds-input-range')`);
  await t.evaluate(`document.querySelector('main.content').style.zoom = '0.9'`);
  await t.settle();
  await t.sleep(300);
  t.resume();
  await t.sleep(1000);
  const LEVELS = { js: `[...document.querySelectorAll('main.content *')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Lightness levels (%)')` };
  await t.scroll('main.content', LEVELS);
  await t.probe('scrolled');
  const target = await t.evaluate(`+document.querySelector('mds-input-range').value`);
  await t.caption(text.lower);
  await t.slide('mds-input-range', 38, 1100);
  await t.sleep(500);
  // The pointer to the preview: just right of the badge of the default text, in light.
  const badge = await t.evaluate(`(() => { const b = [...document.querySelectorAll('.surfaces-preview mds-badge')]
    .find((e) => e.getBoundingClientRect().width).getBoundingClientRect();
    return { x: Math.round(b.right + 40), y: Math.round(b.y + b.height / 2) }; })()`);
  await t.move(badge, 700);
  await t.sleep(1200);
  await t.probe('lowered');
  await t.caption(text.raise);
  await t.slide('mds-input-range', target, 1000);
  await t.sleep(1300);
  await t.probe('raised');
  const back = await t.evaluate(`+document.querySelector('mds-input-range').value`);
  if (back !== target) throw new Error(`The target came back to ${back}, not ${target}`);

  // 3. Theme: the product page cuts in once hydrated; dark first, then a warm theme.
  await t.caption(null);
  await t.click({ js: `[...document.querySelectorAll('[href="#/theme"]')].find((e) => e.getBoundingClientRect().width)` }, 900);
  t.pause();
  await t.evaluate(`document.querySelector('main.content').style.zoom = ''`);
  await t.waitFor(SCENE_READY, 15000);
  await t.sleep(400);
  t.resume();
  await t.caption(text.theme);
  await t.probe('theme');
  await t.sleep(900);
  await t.click('#studio-axis-preferences', 800);
  await t.sleep(600);
  await t.probe('prefs');
  await t.caption(text.dark);
  await t.click({ js: `[...document.querySelectorAll('mds-tab-item')].find((e) => e.getAttribute('value') === 'dark' && e.getBoundingClientRect().width)` }, 700);
  await t.sleep(600);
  await t.key('Escape');
  await t.sleep(700);
  await t.probe('dark');
  await t.caption(text.warm);
  await t.choose({ js: `[...document.querySelectorAll('mds-input-select')].find((e) => [...e.querySelectorAll('option')].some((o) => o.value === 'editorial'))` }, 'editorial');
  await t.sleep(1500);
  await t.probe('warm');

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
