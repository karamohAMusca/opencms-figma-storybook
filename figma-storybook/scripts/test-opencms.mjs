// Verifica che i JSP generati per OpenCms producano lo stesso HTML dei template disegnati in Storybook.
// Per ogni componente con un *.opencms.js prova i default e una variante per ogni proprietà (ogni opzione, ogni sì/no,
// ogni testo facoltativo vuoto): disegna il template, esegue il JSP con un interprete minimo (opencms/jsp-sim.mjs)
// e confronta l'HTML. Non sostituisce la prova in OpenCms (fase 4 di PIANO.md): controlla la traduzione.
// Uso: npm run test:opencms   (esce con 1 se un caso non coincide)
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHtml } from '../src/template.js';
import { compileJsp } from './opencms/jsp.mjs';
import { runJsp } from './opencms/jsp-sim.mjs';
import { loadOpencms } from './opencms/load.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { defs, registry } = await loadOpencms(root);
const jsps = new Map(defs.map((d) => [`/system/modules/it.progetti.figma/${(d.formatter ?? d.element).jsp}`, compileJsp(d, registry)]));
const isBinding = (b) => b && typeof b === 'object';

/** Contesto OpenCms (contenuto, impostazioni, parametri) che corrisponde a questi valori delle proprietà. */
function context(def, props) {
  const value = {};
  const settings = {};
  const param = {};
  const wrap = (name) => (value[name] ??= { text: '', isSet: false, toLink: '' });
  for (const [name, b] of Object.entries(def.bind).filter(([, b]) => isBinding(b))) {
    const v = props[name];
    if (b.kind === 'field') Object.assign(wrap(b.name), { text: v ?? '', isSet: !!v });
    if (b.kind === 'link') Object.assign(wrap(b.name), { toLink: v ?? '', isSet: !!v });
    if (b.kind === 'setting') settings[b.name] = v;
    if (b.kind === 'settingIs') settings[b.name] = v ? b.on : '';
    if (b.kind === 'param') param[b.name] = v == null || v === false ? '' : String(v);
  }
  return { value, param, cms: { element: { settings, instanceId: 'ID' } } };
}

function include(file, params) {
  if (!jsps.has(file)) throw new Error(`include di un JSP sconosciuto: ${file}`);
  return runJsp(jsps.get(file), { param: params, value: {}, cms: { element: { settings: {} } } }, include);
}

/** Default, poi una proprietà alla volta: ogni opzione, il sì/no opposto, il testo facoltativo vuoto. */
function cases(def) {
  const base = {};
  for (const [name, p] of Object.entries(def.component.props)) {
    const b = def.bind[name];
    // Valori calcolati (id) e campi obbligatori in OpenCms senza default nel template (es. il link del Button): valore di prova.
    const required = isBinding(b) && !b.test.length && b.kind !== 'raw' && b.kind !== 'setting';
    base[name] = typeof p.default === 'function' || (required && p.default == null) ? `test-${name}` : p.default;
  }
  const list = [{ label: 'default', props: base }];
  for (const [name, b] of Object.entries(def.bind).filter(([, b]) => isBinding(b))) {
    const p = def.component.props[name];
    // Scelte: ogni opzione, più un valore non ammesso (impostazione vuota in OpenCms): deve valere il default.
    if (p.options) for (const o of [...p.options, '']) list.push({ label: `${name}=${o || '(vuoto)'}`, props: { ...base, [name]: o } });
    else if (typeof p.default === 'boolean') list.push({ label: `${name}=${!p.default}`, props: { ...base, [name]: !p.default } });
    else if (['field', 'param'].includes(b.kind) && b.test.length) list.push({ label: `${name} vuoto`, props: { ...base, [name]: '' } });
  }
  return list;
}

const normalize = (html) => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').replace(/\s+>/g, '>').trim();

let failed = 0;
let total = 0;
for (const def of defs) {
  const jsp = compileJsp(def, registry);
  for (const { label, props } of cases(def)) {
    total++;
    const ctx = context(def, props);
    // In OpenCms le costanti dei collegamenti e i testi JSP (raw) prevalgono: il template va disegnato con gli stessi valori.
    const expectedProps = { ...props };
    for (const [name, b] of Object.entries(def.bind)) {
      expectedProps[name] = isBinding(b) ? (b.kind === 'raw' ? runJsp(b.out, ctx, include) : props[name]) : b;
    }
    const w = def.formatter?.wrapper;
    const expected = normalize((w ? `<div class="fx-element ${w}">` : '') + renderHtml(def.component, expectedProps) + (w ? '</div>' : ''));
    const actual = normalize(runJsp(jsp, ctx, include));
    if (expected !== actual) {
      failed++;
      console.error(`DIVERSO  ${def.component.name} [${label}]\n  template: ${expected}\n  jsp:      ${actual}`);
    }
  }
}
console.log(failed ? `${failed} casi su ${total} non coincidono` : `ok: ${total} casi, JSP e template producono lo stesso HTML`);
process.exit(failed ? 1 : 0);
