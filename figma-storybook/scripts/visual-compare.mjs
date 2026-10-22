// Confronto visivo tra le story e gli screenshot Figma (figma/screenshots/), guidato da figma/manifest.json.
//
// Uso (con Storybook acceso: npm run storybook):
//   npm run visual                       # confronta tutto, report in visual-report/index.html
//   SB_URL=http://host:port npm run visual
//   VISUAL_TOLERANCE=0.01 npm run visual  # quota massima di pixel diversi (default 0.02 = 2%: il testo resta
//                                          leggermente diverso tra Figma e Chromium, un errore vero pesa molto di più)
//
// Cosa confronta:
// - varianti (Button): ritaglio dello screenshot del component set (position + size) ↔ story della variante;
// - componenti senza varianti (Input): screenshot intero ↔ story `visualStory`;
// - schermate (Login): screenshot intero ↔ story `visualStory` con viewport grande quanto il frame.
// Figma esporta i componenti sullo sfondo del canvas: le loro story vengono fotografate sullo stesso sfondo.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SB = (process.env.SB_URL ?? 'http://localhost:6007').replace(/\/$/, '');
const TOLERANCE = Number(process.env.VISUAL_TOLERANCE ?? 0.02);
const CANVAS_BG = 'rgb(229, 229, 229)'; // sfondo del canvas Figma negli screenshot dei componenti
const OUT = join(root, 'visual-report');
const manifest = JSON.parse(readFileSync(join(root, 'figma', 'manifest.json'), 'utf8'));

function crop(png, [x, y], [w, h]) {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(png, out, x, y, w, h, 0, 0);
  return out;
}

const readPng = (rel) => PNG.sync.read(readFileSync(join(root, 'figma', rel)));

// ---- Elenco dei confronti dal manifest ----

const targets = [];
for (const node of manifest.components) {
  const shot = readPng(node.screenshot);
  if (node.variants.length) {
    for (const v of node.variants) {
      targets.push({ key: `${node.name}-${v.story}`, label: `${node.name} / ${v.name} (${v.nodeId})`, title: node.stories,
        story: v.story, ref: crop(shot, v.position, v.size), size: v.size, kind: 'component' });
    }
  } else {
    targets.push({ key: `${node.name}-${node.visualStory}`, label: `${node.name} (${node.nodeId})`, title: node.stories,
      story: node.visualStory, ref: shot, size: node.size, kind: 'component' });
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
    await page.addStyleTag({ content: `html, body, .sb-show-main, #storybook-root { background: ${CANVAS_BG} !important; }` });
  }
  await page.addStyleTag({ content: '*, *::before, *::after { caret-color: transparent !important; transition: none !important; animation: none !important; }' });
  await page.evaluate(() => document.fonts.ready);

  let clip = { x: 0, y: 0, width: w, height: h };
  let actualSize = [w, h];
  if (t.kind === 'component') {
    const box = await page.locator('#storybook-root > *').first().boundingBox();
    actualSize = [Math.round(box.width), Math.round(box.height)];
    clip = { x: Math.round(box.x), y: Math.round(box.y), width: w, height: h };
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
  const sizeOk = Math.abs(actualSize[0] - w) <= 1 && Math.abs(actualSize[1] - h) <= 1;
  results.push({ ...t, id, changed, ratio, actualSize, sizeOk, pass: ratio <= TOLERANCE && sizeOk });
}
await browser.close();

// ---- Report ----

const pct = (r) => `${(r * 100).toFixed(2)}%`;
for (const r of results) {
  if (r.error) console.log(`ERRORE  ${r.label}: ${r.error}`);
  else console.log(`${r.pass ? 'ok    ' : 'DIVERSO'}  ${r.label}  ${pct(r.ratio)} pixel diversi` +
    (r.sizeOk ? '' : `  · misura story ${r.actualSize.join('×')} invece di ${r.size.join('×')}`));
}

const rows = results.map((r) => r.error
  ? `<tr><td>${r.label}</td><td colspan="4" class="ko">${r.error}</td></tr>`
  : `<tr><td>${r.label}<br><small>${r.id}</small><br><b class="${r.pass ? 'ok' : 'ko'}">${pct(r.ratio)}</b>` +
    `${r.sizeOk ? '' : `<br><span class="ko">story ${r.actualSize.join('×')} ≠ Figma ${r.size.join('×')}</span>`}</td>` +
    ['figma', 'story', 'diff'].map((k) => `<td><img src="${r.key}-${k}.png"></td>`).join('') + '</tr>');
writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Confronto visivo Figma ↔ Storybook</title>
<style>body{font:14px system-ui;margin:24px;color:#0f172a}table{border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:8px;vertical-align:top;text-align:left}
img{display:block;max-width:400px;image-rendering:pixelated}.ok{color:#15803d}.ko{color:#b91c1c}small{color:#64748b}</style>
<h1>Figma ↔ Storybook</h1><p>Tolleranza ${pct(TOLERANCE)} · ${new Date().toLocaleString('it-IT')} · ${SB}</p>
<table><tr><th>Nodo / story</th><th>Figma</th><th>Story</th><th>Differenze (rosso)</th></tr>${rows.join('')}</table>`);
console.log(`\nReport: ${join(OUT, 'index.html')}`);

process.exit(results.every((r) => r.pass) ? 0 : 1);
