// Test di figma:lint (G2): per ogni regola R-D* almeno un export alterato che la viola deve dare il problema atteso;
// un export corretto non deve dare errori. Parte dagli export veri in figma/export/ e li modifica in memoria.
// Uso: npm run test:lint
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintComponent, variableNames } from './lint.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => JSON.parse(readFileSync(join(root, 'figma', 'export', f), 'utf8'));
const BUTTON = read('button.json');
const CARD = read('card.json');
const INPUT = read('input.json');
const VARS = variableNames(read('variables.json'));
const FONT = JSON.parse(readFileSync(join(root, 'figma', 'tokens.json'), 'utf8')).styles['font/family'];

let failed = 0;
let passed = 0;
const ok = (cond, name) => { if (cond) passed++; else { failed++; console.error(`FALLITO: ${name}`); } };
const lint = (data, extra = {}) => lintComponent(data, { exported: new Set(['button', 'card', 'input']), variables: VARS, fontFamily: FONT, rules: null, strict: false, ...extra });
const has = (res, level, rule, re) => res.some((r) => r.level === level && r.rule === rule && re.test(r.msg));
const errors = (res) => res.filter((r) => r.level === 'ERRORE');

/**
 * La Card come base dei test, in una forma nota: testo chiamato Text (correzione C4 di G0) e Image con riempimento
 * immagine. I test creano da soli ogni violazione, così non dipendono da come è il file Figma in questo momento.
 */
function card() {
  const c = structuredClone(CARD);
  c.tree.children[1].children[0].children[1].name = 'Text';
  c.tree.children[0].fills = [{ type: 'IMAGE', scaleMode: 'FILL' }];
  return c;
}
const node = (c, ...path) => path.reduce((n, i) => n.children[i], c.tree); // Card: 0 Image, 1 Body (0 Texts (0 Title, 1 Text), 1 Button)
/** Applica una modifica a una copia e restituisce il lint. */
const mutate = (base, fn, extra) => { const c = structuredClone(base); fn(c); return lint(c, extra); };

// ---------- export veri ----------

ok(errors(lint(BUTTON)).length === 0, 'Button vero: nessun errore');
ok(errors(lint(INPUT)).length === 0, 'Input vero: nessun errore');
ok(errors(lint(CARD)).length === 0, 'Card vera: nessun errore');
ok(errors(lint(card())).length === 0, 'Card con il testo chiamato Text: nessun errore');

// ---------- R-D1 ----------

ok(has(mutate(card(), (c) => { node(c, 1).layout = { mode: 'NONE' }; }), 'ERRORE', 'R-D1', /auto layout mancante/), 'R-D1: frame senza auto layout');
ok(has(mutate(card(), (c) => { node(c, 1, 0).positioning = 'ABSOLUTE'; }), 'ERRORE', 'R-D1', /posizione assoluta/), 'R-D1: posizione assoluta');
ok(has(mutate(card(), (c) => { node(c, 0).rotation = 15; }), 'ERRORE', 'R-D1', /rotazione/), 'R-D1: rotazione');

// ---------- R-D2 ----------

ok(has(mutate(BUTTON, (c) => { delete c.variants[0].tree.fills[0].var; }), 'AVVISO', 'R-D2', /colore #4f46e5 non legato/), 'R-D2: colore senza variabile');
ok(has(mutate(BUTTON, (c) => { c.variants[0].tree.fills[0].var = 'brand/inesistente'; }), 'ERRORE', 'R-D2', /non trovata/), 'R-D2: variabile sconosciuta');
ok(has(mutate(card(), (c) => { delete c.tree.radius.var; }), 'AVVISO', 'R-D2', /raggio 16/), 'R-D2: raggio senza variabile');
ok(has(mutate(card(), (c) => { delete c.tree.effects.style; }), 'AVVISO', 'R-D2', /ombra non legata/), 'R-D2: ombra senza stile');
ok(has(mutate(BUTTON, (c) => { delete c.variants[0].tree.layout.padding.top.var; }, { strict: true }), 'ERRORE', 'R-D2', /padding top 12/), 'R-D2 con --strict: diventa errore');

// ---------- R-D3 ----------

const noSize = (c) => { delete c.tree.children[0].text.size.var; };
ok(has(mutate(INPUT, noSize), 'AVVISO', 'R-D3', /dimensione del testo 13/), 'R-D3: dimensione senza variabile');
ok(has(mutate(INPUT, (c) => { c.tree.children[0].text.font.family = 'Roboto'; }), 'ERRORE', 'R-D3', /Roboto/), 'R-D3: famiglia diversa dai token');
ok(has(mutate(INPUT, noSize, { strict: true }), 'ERRORE', 'R-D3', /dimensione del testo 13/), 'R-D3 con --strict: diventa errore');

// ---------- R-D4 ----------

ok(has(mutate(card(), (c) => { node(c, 1, 0).name = 'Body'; }), 'ERRORE', 'R-D4', /nome uguale/), 'R-D4: due livelli con lo stesso nome');
ok(has(mutate(card(), (c) => { node(c, 1, 0).name = 'Bo dy'; node(c, 1).name = 'bo-dy'; }), 'ERRORE', 'R-D4', /stessa|uguale/), 'R-D4: nomi diversi, stessa classe');
ok(has(mutate(card(), (c) => { node(c, 0).name = '!!!'; }), 'ERRORE', 'R-D4', /senza lettere/), 'R-D4: nome senza lettere');

// ---------- R-D5 ----------

ok(has(mutate(card(), (c) => { delete node(c, 1, 0, 0).refs; }), 'AVVISO', 'R-D5', /testo fisso/), 'R-D5: testo non legato a una proprietà');
ok(has(mutate(card(), (c) => { delete node(c, 1, 0, 0).refs; }), 'AVVISO', 'R-D5', /"Title" non usata/), 'R-D5: proprietà non usata');

// ---------- R-D6 ----------

ok(has(mutate(BUTTON, (c) => { c.properties.State = { type: 'VARIANT', default: 'Default', options: ['Default', 'Pressed'] }; }), 'ERRORE', 'R-D6', /Pressed/), 'R-D6: valore di State non ammesso');
ok(has(mutate(BUTTON, (c) => { c.properties.Variant.options = ['Primary', 'primary']; }), 'ERRORE', 'R-D6', /stessa classe/), 'R-D6: opzioni con la stessa classe');
ok(has(mutate(BUTTON, (c) => { c.variants.pop(); }), 'AVVISO', 'R-D6', /1 varianti disegnate su 2/), 'R-D6: combinazione mancante');

// ---------- R-D7 ----------

ok(has(mutate(card(), (c) => { node(c, 1, 1).instance.component = 'Badge'; }), 'ERRORE', 'R-D7', /"Badge"/), 'R-D7: istanza di un componente non esportato');

// ---------- R-D8 e rules.json ----------

const rules = { root: { tag: 'article' }, layers: { Image: { tag: 'img', props: { src: 'image', alt: 'imageAlt' }, optional: 'image' }, Title: { tag: 'h3' }, Text: { tag: 'p' } }, props: { image: { default: '' }, imageAlt: { default: '' }, buttonHref: { default: '#', to: 'Button.href' } } };
ok(has(mutate(card(), (c) => { node(c, 0).fills = [{ type: 'SOLID', color: '#f8fafc', var: 'surface/background' }]; }, { rules }), 'ERRORE', 'R-D8', /senza riempimento immagine/), 'R-D8: tag img su un livello senza immagine');
ok(has(mutate(card(), (c) => { node(c, 1, 0, 1).name = node(c, 1, 0, 1).text.characters; }), 'ERRORE', 'R-D4', /nome automatico/), 'R-D4: testo con nome automatico');
ok(!has(mutate(card(), (c) => { node(c, 0).fills = [{ type: 'IMAGE', scaleMode: 'FILL' }]; }, { rules }), 'ERRORE', 'R-D8', /./), 'R-D8: con riempimento immagine va bene');
ok(errors(mutate(card(), (c) => { node(c, 0).fills = [{ type: 'IMAGE', scaleMode: 'FILL' }]; }, { rules })).length === 0, 'rules.json corretto: nessun errore');
ok(has(lint(card(), { rules: { ...rules, extra: 1 } }), 'ERRORE', 'rules', /campo non ammesso "extra"/), 'rules: chiave sconosciuta');
ok(has(lint(card(), { rules: { layers: { Titolo: { tag: 'h3' } } } }), 'ERRORE', 'rules', /"Titolo" non trovato/), 'rules: livello rinominato in Figma');
ok(has(lint(card(), { rules: { layers: { Title: { tag: 'marquee' } } } }), 'ERRORE', 'rules', /marquee/), 'rules: tag non ammesso');
ok(has(lint(INPUT, { rules: { layers: { Label: { tag: 'label', textAs: 'placeholder' } } } }), 'ERRORE', 'rules', /textAs vale solo/), 'rules: textAs fuori da input');
ok(has(lint(BUTTON, { rules: { root: { tag: 'button', linkWhen: 'url' } } }), 'ERRORE', 'rules', /linkWhen/), 'rules: linkWhen su proprietà inesistente');
ok(has(lint(card(), { rules: { props: { x: { to: 'Title.href' } } } }), 'ERRORE', 'rules', /non è un'istanza/), 'rules: to verso un livello che non è un\'istanza');

// ---------- R-D9 ----------

const r9 = [
  [(c) => { node(c, 1).fills = [{ type: 'GRADIENT_LINEAR' }]; }, /GRADIENT_LINEAR/, 'gradiente'],
  [(c) => { c.tree.fills.push({ type: 'SOLID', color: '#000000', var: 'text/primary' }); }, /2 riempimenti/, 'due riempimenti'],
  [(c) => { c.tree.fills = 'MIXED'; }, /misti/, 'riempimenti misti'],
  [(c) => { c.tree.stroke.align = 'OUTSIDE'; }, /OUTSIDE/, 'bordo esterno'],
  [(c) => { c.tree.stroke.weight = { mixed: [1, 0, 1, 0] }; }, /spessori diversi/, 'bordo con spessori diversi'],
  [(c) => { c.tree.effects.items[0].type = 'INNER_SHADOW'; }, /INNER_SHADOW/, 'ombra interna'],
  [(c) => { node(c, 0).mask = true; }, /maschera/, 'maschera'],
  [(c) => { node(c, 0).blend = 'MULTIPLY'; }, /MULTIPLY/, 'modalità di fusione'],
  [(c) => { node(c, 1).layout.wrap = true; }, /wrap/, 'auto layout con a capo'],
  [(c) => { node(c, 1, 0, 0).text.lineHeight = { unit: 'PERCENT', value: 120 }; }, /percentuale/, 'altezza di riga in percentuale'],
  [(c) => { node(c, 1, 0, 0).text.letterSpacing.value = 2; }, /lettere/, 'spaziatura tra le lettere'],
  [(c) => { node(c, 1, 0, 0).text.decoration = 'UNDERLINE'; }, /UNDERLINE/, 'testo sottolineato'],
  [(c) => { node(c, 1, 0, 0).text.size = 'MIXED'; }, /size misto/, 'testo con dimensioni miste'],
];
for (const [fn, re, name] of r9) ok(has(mutate(card(), fn), 'ERRORE', 'R-D9', re), `R-D9: ${name}`);

// ---------- solo libreria standard ----------

for (const f of readdirSync(dirname(fileURLToPath(import.meta.url))).filter((f) => f.endsWith('.mjs'))) {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), f), 'utf8');
  const external = [...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]).filter((i) => !i.startsWith('node:') && !i.startsWith('.'));
  ok(external.length === 0, `${f}: solo libreria standard di Node`);
}

console.log(failed ? `\n${failed} falliti, ${passed} riusciti` : `ok: ${passed} controlli`);
process.exit(failed ? 1 : 0);
