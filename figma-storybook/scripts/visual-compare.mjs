// Confronto visivo tra le story e gli screenshot Figma.
//
// Uso (con Storybook acceso: npm run storybook):
//   npm run visual                       # confronta tutto, report in visual-report/index.html
//   SB_URL=http://host:port npm run visual
//   VISUAL_TOLERANCE=0.01 npm run visual  # quota massima di pixel diversi (default 0.02 = 2%: il testo resta
//                                          leggermente diverso tra Figma e Chromium, un errore vero pesa molto di più)
//
// Cosa confronta:
// - componenti (Button, Input, Card): ogni variante (o la story Default) ↔ screenshot del plugin fx-export in
//   figma/export/, composto su bianco (il plugin esporta con lo sfondo trasparente); `render` dell'export dà lo
//   scostamento dello screenshot rispetto al componente (ombre), la misura del componente viene dal suo albero;
// - schermate (Login, da figma/manifest.json): screenshot in figma/screenshots/ ↔ story `visualStory`, con viewport grande
//   quanto il frame.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SB = (process.env.SB_URL ?? 'http://localhost:6007').replace(/\/$/, '');
const TOLERANCE = Number(process.env.VISUAL_TOLERANCE ?? 0.02);
const CANVAS_BG = 'rgb(229, 229, 229)'; // sfondo di riserva per i componenti senza `bg`
const OUT = join(root, 'visual-report');
const manifest = JSON.parse(readFileSync(join(root, 'figma', 'manifest.json'), 'utf8'));
const WHITE = 'rgb(255, 255, 255)';

const readPng = (rel) => PNG.sync.read(readFileSync(join(root, 'figma', rel)));

/** PNG con trasparenza → composto su bianco. */
function onWhite(png) {
  const out = new PNG({ width: png.width, height: png.height });
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3] / 255;
    for (let c = 0; c < 3; c++) out.data[i + c] = Math.round(png.data[i + c] * a + 255 * (1 - a));
    out.data[i + 3] = 255;
  }
  return out;
}

// ---- Elenco dei confronti: componenti dagli export, schermate dal manifest ----

const targets = [];
{
  const dir = join(root, 'figma', 'export');
  const pascal = (s) => s.replace(/(^|[\s-]+)(\w)/g, (_, __, c) => c.toUpperCase());
  // Eccezioni dichiarate: `visual` nel rules.json del componente, per story, con soglia e motivo (scritti a mano)
  const rulesOf = (id) => { const p = join(root, 'src', 'components', id, `${id}.rules.json`); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}; };
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'variables.json').sort()) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const name = data.component.name;
    const items = data.variants.length
      ? data.variants.map((v) => ({ story: pascal(Object.values(v.values)[0]), render: v.render, shot: v.screenshot, tree: v.tree, label: v.name, nodeId: v.nodeId }))
      : [{ story: 'Default', render: data.render, shot: data.screenshot, tree: data.tree, label: name, nodeId: data.component.nodeId }];
    for (const it of items) {
      targets.push({ key: `${name}-${it.story}`, label: `${name} / ${it.label} (${it.nodeId})`, title: `Componenti/${pascal(name)}`, story: it.story,
        ref: onWhite(PNG.sync.read(readFileSync(join(dir, it.shot)))), size: [it.render[2], it.render[3]], offset: [it.render[0], it.render[1]],
        nodeSize: [it.tree.size.width.value, it.tree.size.height.value], kind: 'component', bg: WHITE,
        exception: rulesOf(f.replace(/\.json$/, '')).visual?.[it.story] });
    }
  }
}
for (const node of manifest.screens) {
  targets.push({ key: `${node.name.replace(/\W+/g, '-')}-${node.visualStory}`, label: `${node.name} (${node.nodeId})`, title: node.stories,
    story: node.visualStory, ref: readPng(node.screenshot), size: node.size, kind: 'screen' });
}

// ---- Story ids da index.json ----

let index;
try {
  index = await fetch(`${SB}/index.json`).then((r) => r.json());
} catch {
  console.error(`Storybook non risponde su ${SB}: avvialo con "npm run storybook" (o imposta SB_URL).`);
  process.exit(2);
}
const storyId = (title, exportName) =>
  Object.values(index.entries).find((e) => e.type === 'story' && e.title === title && e.exportName === exportName)?.id;

// ---- Foto e confronto ----

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
// Testo in scala di grigi e senza hinting, come lo rasterizza Figma (su Windows Chromium userebbe ClearType a colori)
const browser = await chromium.launch({ args: ['--disable-lcd-text', '--font-render-hinting=none'] });
const results = [];

for (const t of targets) {
  const id = storyId(t.title, t.story);
  if (!id) {
    results.push({ ...t, error: `story ${t.title} › ${t.story} non trovata` });
    continue;
  }
  const [w, h] = t.size;
  const page = await browser.newPage({
    viewport: t.kind === 'screen' ? { width: w, height: h } : { width: 800, height: 600 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${SB}/iframe.html?id=${id}&viewMode=story`);
  await page.waitForSelector('#storybook-root > *');
  if (t.kind === 'component') {
    await page.addStyleTag({ content: `html, body, .sb-show-main, #storybook-root { background: ${t.bg ?? CANVAS_BG} !important; }` });
  }
  await page.addStyleTag({ content: '*, *::before, *::after { caret-color: transparent !important; transition: none !important; animation: none !important; }' });
  await page.evaluate(() => document.fonts.ready);

  let clip = { x: 0, y: 0, width: w, height: h };
  let actualSize = [w, h];
  if (t.kind === 'component') {
    const box = await page.locator('#storybook-root > *').first().boundingBox();
    actualSize = [Math.round(box.width), Math.round(box.height)];
    const [ox, oy] = t.offset ?? [0, 0];
    clip = { x: Math.round(box.x) + ox, y: Math.round(box.y) + oy, width: w, height: h };
  }
  const actual = PNG.sync.read(await page.screenshot({ clip }));
  await page.close();

  const diff = new PNG({ width: w, height: h });
  const changed = pixelmatch(t.ref.data, actual.data, diff.data, w, h, { threshold: 0.1 });
  const ratio = changed / (w * h);
  writeFileSync(join(OUT, `${t.key}-figma.png`), PNG.sync.write(t.ref));
  writeFileSync(join(OUT, `${t.key}-story.png`), PNG.sync.write(actual));
  writeFileSync(join(OUT, `${t.key}-diff.png`), PNG.sync.write(diff));
  // 1px di scarto è ammesso: la larghezza del testo varia di frazioni di pixel tra il motore di Figma e Chromium
  const [ew, eh] = t.nodeSize ?? [w, h];
  const sizeOk = Math.abs(actualSize[0] - ew) <= 1 && Math.abs(actualSize[1] - eh) <= 1;
  const limit = t.exception ? t.exception.tolerance : TOLERANCE;
  results.push({ ...t, id, changed, ratio, actualSize, sizeOk, limit, pass: ratio <= limit && sizeOk });
}
await browser.close();

// ---- Report ----

const pct = (r) => `${(r * 100).toFixed(2)}%`;
for (const r of results) {
  if (r.error) console.log(`ERRORE  ${r.label}: ${r.error}`);
  else console.log(`${r.pass ? 'ok    ' : 'DIVERSO'}  ${r.label}  ${pct(r.ratio)} pixel diversi` +
    (r.exception ? `  · eccezione dichiarata (soglia ${pct(r.limit)}): ${r.exception.reason}` : '') +
    (r.sizeOk ? '' : `  · misura story ${r.actualSize.join('×')} invece di ${r.size.join('×')}`));
}

const rows = results.map((r) => r.error
  ? `<tr><td>${r.label}</td><td colspan="4" class="ko">${r.error}</td></tr>`
  : `<tr><td>${r.label}<br><small>${r.id}</small><br><b class="${r.pass ? 'ok' : 'ko'}">${pct(r.ratio)}</b>` +
    `${r.exception ? `<br><small>eccezione dichiarata: soglia ${pct(r.limit)}, ${r.exception.reason}</small>` : ''}` +
    `${r.sizeOk ? '' : `<br><span class="ko">story ${r.actualSize.join('×')} ≠ Figma ${r.size.join('×')}</span>`}</td>` +
    ['figma', 'story', 'diff'].map((k) => `<td><img src="${r.key}-${k}.png"></td>`).join('') + '</tr>');
writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Confronto visivo Figma ↔ Storybook</title>
<style>body{font:14px system-ui;margin:24px;color:#0f172a}table{border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:8px;vertical-align:top;text-align:left}
img{display:block;max-width:400px;image-rendering:pixelated}.ok{color:#15803d}.ko{color:#b91c1c}small{color:#64748b}</style>
<h1>Figma ↔ Storybook</h1><p>Tolleranza ${pct(TOLERANCE)} · ${new Date().toLocaleString('it-IT')} · ${SB}</p>
<table><tr><th>Nodo / story</th><th>Figma</th><th>Story</th><th>Differenze (rosso)</th></tr>${rows.join('')}</table>`);
console.log(`\nReport: ${join(OUT, 'index.html')}`);

process.exit(results.every((r) => r.pass) ? 0 : 1);
