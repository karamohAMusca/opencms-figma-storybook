// Test dell'estrattore fx-export (G1), offline: code.js gira in Node su un Figma simulato.
// Uso: npm run test:export
// Verifica: determinismo (stessi byte a ogni esecuzione e con l'ordine delle chiavi cambiato), schema,
// zip (andata e ritorno con figma:import), errori attesi, e che plugin e comandi non usino rete né dipendenze.
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPlugin, exportDir } from './plugin.mjs';
import { validate } from './schema.mjs';
import { readZip, importFiles } from './import.mjs';

const P = loadPlugin();
let failed = 0;
let passed = 0;
const ok = (cond, name) => { if (cond) passed++; else { failed++; console.error(`FALLITO: ${name}`); } };
const throwsLike = async (fn, re, name) => {
  try { await fn(); ok(false, `${name} (nessun errore)`); } catch (e) { ok(re.test(e.message), `${name}: "${e.message}"`); }
};

// ---------- Figma simulato ----------

const MIXED = Symbol('mixed');
const alias = (id) => ({ type: 'VARIABLE_ALIAS', id });
const rgb = (hex) => ({ r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 });

/** Costruisce il Figma simulato; `reverse` inverte l'ordine di inserimento delle chiavi (deve dare lo stesso output). */
function fakeFigma(reverse = false) {
  const obj = (o) => (reverse ? Object.fromEntries(Object.entries(o).reverse()) : o);
  const vars = {
    'v:primary': { id: 'v:primary', name: 'brand/primary', resolvedType: 'COLOR', variableCollectionId: 'c:1', valuesByMode: obj({ 'm:1': { ...rgb('#4f46e5'), a: 1 } }) },
    'v:onprimary': { id: 'v:onprimary', name: 'text/on-primary', resolvedType: 'COLOR', variableCollectionId: 'c:1', valuesByMode: obj({ 'm:1': { r: 1, g: 1, b: 1, a: 1 } }) },
    'v:spacelg': { id: 'v:spacelg', name: 'space/lg', resolvedType: 'FLOAT', variableCollectionId: 'c:1', valuesByMode: obj({ 'm:1': 24 }) },
    'v:radius': { id: 'v:radius', name: 'radius/md', resolvedType: 'FLOAT', variableCollectionId: 'c:1', valuesByMode: obj({ 'm:1': 10 }) },
    'v:accent': { id: 'v:accent', name: 'brand/accent', resolvedType: 'COLOR', variableCollectionId: 'c:1', valuesByMode: obj({ 'm:1': alias('v:primary') }) },
  };
  const text = (id, name, chars, colorVar, ref) => obj({
    id, name, type: 'TEXT', visible: true, characters: chars,
    componentPropertyReferences: ref ? { characters: ref } : undefined,
    layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', width: 51.3333, height: 18.0001,
    fontName: { family: 'Inter', style: 'Semi Bold' }, fontWeight: 600, fontSize: 15,
    lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 }, textAlignHorizontal: 'LEFT',
    textCase: 'ORIGINAL', textDecoration: 'NONE', textStyleId: '',
    fills: [{ type: 'SOLID', visible: true, color: rgb(colorVar === 'v:onprimary' ? '#ffffff' : '#0f172a'), opacity: 1, boundVariables: colorVar ? { color: alias(colorVar) } : {} }],
    strokes: [], effects: [], boundVariables: {}, opacity: 1, blendMode: 'PASS_THROUGH', rotation: 0,
  });
  const box = (b) => ({ x: 0, y: 0, width: b[0], height: b[1] });
  const variant = (id, name, value, fill, textId) => {
    const node = obj({
      id, name, type: 'COMPONENT', visible: true, variantProperties: { Variant: value },
      layoutMode: 'HORIZONTAL', layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG', width: 99, height: 42,
      itemSpacing: 0, paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24,
      primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', clipsContent: false,
      fills: [fill], strokes: [], strokeWeight: 1, strokeAlign: 'INSIDE', cornerRadius: 10, effects: [],
      boundVariables: { paddingLeft: alias('v:spacelg'), paddingRight: alias('v:spacelg'), topLeftRadius: alias('v:radius') },
      absoluteBoundingBox: box([99, 42]), absoluteRenderBounds: box([99, 42]), opacity: 1, blendMode: 'PASS_THROUGH', rotation: 0,
      children: [text(textId, 'Label', 'Accedi', value === 'Primary' ? 'v:onprimary' : null, 'Label#1:5')],
      exportAsync: async () => new Uint8Array([137, 80, 78, 71, value.length]),
    });
    return node;
  };
  const set = obj({
    id: '1:22', name: 'Button', type: 'COMPONENT_SET', description: 'Bottone principale.',
    componentPropertyDefinitions: obj({
      Variant: { type: 'VARIANT', defaultValue: 'Primary', variantOptions: ['Primary', 'Secondary'] },
      'Label#1:5': { type: 'TEXT', defaultValue: 'Accedi' },
    }),
    children: [],
  });
  set.children = [
    variant('1:18', 'Variant=Primary', 'Primary', { type: 'SOLID', visible: true, color: rgb('#4f46e5'), opacity: 1, boundVariables: { color: alias('v:primary') } }, '1:19'),
    variant('1:20', 'Variant=Secondary', 'Secondary', { type: 'SOLID', visible: true, color: rgb('#ffffff'), opacity: 0.5, boundVariables: {} }, '1:21'),
  ];
  set.children.forEach((c) => { c.parent = set; });
  const frame = { id: '9:1', name: 'Cornice', type: 'FRAME' };
  return {
    mixed: MIXED,
    set,
    frame,
    variables: {
      getVariableByIdAsync: async (id) => vars[id] ?? null,
      getLocalVariableCollectionsAsync: async () => [{ id: 'c:1', name: 'Tokens', modes: [{ modeId: 'm:1', name: 'Default' }], defaultModeId: 'm:1' }],
      getLocalVariablesAsync: async () => (reverse ? Object.values(vars).reverse() : Object.values(vars)),
    },
    getStyleByIdAsync: async () => null,
  };
}

// ---------- funzioni pure ----------

ok(P.round(1.005) === 1 || P.round(1.005) === 1.01, 'round a 2 decimali');
ok(Object.is(P.round(-0.001), 0), 'round: niente -0');
ok(P.color({ r: 1, g: 1, b: 1 }) === '#ffffff', 'colore pieno');
ok(P.color({ r: 15 / 255, g: 23 / 255, b: 41 / 255, a: 0.06 }) === 'rgba(15, 23, 41, 0.06)', 'colore trasparente');
ok(P.propName('Label#1:5') === 'Label' && P.propName('Button label') === 'Button label', 'nome di proprietà senza suffisso');
ok(P.slug('Città / Più Bella!') === 'citta-piu-bella', 'slug: accenti, / e simboli');

// ---------- determinismo ----------

const run = async (reverse) => {
  const api = fakeFigma(reverse);
  const result = await P.buildExport(api, api.set);
  return { result, zip: Buffer.from(P.makeZip(result.files)) };
};
const a = await run(false);
const b = await run(false);
const c = await run(true);
ok(a.zip.equals(b.zip), 'due esportazioni: stessi byte');
ok(a.zip.equals(c.zip), 'ordine delle chiavi in Figma diverso: stessi byte');

const byName = Object.fromEntries(a.result.files.map((f) => [f.name, Buffer.from(f.bytes)]));
ok(JSON.stringify(Object.keys(byName).sort()) === JSON.stringify(['button.json', 'button.primary.png', 'button.secondary.png', 'variables.json']), 'file prodotti');
const button = JSON.parse(byName['button.json'].toString('utf8'));
const variables = JSON.parse(byName['variables.json'].toString('utf8'));

// ---------- schema e contenuto ----------

const e1 = validate(button, 'component');
const e2 = validate(variables, 'variables');
ok(e1.length === 0, `schema del componente: ${e1.join('; ')}`);
ok(e2.length === 0, `schema delle variabili: ${e2.join('; ')}`);
ok(validate({ ...button, extra: 1 }, 'component').length > 0, 'schema: un campo in più è rifiutato');

const primary = button.variants[0].tree;
ok(button.properties.Label?.default === 'Accedi', 'proprietà TEXT senza suffisso #id');
ok(primary.fills[0].var === 'brand/primary' && primary.fills[0].color === '#4f46e5', 'riempimento legato a variabile');
ok(button.variants[1].tree.fills[0].color === 'rgba(255, 255, 255, 0.5)', 'opacità del riempimento nel colore');
ok(primary.layout.padding.left.var === 'space/lg' && primary.layout.padding.top.var === undefined && primary.layout.padding.top.value === 12, 'padding: variabile dove c\'è, valore dove no');
ok(primary.radius.var === 'radius/md', 'raggio legato a variabile');
ok(primary.children[0].refs.characters === 'Label', 'testo legato alla proprietà Label');
ok(primary.children[0].size.width.value === 51.33, 'misure arrotondate');
ok(primary.children[0].text.lineHeight.unit === 'AUTO', 'altezza di riga auto');
ok(variables.collections.Tokens.variables['brand/accent'].values.Default.alias === 'brand/primary', 'alias di variabile risolto per nome');
ok(!/"(date|user|fileKey|key|timestamp)"/i.test(byName['button.json'].toString('utf8')), 'nessuna data, utente o chiave del file');
ok(byName['button.json'].toString('utf8').endsWith('}\n') && !byName['button.json'].includes('\r'), 'JSON con LF e a capo finale');

// ---------- errori attesi ----------

const api = fakeFigma();
await throwsLike(() => P.buildExport(api, api.set.children[0]), /è una variante: seleziona il set "Button"/, 'variante selezionata');
await throwsLike(() => P.buildExport(api, api.frame), /Seleziona un componente/, 'frame selezionato');

// ---------- zip e figma:import ----------

const dir = mkdtempSync(join(tmpdir(), 'fx-export-'));
try {
  const files = readZip(a.zip, P.crc32);
  ok(files.length === 4 && files.every((f) => f.bytes.equals(byName[f.name])), 'zip: andata e ritorno');
  let written = [];
  try { written = importFiles(files, dir, P); } catch (e) { ok(false, `figma:import: ${e.message}`); }
  ok(written.length === 4 && readdirSync(dir).length === 4, 'figma:import scrive i file');
  const bad = Buffer.from(a.zip);
  bad[bad.indexOf('button.json') + 'button.json'.length + 5] ^= 1; // un byte del contenuto
  await throwsLike(() => readZip(bad, P.crc32), /CRC errato/, 'zip alterato');
  await throwsLike(() => importFiles([{ name: '../fuori.json', bytes: Buffer.from('{}') }], dir, P), /nome non ammesso/, 'percorso nel nome');
  await throwsLike(() => importFiles([{ name: 'x.json', bytes: Buffer.from('{"schema":1}') }], dir, P), /non rispetta lo schema/, 'JSON fuori schema');
  await throwsLike(() => importFiles([{ name: 'button.json', bytes: Buffer.from(JSON.stringify(button)) }], dir, P), /forma canonica/, 'JSON non canonico');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// ---------- export salvati in figma/export/ (dal file Figma vero) ----------

const savedDir = new URL('../../figma/export/', import.meta.url);
let saved = [];
try { saved = readdirSync(savedDir); } catch { /* nessun export ancora */ }
for (const f of saved.filter((n) => n.endsWith('.json'))) {
  const text = readFileSync(new URL(f, savedDir), 'utf8');
  const data = JSON.parse(text);
  const errors = validate(data, f === 'variables.json' ? 'variables' : 'component');
  ok(errors.length === 0, `figma/export/${f}: schema (${errors.slice(0, 3).join('; ')})`);
  ok(P.stringify(data) === text, `figma/export/${f}: forma canonica e LF`);
  const shots = [data.screenshot, ...(data.variants ?? []).map((v) => v.screenshot)].filter(Boolean);
  for (const s of shots) ok(saved.includes(s), `figma/export/${f}: manca lo screenshot ${s}`);
}

// ---------- niente rete, niente dipendenze ----------

const FORBIDDEN = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b|\beval\s*\(|new Function\s*\(|<script[^>]+src=|<link[^>]+href=|https?:\/\//;
for (const f of ['code.js', 'ui.html']) {
  const m = readFileSync(join(exportDir, f), 'utf8').match(FORBIDDEN);
  ok(!m, `${f} senza rete né codice dinamico${m ? ` (trovato "${m[0]}")` : ''}`);
}
const manifest = JSON.parse(readFileSync(join(exportDir, 'manifest.json'), 'utf8'));
ok(JSON.stringify(manifest.networkAccess?.allowedDomains) === '["none"]', 'manifest: nessun dominio ammesso');
ok(readFileSync(join(exportDir, 'VERSION'), 'utf8').trim() === P.FX_EXPORT_VERSION, 'VERSION = versione in code.js');
const scriptsDir = new URL('.', import.meta.url);
for (const f of readdirSync(scriptsDir)) {
  const src = readFileSync(new URL(f, scriptsDir), 'utf8');
  const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  const external = imports.filter((i) => !i.startsWith('node:') && !i.startsWith('.'));
  ok(external.length === 0, `scripts/figma/${f}: solo libreria standard di Node${external.length ? ` (importa ${external.join(', ')})` : ''}`);
  const net = src.match(/\bfrom 'node:(http|https|net|dns|tls|dgram|child_process)'|\bfetch\(/);
  ok(!net || f === 'test-export.mjs', `scripts/figma/${f}: nessuna rete${net ? ` (trovato "${net[0]}")` : ''}`);
}

console.log(failed ? `\n${failed} falliti, ${passed} riusciti` : `ok: ${passed} controlli`);
process.exit(failed ? 1 : 0);
