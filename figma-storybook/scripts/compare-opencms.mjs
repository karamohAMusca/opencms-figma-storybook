// Confronta i componenti in OpenCms con le story: crea in OpenCms la pagina di prova /fx-test/ (devtools/testpage.py),
// fotografa ogni elemento lì e nella sua story e confronta pixel per pixel. È la prova che quello che si vede in
// Storybook è quello che mostra OpenCms, dentro una pagina Mercury vera.
// Uso, con OpenCms e Storybook accesi:
//   npm run compare:opencms               (pagina di prova aggiornata, poi confronto)
//   npm run compare:opencms -- --deploy   (prima carica in OpenCms il modulo com'è: aggiornamento completo, ~1 minuto)
//   npm run compare:opencms -- --no-page  (solo confronto, sulla pagina già pubblicata)
// Report in opencms-report/index.html. Esce con 1 se un elemento supera la tolleranza.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { resolveProps } from '../src/template.js';
import { loadOpencms } from './opencms/load.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..');
const SB = (process.env.SB_URL ?? 'http://localhost:6007').replace(/\/$/, '');
const CMS = (process.env.OPENCMS_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const TOLERANCE = Number(process.env.VISUAL_TOLERANCE ?? 0.02);
const OUT = join(root, 'opencms-report');
const VIEWPORT = { width: 1280, height: 900 };
const { defs } = await loadOpencms(root);
const byType = Object.fromEntries(defs.filter((d) => d.type).map((d) => [d.type.name, d]));

/** Casi: un elemento in OpenCms per ognuno, confrontato con `selector` nella story `title › story`. */
const CASES = [
  { id: 'button-primary', type: 'fx-cta-button', props: { href: '#', variant: 'primary' }, title: 'Componenti/Button', story: 'Primary', selector: '.fx-button' },
  { id: 'button-secondary', type: 'fx-cta-button', props: { href: '#', variant: 'secondary' }, title: 'Componenti/Button', story: 'Secondary', selector: '.fx-button' },
  { id: 'login', type: 'fx-login', props: {}, title: 'Schermate/Login', story: 'Desktop', selector: '.fx-login__inner' },
];

/** Contenuto e impostazioni OpenCms che corrispondono alle proprietà del caso (i collegamenti al contrario). */
function opencmsCase(c) {
  const def = byType[c.type];
  const props = resolveProps(def.component, c.props);
  const fields = [];
  const settings = {};
  for (const [name, b] of Object.entries(def.bind)) {
    if (b?.kind === 'field' || b?.kind === 'link') fields.push([b.name, b.kind, props[name] ?? '']);
    if (b?.kind === 'setting') settings[b.name] = props[name];
    if (b?.kind === 'settingIs') settings[b.name] = props[name] ? b.on : b.default;
  }
  return { id: c.id, type: c.type, formatterKey: def.formatter.key, fields, settings };
}

if (!process.argv.includes('--no-page')) {
  const file = join(tmpdir(), 'fx-test-cases.json');
  writeFileSync(file, JSON.stringify(CASES.map(opencmsCase), null, 2));
  const args = ['-m', 'devtools.testpage', file, ...(process.argv.includes('--deploy') ? ['--deploy'] : [])];
  const r = spawnSync(process.platform === 'win32' ? 'python' : 'python3', args, { cwd: repo, stdio: 'inherit' });
  rmSync(file, { force: true });
  if (r.status !== 0) {
    console.error('Pagina di prova non creata: vedi i messaggi sopra e dev.log.');
    process.exit(2);
  }
}

let index;
try {
  index = await fetch(`${SB}/index.json`).then((r) => r.json());
} catch {
  console.error(`Storybook non risponde su ${SB}: avvialo con "npm run storybook" (o imposta SB_URL).`);
  process.exit(2);
}
const storyId = (title, exportName) =>
  Object.values(index.entries).find((e) => e.type === 'story' && e.title === title && e.exportName === exportName)?.id;

// Prima apertura dopo un riavvio: OpenCms compila i JSP e può superare i timeout del browser. Si aspetta qui.
for (let i = 0; i < 30; i++) {
  try { if ((await fetch(`${CMS}/fx-test/`, { signal: AbortSignal.timeout(60000) })).ok) break; } catch { /* riprova */ }
  await new Promise((r) => setTimeout(r, 3000));
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--disable-lcd-text', '--font-render-hinting=none'] });
const STILL = '*, *::before, *::after { caret-color: transparent !important; transition: none !important; animation: none !important; }';

// Banner dei cookie di Mercury: copre la pagina di prova, non fa parte dei componenti.
const NO_BANNER = '#privacy-policy-banner, .pp-banner { display: none !important; }';

async function shot(url, locate, extraCss = '') {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: STILL + extraCss });
  await page.evaluate(() => document.fonts.ready);
  const el = locate(page);
  await el.scrollIntoViewIfNeeded();
  // L'elemento può partire da una coordinata frazionaria (centrato in Storybook, sotto la testata in Mercury): il testo
  // cadrebbe su sottopixel diversi e il confronto conterebbe differenze che nel componente non ci sono. Lo si porta al pixel intero.
  await el.evaluate((e) => {
    const r = e.getBoundingClientRect();
    e.style.transform = `translate(${Math.round(r.x) - r.x}px, ${Math.round(r.y) - r.y}px)`;
  });
  const png = PNG.sync.read(await el.screenshot());
  const font = await el.evaluate((e) => getComputedStyle(e.querySelector('*') ?? e).fontFamily);
  await page.close();
  return { png, font };
}

/** Allinea due immagini sulla misura più grande (sfondo bianco) per poterle confrontare anche se differiscono. */
function pad(png, w, h) {
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

const results = [];
const counters = {};
for (const c of CASES) {
  const id = storyId(c.title, c.story);
  if (!id) { results.push({ ...c, error: `story ${c.title} › ${c.story} non trovata` }); continue; }
  try {
    const n = counters[c.selector] = (counters[c.selector] ?? -1) + 1; // n-esimo elemento con quel selettore nella pagina
    const story = await shot(`${SB}/iframe.html?id=${id}&viewMode=story`, (p) => p.locator(`#storybook-root ${c.selector}`).first());
    const cms = await shot(`${CMS}/fx-test/`, (p) => p.locator(c.selector).nth(n), NO_BANNER);
    const w = Math.max(story.png.width, cms.png.width);
    const h = Math.max(story.png.height, cms.png.height);
    const a = pad(story.png, w, h);
    const b = pad(cms.png, w, h);
    const diff = new PNG({ width: w, height: h });
    const ratio = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 }) / (w * h);
    for (const [k, img] of [['story', a], ['opencms', b], ['diff', diff]]) writeFileSync(join(OUT, `${c.id}-${k}.png`), PNG.sync.write(img));
    const sizes = { story: [story.png.width, story.png.height], opencms: [cms.png.width, cms.png.height] };
    const sizeOk = Math.abs(sizes.story[0] - sizes.opencms[0]) <= 1 && Math.abs(sizes.story[1] - sizes.opencms[1]) <= 1;
    results.push({ ...c, sbId: id, ratio, sizes, sizeOk, fonts: { story: story.font, opencms: cms.font }, pass: ratio <= TOLERANCE && sizeOk });
  } catch (e) {
    results.push({ ...c, error: e.message.split('\n')[0] });
  }
}
await browser.close();

const pct = (r) => `${(r * 100).toFixed(2)}%`;
for (const r of results) {
  if (r.error) { console.log(`ERRORE   ${r.id}: ${r.error}`); continue; }
  console.log(`${r.pass ? 'ok     ' : 'DIVERSO'}  ${r.id}  ${pct(r.ratio)} pixel diversi` +
    (r.sizeOk ? '' : `  · misura story ${r.sizes.story.join('×')}, OpenCms ${r.sizes.opencms.join('×')}`) +
    (r.fonts.story === r.fonts.opencms ? '' : `  · font story "${r.fonts.story}", OpenCms "${r.fonts.opencms}"`));
}
const rows = results.map((r) => r.error
  ? `<tr><td>${r.id}</td><td colspan="3" class="ko">${r.error}</td></tr>`
  : `<tr><td>${r.id}<br><small>${r.sbId} · ${r.selector}</small><br><b class="${r.pass ? 'ok' : 'ko'}">${pct(r.ratio)}</b>` +
    `<br><small>story ${r.sizes.story.join('×')} · OpenCms ${r.sizes.opencms.join('×')}</small></td>` +
    ['story', 'opencms', 'diff'].map((k) => `<td><img src="${r.id}-${k}.png"></td>`).join('') + '</tr>');
writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Confronto Storybook ↔ OpenCms</title>
<style>body{font:14px system-ui;margin:24px;color:#0f172a}table{border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:8px;vertical-align:top;text-align:left}
img{display:block;max-width:420px}.ok{color:#15803d}.ko{color:#b91c1c}small{color:#64748b}</style>
<h1>Storybook ↔ OpenCms</h1><p>Tolleranza ${pct(TOLERANCE)} · ${new Date().toLocaleString('it-IT')} · ${SB} · ${CMS}/fx-test/</p>
<table><tr><th>Caso</th><th>Story</th><th>OpenCms</th><th>Differenze (rosso)</th></tr>${rows.join('')}</table>`);
console.log(`\nReport: ${join(OUT, 'index.html')}`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
