// Confronto HTML tra i componenti scritti a mano (src/components/) e quelli generati (src/generated/), fase G3.
// Uso: npm run figma:compare-html
// Per ogni componente con entrambe le versioni disegna gli stessi casi (default, ogni opzione, ogni sì/no opposto,
// ogni testo vuoto) e stampa le differenze. Le proprietà che esistono solo da una parte (per esempio le nuove
// proprietà BOOLEAN di Figma) restano al loro default. Esce con 1 se un caso differisce.
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderHtml } from '../../src/template.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = async (p) => (await import(pathToFileURL(p).href)).default;

/** Valori da provare: il default, poi una proprietà alla volta (come test-opencms.mjs). */
function cases(component) {
  const base = {};
  for (const [n, p] of Object.entries(component.props)) base[n] = typeof p.default === 'function' ? `test-${n}` : p.default;
  const list = [{ label: 'default', props: base }];
  for (const [n, p] of Object.entries(component.props)) {
    if (p.options) for (const o of p.options) list.push({ label: `${n}=${o}`, props: { ...base, [n]: o } });
    else if (typeof p.default === 'boolean') list.push({ label: `${n}=${!p.default}`, props: { ...base, [n]: !p.default } });
    else if (typeof p.default === 'string' && p.default) list.push({ label: `${n} vuoto`, props: { ...base, [n]: '' } });
    else if (p.default === undefined || p.default === '') list.push({ label: `${n}=test`, props: { ...base, [n]: `test-${n}` } });
  }
  return list;
}

let diffs = 0;
let total = 0;
const genDir = join(root, 'src', 'generated');
for (const id of readdirSync(genDir).filter((d) => existsSync(join(genDir, d, `${d}.template.js`))).sort()) {
  const handPath = join(root, 'src', 'components', id, `${id}.template.js`);
  if (!existsSync(handPath)) continue;
  const hand = await load(handPath);
  const gen = await load(join(genDir, id, `${id}.template.js`));
  const seen = new Set();
  for (const c of [...cases(hand), ...cases(gen)]) {
    if (seen.has(c.label)) continue;
    seen.add(c.label);
    // Le proprietà calcolate (id) hanno lo stesso valore di prova in entrambe le versioni
    const props = { ...c.props, ...(c.props.id === '' || c.props.id === undefined ? { id: 'test-id' } : {}) };
    // L'ordine degli attributi non cambia il significato: si confrontano ordinati
    const sortAttrs = (html) => html.replace(/<(\w+)((?:\s[^>]*?)?)>/g, (m, tag, attrs) => `<${tag}${(attrs.match(/\s[\w-]+(?:="[^"]*")?/g) ?? []).sort().join('')}>`);
    const a = sortAttrs(renderHtml(hand, props));
    const b = sortAttrs(renderHtml(gen, props));
    total++;
    if (a !== b) {
      diffs++;
      console.log(`DIVERSO  ${id} [${c.label}]\n  a mano:   ${a}\n  generato: ${b}`);
    }
  }
}
console.log(diffs ? `\n${diffs} casi diversi su ${total}` : `ok: ${total} casi, stesso HTML`);
process.exit(diffs ? 1 : 0);
