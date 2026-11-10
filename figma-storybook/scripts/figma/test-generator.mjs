// Test del generatore Figma → Storybook (G3). Offline, senza dipendenze.
// Uso: npm run test:generator
// Verifica: determinismo (stessi byte a ogni esecuzione e con le chiavi dei JSON in ordine diverso), una prova per
// ogni riga delle tabelle di mappatura, i rifiuti attesi (ciò che le tabelle non prevedono è un errore) e che i file
// generati (componenti, token, manifest) siano allineati agli export.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { camel, pascal, cssVar, lookCss, textCss, sizeCss, generateComponent, generateAll, GenError } from './generate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
let passed = 0;
const ok = (cond, name) => { if (cond) passed++; else { failed++; console.error(`FALLITO: ${name}`); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), `${name}\n    atteso:  ${JSON.stringify(b)}\n    ottenuto: ${JSON.stringify(a)}`);
const throws = (fn, re, name) => { try { fn(); ok(false, `${name} (nessun errore)`); } catch (e) { ok(e instanceof GenError && re.test(e.message), `${name}: "${e.message}"`); } };

// ---------- nomi ----------

eq(camel('Button label'), 'buttonLabel', 'camel: spazi');
eq(camel('Show image'), 'showImage', 'camel: proprietà booleana');
eq(pascal('Senza bottone'), 'SenzaBottone', 'pascal');
eq(cssVar('brand/primary'), '--brand-primary', 'variabile CSS');
eq(cssVar('font/size-md'), '--font-size-md', 'variabile CSS con trattino');

// ---------- tabelle: auto layout e aspetto ----------

const v = (value, vr) => (vr ? { value, var: vr } : { value });
const pad = (t, r, b, l) => ({ top: v(t), right: v(r), bottom: v(b), left: v(l) });
const frame = (o = {}) => ({ name: 'F', type: 'FRAME', nodeId: '1:1', size: { w: 'HUG', h: 'HUG', width: v(10), height: v(10) }, children: [{}, {}], ...o });
const al = (mode, o = {}) => ({ mode, gap: v(0), padding: pad(0, 0, 0, 0), main: 'MIN', cross: 'MIN', ...o });

eq(lookCss(frame({ layout: al('HORIZONTAL') })), { display: 'flex', 'align-items': 'flex-start' }, 'orizzontale: flex, allineamento MIN');
eq(lookCss(frame({ layout: al('VERTICAL') }))['flex-direction'], 'column', 'verticale: colonna');
eq(lookCss(frame({ layout: al('HORIZONTAL', { main: 'CENTER', cross: 'CENTER' }) }))['justify-content'], 'center', 'asse principale CENTER');
eq(lookCss(frame({ layout: al('HORIZONTAL', { main: 'SPACE_BETWEEN' }) }))['justify-content'], 'space-between', 'asse principale SPACE_BETWEEN');
eq(lookCss(frame({ layout: al('HORIZONTAL', { cross: 'MAX' }) }))['align-items'], 'flex-end', 'asse trasversale MAX');
eq(lookCss(frame({ layout: al('HORIZONTAL', { gap: v(8, 'space/sm') }) })).gap, 'var(--space-sm)', 'spaziatura legata a variabile');
eq(lookCss(frame({ children: [{}], layout: al('HORIZONTAL', { gap: v(8) }) })).gap, undefined, 'spaziatura ignorata con un solo figlio');
eq(lookCss(frame({ layout: al('HORIZONTAL', { padding: pad(4, 4, 4, 4) }) })).padding, '4px', 'padding: un valore');
eq(lookCss(frame({ layout: al('HORIZONTAL', { padding: pad(4, 8, 4, 8) }) })).padding, '4px 8px', 'padding: due valori');
eq(lookCss(frame({ layout: al('HORIZONTAL', { padding: pad(1, 2, 3, 4) }) })).padding, '1px 2px 3px 4px', 'padding: quattro valori');
eq(lookCss(frame({ layout: al('HORIZONTAL', { padding: pad(4, 4, 4, 4) }) }))['box-sizing'], 'border-box', 'padding: box-sizing border-box');
eq(lookCss(frame({ clip: true })).overflow, 'hidden', 'ritaglia il contenuto');
eq(lookCss(frame({ fills: [{ type: 'SOLID', color: '#ffffff', var: 'surface/card' }] })).background, 'var(--surface-card)', 'riempimento legato');
eq(lookCss(frame({ fills: [{ type: 'SOLID', color: '#123456' }] })).background, '#123456', 'riempimento senza variabile');
eq(lookCss(frame({ fills: [{ type: 'IMAGE', scaleMode: 'FIT' }] }))['object-fit'], 'contain', 'immagine FIT');
eq(lookCss(frame({ stroke: { paints: [{ type: 'SOLID', color: '#e2e8f0', var: 'border/default' }], weight: v(1), align: 'INSIDE' } })).border, '1px solid var(--border-default)', 'bordo interno');
eq(lookCss(frame({ radius: v(10, 'radius/md') }))['border-radius'], 'var(--radius-md)', 'raggio legato');
eq(lookCss(frame({ radius: { corners: [v(1), v(2), v(1), v(2)] } }))['border-radius'], '1px 2px', 'raggi per angolo');
eq(lookCss(frame({ effects: { items: [{ type: 'DROP_SHADOW', radius: 16 }], style: 'shadow/card' } }))['box-shadow'], 'var(--shadow-card)', 'ombra da stile');
eq(lookCss(frame({ effects: { items: [{ type: 'DROP_SHADOW', radius: 16, spread: 0, offset: { x: 0, y: 4 }, color: 'rgba(0, 0, 0, 0.1)' }] } }))['box-shadow'], '0 4px 16px 0 rgba(0, 0, 0, 0.1)', 'ombra senza stile');
eq(lookCss(frame({ opacity: 0.5 })).opacity, '0.5', 'opacità');

// ---------- tabelle: dimensioni ----------

const sized = (w, h, width = 100, height = 20) => frame({ size: { w, h, width: v(width), height: v(height) } });
eq(sizeCss(sized('FIXED', 'HUG'), null), { width: '100%' }, 'radice fissa: larghezza del contenitore');
eq(sizeCss({ ...sized('HUG', 'HUG'), layout: al('HORIZONTAL') }, null), { display: 'inline-flex' }, 'radice che abbraccia il contenuto: inline-flex');
eq(sizeCss(sized('FIXED', 'FIXED', 340, 192), 'VERTICAL'), { width: '340px', height: '192px' }, 'figlio fisso: misure in px');
eq(sizeCss(sized('FILL', 'HUG'), 'VERTICAL'), { width: '100%' }, 'riempie in larghezza in una colonna');
eq(sizeCss(sized('FILL', 'HUG'), 'HORIZONTAL'), { flex: '1 1 0' }, 'riempie in larghezza in una riga');
eq(sizeCss(sized('HUG', 'FILL'), 'HORIZONTAL'), { 'align-self': 'stretch' }, 'riempie in altezza in una riga');
eq(sizeCss(sized('HUG', 'HUG'), 'VERTICAL'), {}, 'abbraccia il contenuto: nessuna misura');

// ---------- tabelle: testo ----------

const text = (o = {}) => ({ name: 'T', type: 'TEXT', nodeId: '1:2', size: { w: 'FILL', h: 'HUG', width: v(10), height: v(10) },
  text: { characters: 'x', font: { family: 'Inter', style: 'Bold' }, weight: 700, size: v(20, 'font/size-lg'), lineHeight: { unit: 'AUTO' },
    letterSpacing: { unit: 'PERCENT', value: 0 }, align: 'LEFT', fills: [{ type: 'SOLID', color: '#0f172a', var: 'text/primary' }], ...o } });
eq(textCss(text()), { 'font-family': 'var(--font-family)', 'font-size': 'var(--font-size-lg)', 'font-weight': '700', 'line-height': 'var(--font-line-height)', color: 'var(--text-primary)' }, 'testo: tipografia legata');
eq(textCss(text({ lineHeight: { unit: 'PIXELS', value: 24 } }))['line-height'], '24px', 'altezza di riga in px');
eq(textCss(text({ align: 'CENTER' }))['text-align'], 'center', 'testo centrato');
eq(textCss({ ...text(), size: { w: 'HUG', h: 'HUG', width: v(1), height: v(1) } })['white-space'], 'nowrap', 'testo che abbraccia il contenuto: non va a capo');

// ---------- rifiuti ----------

throws(() => lookCss(frame({ fills: [{ type: 'GRADIENT_LINEAR' }] }), 'X'), /GRADIENT_LINEAR/, 'gradiente rifiutato');
throws(() => lookCss(frame({ stroke: { paints: [{ type: 'SOLID', color: '#000000' }], weight: v(1), align: 'OUTSIDE' } }), 'X'), /bordo/, 'bordo esterno rifiutato');
throws(() => lookCss(frame({ effects: { items: [{ type: 'INNER_SHADOW', radius: 1 }] } }), 'X'), /effetto/, 'ombra interna rifiutata');
throws(() => lookCss(frame({ layout: al('GRID') }), 'X'), /GRID/, 'griglia rifiutata');
throws(() => textCss(text({ letterSpacing: { unit: 'PIXELS', value: 1 } }), 'X'), /lettere/, 'spaziatura tra le lettere rifiutata');
throws(() => sizeCss(sized('FIXED', 'FIXED'), 'NONE', 'X'), /senza auto layout/, 'figlio di un frame senza auto layout');

const BUTTON = JSON.parse(readFileSync(join(root, 'figma', 'export', 'button.json'), 'utf8'));
const exportsMap = new Map([['button', BUTTON]]);
const gen = (data, rules = null) => generateComponent('button', data, { exports: exportsMap, rules, extraCss: null, hash: '0'.repeat(64) });
throws(() => gen({ ...BUTTON, properties: { ...BUTTON.properties, State: { type: 'VARIANT', default: 'Default', options: ['Default'] } } }), /State|VARIANT/, 'proprietà State non ancora supportata');
throws(() => gen({ ...BUTTON, properties: { ...BUTTON.properties, Size: { type: 'VARIANT', default: 'M', options: ['M'] } } }), /più di una proprietà VARIANT/, 'due proprietà VARIANT');
const different = structuredClone(BUTTON);
different.variants[1].tree.children[0].name = 'Altro';
throws(() => gen(different), /stessi livelli/, 'varianti con livelli diversi');
const imgOnDiv = structuredClone(BUTTON);
imgOnDiv.variants[0].tree.children[0].type = 'RECTANGLE';
imgOnDiv.variants[0].tree.children[0].fills = [{ type: 'IMAGE', scaleMode: 'FILL' }];
throws(() => gen(imgOnDiv, { layers: { Label: { tag: 'div' } } }), /non è img/, 'immagine su un livello che non è img');

// ---------- varianti: CSS per differenza ----------

const b = gen(BUTTON, { root: { tag: 'button' } });
const css = b.files['button.css'];
ok(/\.fx-button--secondary \{\n {2}background: var\(--surface-card\);\n {2}border: 1px solid var\(--border-default\);\n {2}color: var\(--text-primary\);\n\}/.test(css), 'variante: solo le dichiarazioni diverse dalla predefinita');
ok(!/\.fx-button--primary/.test(css), 'variante predefinita: nessuna regola in più');
ok(b.files['button.template.js'].includes("mod('fx-button--', prop('variant'))"), 'variante: classe modificatore');

// ---------- determinismo ----------

const reverseKeys = (x) => (Array.isArray(x) ? x.map(reverseKeys) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).reverse().map(([k, y]) => [k, reverseKeys(y)])) : x);
const g1 = generateAll();
const g2 = generateAll();
ok(JSON.stringify(g1) === JSON.stringify(g2), 'due generazioni: stessi file');
const r1 = gen(BUTTON, { root: { tag: 'button', linkWhen: 'href' }, props: { href: {} } });
const r2 = gen(reverseKeys(BUTTON), { root: { tag: 'button', linkWhen: 'href' }, props: { href: {} } });
ok(r1.files['button.css'] === r2.files['button.css'], 'chiavi in ordine diverso: stesso CSS');
ok(Object.values(g1).every((c) => !c.includes('\r') && c.endsWith('\n')), 'file con LF e a capo finale');

// ---------- file generati (componenti, token, manifest) allineati agli export ----------

for (const [rel, content] of Object.entries(g1)) {
  const p = join(root, rel);
  ok(existsSync(p) && readFileSync(p, 'utf8').replace(/\r\n/g, '\n') === content, `${rel} allineato (npm run figma:generate)`);
}

console.log(failed ? `\n${failed} falliti, ${passed} riusciti` : `ok: ${passed} controlli`);
process.exit(failed ? 1 : 0);
