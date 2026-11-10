// Controllo delle regole del disegno sugli export di fx-export (piano-design-system/GENERATORE.md, G2).
// Uso: npm run figma:lint [componente] [-- --strict]
// Legge figma/export/*.json e, se ci sono, src/components/<nome>/<nome>.rules.json. Stampa un problema per riga,
// nell'ordine dei livelli: ERRORE (la generazione non può partire) o AVVISO (va nel report). --strict rende errori
// anche gli avvisi delle regole R-D2 e R-D3 (dopo G5). Esce con 1 se c'è almeno un errore.
// Solo regole scritte qui: nessuna AI, nessuna rete, nessuna dipendenza.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlugin } from './plugin.mjs';
import { validate } from './schema.mjs';
import { camel } from './generate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { slug } = loadPlugin();

/** Prima famiglia di una lista CSS: '"Inter", system-ui, sans-serif' → 'Inter'. Le altre sono riserve del browser. */
export const primaryFamily = (list) => list.split(',')[0].trim().replace(/^["']|["']$/g, '');

export const STATE_VALUES = ['Default', 'Hover', 'Focus', 'Disabled'];

/** Nomi delle variabili definite in variables.json. */
export function variableNames(variables) {
  const names = new Set();
  for (const col of Object.values(variables?.collections ?? {})) for (const n of Object.keys(col.variables)) names.add(n);
  return names;
}

/**
 * Controlla un export. ctx: { exported: Set di slug dei componenti esportati, variables: Set di nomi,
 * fontFamily: famiglia dei token (o null), rules: contenuto di rules.json (o null), strict: bool }.
 * Restituisce [{ level: 'ERRORE' | 'AVVISO', rule, where, msg }].
 */
export function lintComponent(data, ctx) {
  const out = [];
  const name = data.component.name;
  const err = (rule, where, msg) => out.push({ level: 'ERRORE', rule, where, msg });
  const warn = (rule, where, msg) => out.push({ level: ctx.strict && (rule === 'R-D2' || rule === 'R-D3') ? 'ERRORE' : 'AVVISO', rule, where, msg });
  const knownVar = (where, v) => { if (v && !ctx.variables.has(v)) err('R-D2', where, `variabile "${v}" non trovata in variables.json`); };
  const props = data.properties ?? {};

  const trees = data.variants.length ? data.variants.map((v) => v.tree) : [data.tree];
  const labels = data.variants.length ? data.variants.map((v) => `${name} [${v.name}]`) : [name];
  const refsUsed = new Set();

  trees.forEach((tree, ti) => {
    const seen = new Map(); // slug → nome, per R-D4
    const walk = (n, path, isRoot) => {
      const where = path.join(' › ');
      for (const v of Object.values(n.refs ?? {})) refsUsed.add(v);

      // R-D9: solo ciò che le tabelle sanno tradurre
      if (n.mask) err('R-D9', where, 'maschera non ammessa');
      if (n.blend) err('R-D9', where, `modalità di fusione ${n.blend} non ammessa`);
      if (n.layout?.mode === 'GRID') err('R-D9', where, 'auto layout a griglia non ammesso');
      if (n.layout?.wrap) err('R-D9', where, 'auto layout con a capo (wrap) non ammesso');

      // R-D1: auto layout, niente posizioni assolute né rotazioni
      if (n.positioning === 'ABSOLUTE') err('R-D1', where, 'posizione assoluta');
      if (n.rotation) err('R-D1', where, `rotazione ${n.rotation}°`);
      if (n.type !== 'INSTANCE' && n.children?.length && (!n.layout || n.layout.mode === 'NONE')) err('R-D1', where, 'auto layout mancante');

      // R-D4: nomi utilizzabili come classi, univoci nel componente
      const s = slug(n.name);
      if (!s) err('R-D4', where, `nome "${n.name}" senza lettere o cifre`);
      if (n.type === 'TEXT' && n.text && n.name === n.text.characters) err('R-D4', where, 'il livello di testo ha come nome il suo contenuto (nome automatico di Figma): dagli un nome proprio');
      if (!isRoot && s) {
        if (seen.has(s)) err('R-D4', where, `nome uguale a "${seen.get(s)}" dopo la trasformazione in classe (${s})`);
        else seen.set(s, where);
      }

      if (n.type === 'INSTANCE') {
        // R-D7: istanza di un componente che ha il suo export
        if (!ctx.exported.has(slug(n.instance.component))) err('R-D7', where, `istanza di "${n.instance.component}", che non è esportato in figma/export/`);
        return; // l'aspetto dell'istanza è quello del suo componente
      }

      // R-D9 e R-D2: riempimenti, bordi, raggi, effetti
      if (n.fills === 'MIXED') err('R-D9', where, 'riempimenti misti');
      else if (n.fills) {
        if (n.fills.length > 1) err('R-D9', where, `${n.fills.length} riempimenti: ne è ammesso uno`);
        for (const f of n.fills) {
          if (f.type !== 'SOLID' && f.type !== 'IMAGE') err('R-D9', where, `riempimento ${f.type} non ammesso`);
          if (f.type === 'SOLID') { if (!f.var) warn('R-D2', where, `colore ${f.color} non legato a una variabile`); knownVar(where, f.var); }
        }
      }
      if (n.stroke) {
        const p = n.stroke.paints;
        if (p === 'MIXED' || p.length > 1) err('R-D9', where, 'bordo con più colori');
        else if (p.length && p[0].type !== 'SOLID') err('R-D9', where, `bordo ${p[0].type} non ammesso`);
        else if (p.length) { if (!p[0].var) warn('R-D2', where, `colore del bordo ${p[0].color} non legato a una variabile`); knownVar(where, p[0].var); }
        if (n.stroke.align !== 'INSIDE') err('R-D9', where, `bordo ${n.stroke.align}: è ammesso solo quello interno`);
        if (n.stroke.weight.mixed) err('R-D9', where, 'bordo con spessori diversi per lato');
        else { if (!n.stroke.weight.var) warn('R-D2', where, `spessore del bordo ${n.stroke.weight.value} non legato a una variabile`); knownVar(where, n.stroke.weight.var); }
      }
      if (n.radius) {
        const values = n.radius.corners ?? [n.radius];
        for (const r of values) { if (r.value && !r.var) warn('R-D2', where, `raggio ${r.value} non legato a una variabile`); knownVar(where, r.var); }
      }
      if (n.effects) {
        if (n.effects.items.some((e) => e.type !== 'DROP_SHADOW')) err('R-D9', where, `effetto ${n.effects.items.find((e) => e.type !== 'DROP_SHADOW').type} non ammesso`);
        if (!n.effects.style) warn('R-D2', where, 'ombra non legata a uno stile di effetto');
      }
      if (n.layout && n.layout.mode !== 'NONE') {
        for (const side of ['top', 'right', 'bottom', 'left']) {
          const v = n.layout.padding[side];
          if (v.value && !v.var) warn('R-D2', where, `padding ${side} ${v.value} non legato a una variabile`);
          knownVar(where, v.var);
        }
        if ((n.children?.length ?? 0) > 1 && n.layout.gap.value && !n.layout.gap.var) warn('R-D2', where, `spaziatura ${n.layout.gap.value} non legata a una variabile`);
        knownVar(where, n.layout.gap.var);
      }

      // Testi: R-D9 (stili misti o non traducibili), R-D3 (tipografia), R-D5 (testo modificabile)
      if (n.text) {
        const t = n.text;
        for (const k of ['weight', 'size', 'lineHeight', 'letterSpacing']) if (t[k] === 'MIXED') err('R-D9', where, `testo con ${k} misto`);
        if (t.font.family === 'MIXED') err('R-D9', where, 'testo con più famiglie di font');
        else if (ctx.fontFamily && t.font.family !== primaryFamily(ctx.fontFamily)) err('R-D3', where, `famiglia "${t.font.family}" diversa da quella dei token (${primaryFamily(ctx.fontFamily)})`);
        if (t.lineHeight !== 'MIXED' && t.lineHeight.unit === 'PERCENT') err('R-D9', where, 'altezza di riga in percentuale: usa Auto o pixel');
        if (t.letterSpacing !== 'MIXED' && t.letterSpacing.value !== 0) err('R-D9', where, 'spaziatura tra le lettere diversa da 0');
        if (t.case) err('R-D9', where, `maiuscole/minuscole ${t.case} non ammesse`);
        if (t.decoration) err('R-D9', where, `decorazione ${t.decoration} non ammessa`);
        if (t.size !== 'MIXED') { if (!t.size.var) warn('R-D3', where, `dimensione del testo ${t.size.value} non legata a una variabile`); knownVar(where, t.size.var); }
        const tf = t.fills;
        if (tf === 'MIXED' || tf.length !== 1 || tf[0].type !== 'SOLID') err('R-D9', where, 'il testo deve avere un solo colore pieno');
        else { if (!tf[0].var) warn('R-D2', where, `colore del testo ${tf[0].color} non legato a una variabile`); knownVar(where, tf[0].var); }
        if (!n.refs?.characters) warn('R-D5', where, 'testo fisso: non è legato a una proprietà TEXT');
      }

      for (const c of n.children ?? []) walk(c, [...path, c.name], false);
    };
    walk(tree, [labels[ti]], true);
  });

  // R-D5: proprietà definite ma non usate
  for (const [p, def] of Object.entries(props)) {
    if ((def.type === 'TEXT' || def.type === 'BOOLEAN') && !refsUsed.has(p)) warn('R-D5', name, `proprietà ${def.type} "${p}" non usata da nessun livello`);
  }

  // R-D6: varianti
  for (const [p, def] of Object.entries(props)) {
    if (def.type !== 'VARIANT') continue;
    const slugs = def.options.map((o) => slug(o));
    if (slugs.some((s) => !s)) err('R-D6', name, `proprietà "${p}": un'opzione è vuota dopo la trasformazione in classe`);
    if (new Set(slugs).size !== slugs.length) err('R-D6', name, `proprietà "${p}": due opzioni danno la stessa classe`);
    if (p === 'State') for (const o of def.options) if (!STATE_VALUES.includes(o)) err('R-D6', name, `State "${o}" non ammesso (ammessi: ${STATE_VALUES.join(', ')})`);
  }
  if (data.variants.length) {
    const expected = Object.values(props).filter((d) => d.type === 'VARIANT').reduce((n, d) => n * d.options.length, 1);
    if (data.variants.length !== expected) warn('R-D6', name, `${data.variants.length} varianti disegnate su ${expected} combinazioni possibili`);
  }

  // rules.json: schema e coerenza con Figma (R-D8 per le immagini)
  if (ctx.rules) {
    const r = ctx.rules;
    for (const e of validate(r, 'rules')) err('rules', `${slug(name)}.rules.json`, e);
    const layers = new Map();
    const index = (n) => { if (!layers.has(n.name)) layers.set(n.name, n); (n.children ?? []).forEach(index); };
    trees.forEach(index);
    // Nomi delle proprietà come li usa il generatore: Figma in camelCase, testi delle istanze esposte, immagini
    const propNames = new Set([...Object.keys(r.props ?? {}), ...Object.keys(props).map(camel)]);
    const collect = (n) => {
      if (n.type === 'INSTANCE' && n.instance.exposed) for (const [p, v] of Object.entries(n.instance.properties)) if (typeof v === 'string') propNames.add(camel(`${n.name} ${p}`));
      if (Array.isArray(n.fills) && n.fills.some((f) => f.type === 'IMAGE')) { propNames.add(camel(n.name)); propNames.add(camel(`${n.name} alt`)); }
      (n.children ?? []).forEach(collect);
    };
    trees.forEach(collect);
    for (const [layer, def] of Object.entries(r.layers ?? {})) {
      const where = `${slug(name)}.rules.json › layers › ${layer}`;
      const n = layers.get(layer);
      if (!n) { err('rules', where, `livello "${layer}" non trovato in Figma (rinominato?)`); continue; }
      if (def.tag === 'img' && !(Array.isArray(n.fills) && n.fills.some((f) => f.type === 'IMAGE'))) err('R-D8', where, 'tag img su un livello senza riempimento immagine');
      if (def.textAs && def.tag !== 'input') err('rules', where, 'textAs vale solo con tag input');
      if (def.for && !layers.has(def.for)) err('rules', where, `for: livello "${def.for}" non trovato`);
      if (def.optional && !propNames.has(def.optional)) err('rules', where, `optional: proprietà "${def.optional}" non definita`);
    }
    if (r.root?.linkWhen && !propNames.has(r.root.linkWhen)) err('rules', `${slug(name)}.rules.json › root`, `linkWhen: proprietà "${r.root.linkWhen}" non definita`);
    for (const [p, def] of Object.entries(r.props ?? {})) {
      if (!def.to) continue;
      const target = layers.get(def.to.split('.')[0]);
      if (!target || target.type !== 'INSTANCE') err('rules', `${slug(name)}.rules.json › props › ${p}`, `to: "${def.to}" non è un'istanza del componente`);
    }
  }
  return out;
}

/** Tutti gli export (o uno) con le loro rules.json. */
export function lintAll({ exportDir = join(root, 'figma', 'export'), componentsDir = join(root, 'src', 'components'), only = null, strict = false } = {}) {
  const files = readdirSync(exportDir).filter((f) => f.endsWith('.json') && f !== 'variables.json').sort();
  const variables = existsSync(join(exportDir, 'variables.json')) ? JSON.parse(readFileSync(join(exportDir, 'variables.json'), 'utf8')) : null;
  const tokensPath = join(root, 'figma', 'tokens.json');
  const fontFamily = existsSync(tokensPath) ? JSON.parse(readFileSync(tokensPath, 'utf8')).styles?.['font/family'] ?? null : null;
  const exported = new Set(files.map((f) => f.replace(/\.json$/, '')));
  const results = [];
  if (!variables) results.push({ component: '-', level: 'ERRORE', rule: 'R-D2', where: 'figma/export', msg: 'manca variables.json: esporta di nuovo con fx-export' });
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    if (only && id !== only) continue;
    const data = JSON.parse(readFileSync(join(exportDir, f), 'utf8'));
    const rulesPath = join(componentsDir, id, `${id}.rules.json`);
    const rules = existsSync(rulesPath) ? JSON.parse(readFileSync(rulesPath, 'utf8')) : null;
    for (const p of lintComponent(data, { exported, variables: variableNames(variables), fontFamily, rules, strict })) results.push({ component: id, ...p });
  }
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const only = args.find((a) => !a.startsWith('--')) ?? null;
  const results = lintAll({ only, strict: args.includes('--strict') });
  for (const r of results) console.log(`${r.level.padEnd(6)} ${r.rule.padEnd(5)} ${r.where}: ${r.msg}`);
  const errors = results.filter((r) => r.level === 'ERRORE').length;
  const warnings = results.length - errors;
  console.log(`\n${errors} errori, ${warnings} avvisi`);
  process.exit(errors ? 1 : 0);
}
