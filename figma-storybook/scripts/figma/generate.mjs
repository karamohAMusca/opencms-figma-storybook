// Generatore Figma → Storybook (piano-design-system/GENERATORE.md, G3). Deterministico, senza AI, senza rete,
// solo libreria standard di Node.
//
// Uso: npm run figma:generate [componente] [-- --check]
// Legge figma/export/<componente>.json, figma/export/variables.json, figma/tokens.json (parte `styles`), figma/manifest.json
// (parte `screens`) e, se ci sono, src/components/<componente>/<componente>.rules.json e <componente>.extra.css. Scrive:
//   src/components/<componente>/<componente>.template.js, .css, .js, <Nome>.stories.js
//   src/tokens.css e it.progetti.figma/resources/css/tokens.css   variabili Figma (mode predefinito) + `styles`
//   figma/tokens.json (parte `variables`) e figma/manifest.json (parte `components`)
// Ogni scelta viene dalle tabelle di questo file: ciò che le tabelle non prevedono è un errore, non una supposizione.
// Con --check non scrive niente ed esce con 1 se un file non coincide con quello che genererebbe.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadPlugin } from './plugin.mjs';

export const GENERATOR_VERSION = '1.0.0';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { slug } = loadPlugin();

// ---------------- nomi ----------------

/** 'Button label' → 'buttonLabel' (come src/figma.js). */
export const camel = (name) => {
  const s = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9\s]/g, ' ').trim();
  return s.charAt(0).toLowerCase() + s.slice(1).replace(/\s+(\w)/g, (_, c) => c.toUpperCase());
};
export const pascal = (name) => { const c = camel(name); return c.charAt(0).toUpperCase() + c.slice(1); };
/** 'brand/primary' → '--brand-primary'. */
export const cssVar = (name) => `--${String(name).split('/').map(slug).join('-')}`;
const PREFIX = 'fx';

// ---------------- tabelle ----------------

/** Ordine fisso delle dichiarazioni: una proprietà fuori elenco è un errore del generatore. */
export const ORDER = ['box-sizing', 'display', 'flex-direction', 'flex', 'align-self', 'justify-content', 'align-items', 'gap',
  'width', 'max-width', 'height', 'margin', 'padding', 'overflow', 'background', 'border', 'border-radius', 'box-shadow', 'opacity',
  'object-fit', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-align', 'text-decoration',
  'white-space', 'cursor'];

/** Correzioni per Mercury aggiunte sempre per tag (le dichiarazioni del disegno hanno la precedenza). */
export const TAGS = {
  div: {}, section: {}, article: {}, header: {}, footer: {},
  h1: { margin: '0', 'font-family': 'inherit', 'letter-spacing': 'normal' },
  h2: { margin: '0', 'font-family': 'inherit', 'letter-spacing': 'normal' },
  h3: { margin: '0', 'font-family': 'inherit', 'letter-spacing': 'normal' },
  h4: { margin: '0', 'font-family': 'inherit', 'letter-spacing': 'normal' },
  h5: { margin: '0', 'font-family': 'inherit', 'letter-spacing': 'normal' },
  h6: { margin: '0', 'font-family': 'inherit', 'letter-spacing': 'normal' },
  p: { margin: '0', 'font-family': 'inherit', 'letter-spacing': 'normal' },
  span: { margin: '0', 'font-family': 'inherit', 'letter-spacing': 'normal' },
  a: { 'text-decoration': 'none' },
  button: { margin: '0', border: '0', cursor: 'pointer', 'font-family': 'inherit' },
  img: { display: 'block', 'max-width': 'none', margin: '0' },
  label: { margin: '0' },
  input: { margin: '0', 'font-family': 'inherit', 'box-shadow': 'none' },
};
const MAIN = { MIN: null, CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' };
const CROSS = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };
const ALIGN = { LEFT: null, CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' };
const FIT = { FILL: 'cover', FIT: 'contain', CROP: 'cover', TILE: 'cover' };

// ---------------- valori ----------------

const num = (n) => String(Math.round(n * 100) / 100);
const px = (n) => (n === 0 ? '0' : `${num(n)}px`);
const val = (v) => (v.var ? `var(${cssVar(v.var)})` : px(v.value));
const colorOf = (p) => (p.var ? `var(${cssVar(p.var)})` : p.color);
function shorthand(parts) {
  const [t, r, b, l] = parts;
  if (t === r && r === b && b === l) return t;
  if (t === b && r === l) return `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

export class GenError extends Error {}
const fail = (where, msg) => { throw new GenError(`${where}: ${msg}`); };

// ---------------- CSS ----------------

/** Dichiarazioni di aspetto di un livello (senza dimensioni, che dipendono dal genitore). */
export function lookCss(n, where) {
  const d = {};
  const L = n.layout;
  if (L && L.mode !== 'NONE') {
    if (L.mode !== 'HORIZONTAL' && L.mode !== 'VERTICAL') fail(where, `auto layout ${L.mode} non supportato`);
    d.display = 'flex';
    if (L.mode === 'VERTICAL') d['flex-direction'] = 'column';
    if (MAIN[L.main] === undefined) fail(where, `allineamento ${L.main} non supportato`);
    if (MAIN[L.main]) d['justify-content'] = MAIN[L.main];
    if (!CROSS[L.cross]) fail(where, `allineamento ${L.cross} non supportato`);
    d['align-items'] = CROSS[L.cross];
    if ((n.children?.length ?? 0) > 1 && L.gap.value) d.gap = val(L.gap);
    const pad = ['top', 'right', 'bottom', 'left'].map((k) => val(L.padding[k]));
    if (pad.some((p) => p !== '0')) d.padding = shorthand(pad);
  }
  if (n.clip) d.overflow = 'hidden';
  if (Array.isArray(n.fills)) {
    if (n.fills.length > 1) fail(where, 'più riempimenti');
    const f = n.fills[0];
    if (f?.type === 'SOLID') d.background = colorOf(f);
    else if (f?.type === 'IMAGE') { if (!FIT[f.scaleMode]) fail(where, `riempimento immagine ${f.scaleMode}`); d['object-fit'] = FIT[f.scaleMode]; }
    else if (f) fail(where, `riempimento ${f.type} non supportato`);
  } else if (n.fills) fail(where, 'riempimenti misti');
  if (n.stroke) {
    const p = n.stroke.paints;
    if (n.stroke.align !== 'INSIDE' || p === 'MIXED' || p.length !== 1 || p[0].type !== 'SOLID' || n.stroke.weight.mixed) fail(where, 'bordo non supportato (serve un colore pieno, interno, spessore uniforme)');
    d.border = `${val(n.stroke.weight)} solid ${colorOf(p[0])}`;
  }
  if (n.radius) d['border-radius'] = n.radius.corners ? shorthand(n.radius.corners.map(val)) : val(n.radius);
  if (n.effects) {
    if (n.effects.items.some((e) => e.type !== 'DROP_SHADOW')) fail(where, 'effetto non supportato');
    d['box-shadow'] = n.effects.style ? `var(${cssVar(n.effects.style)})`
      : n.effects.items.map((e) => `${px(e.offset.x)} ${px(e.offset.y)} ${px(e.radius)} ${px(e.spread ?? 0)} ${e.color}`).join(', ');
  }
  if (n.opacity !== undefined) d.opacity = num(n.opacity);
  if (d.padding || d.border) d['box-sizing'] = 'border-box';
  return d;
}

/** Tipografia di un livello di testo. */
export function textCss(n, where) {
  const t = n.text;
  if ([t.size, t.weight, t.lineHeight, t.letterSpacing, t.fills].includes('MIXED') || t.font.family === 'MIXED') fail(where, 'testo con stili misti');
  const d = { 'font-family': 'var(--font-family)', 'font-size': val(t.size), 'font-weight': String(t.weight) };
  if (t.lineHeight.unit === 'AUTO') d['line-height'] = 'var(--font-line-height)';
  else if (t.lineHeight.unit === 'PIXELS') d['line-height'] = px(t.lineHeight.value);
  else fail(where, `altezza di riga ${t.lineHeight.unit} non supportata`);
  if (t.letterSpacing.value !== 0) fail(where, 'spaziatura tra le lettere non supportata');
  if (t.fills.length !== 1 || t.fills[0].type !== 'SOLID') fail(where, 'il testo deve avere un solo colore pieno');
  d.color = colorOf(t.fills[0]);
  if (ALIGN[t.align] === undefined) fail(where, `allineamento ${t.align} non supportato`);
  if (ALIGN[t.align]) d['text-align'] = ALIGN[t.align];
  if (t.case || t.decoration) fail(where, 'maiuscole o decorazioni del testo non supportate');
  if (n.size.w === 'HUG') d['white-space'] = 'nowrap';
  return d;
}

/** Dimensioni di un livello rispetto al genitore (null = radice). */
export function sizeCss(n, parentMode, where) {
  const d = {};
  const s = n.size;
  if (!parentMode) {
    if (s.w === 'FIXED') d.width = '100%'; // la radice prende la larghezza del contenitore; la misura Figma va nella story
    if (s.w === 'HUG' && n.layout && n.layout.mode !== 'NONE') d.display = 'inline-flex';
    if (s.h === 'FIXED') d.height = val(s.height);
    return d;
  }
  if (parentMode === 'NONE') fail(where, 'livello in un genitore senza auto layout');
  const mainW = parentMode === 'HORIZONTAL';
  if (s.w === 'FIXED') d.width = val(s.width);
  if (s.w === 'FILL') { if (mainW) d.flex = '1 1 0'; else d.width = '100%'; }
  if (s.h === 'FIXED' && n.type !== 'TEXT') d.height = val(s.height);
  if (s.h === 'FILL') { if (mainW) d['align-self'] = 'stretch'; else d.flex = '1 1 0'; }
  return d;
}

function formatRule(selectors, decl, where) {
  const keys = Object.keys(decl);
  for (const k of keys) if (!ORDER.includes(k)) fail(where, `proprietà CSS ${k} fuori dall'ordine fisso del generatore`);
  keys.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return `${selectors.join(',\n')} {\n${keys.map((k) => `  ${k}: ${decl[k]};`).join('\n')}\n}`;
}

// ---------------- template (sorgente JS) ----------------

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const lit = (v) => (typeof v === 'string' ? q(v) : JSON.stringify(v));
const ind = (s, n) => s.split('\n').map((l) => ' '.repeat(n) + l).join('\n');

function hCall(tag, attrs, children) {
  const a = Object.entries(attrs).map(([k, v]) => `${/^[a-z]+$/i.test(k) ? k : q(k)}: ${v}`).join(', ');
  if (!children.length) return `h(${q(tag)}, { ${a} })`;
  if (children.length === 1 && !children[0].includes('\n') && children[0].length < 60) return `h(${q(tag)}, { ${a} }, ${children[0]})`;
  return `h(${q(tag)}, { ${a} },\n${children.map((c) => ind(c, 2)).join(',\n')},\n)`;
}

// ---------------- componente ----------------

/**
 * Genera i file di un componente. ctx: { exports: Map slug → export, rules, extraCss, hash }.
 * Restituisce { files: { nome: contenuto }, deps: [slug] }.
 */
export function generateComponent(id, data, ctx) {
  const rules = ctx.rules ?? {};
  const name = data.component.name;
  const comp = slug(name);
  const base = `${PREFIX}-${comp}`;
  const header = `GENERATO da figma/export/${id}.json (sha256 ${ctx.hash.slice(0, 16)}) con figma:generate ${GENERATOR_VERSION}: non modificare a mano`;
  const props = data.properties ?? {};
  const variantProps = Object.entries(props).filter(([, d]) => d.type === 'VARIANT');
  if (variantProps.length > 1) fail(name, 'più di una proprietà VARIANT: non ancora supportato');
  if (variantProps.some(([p]) => p === 'State')) fail(name, 'la proprietà State non è ancora supportata dal generatore');
  if (Object.values(props).some((d) => d.type === 'INSTANCE_SWAP' || d.type === 'SLOT')) fail(name, 'proprietà INSTANCE_SWAP/SLOT non supportate');

  // Alberi: il predefinito e, per i set, le altre varianti (stessa struttura obbligatoria)
  let tree;
  const others = [];
  if (data.variants.length) {
    const [vp, vdef] = variantProps[0];
    const def = data.variants.find((v) => v.values[vp] === vdef.default);
    if (!def) fail(name, `variante predefinita ${vdef.default} non trovata`);
    tree = def.tree;
    for (const v of data.variants) if (v !== def) others.push({ value: slug(v.values[vp]), tree: v.tree });
  } else tree = data.tree;

  const imports = new Set(['h']);
  const deps = [];
  const tplProps = []; // [nome, sorgente della definizione]
  const addProp = (pname, src) => { if (!tplProps.some(([n]) => n === pname)) tplProps.push([pname, src]); };
  const storyArgs = {}; // valori iniziali delle story: i default delle proprietà
  const addArg = (pname, v) => { if (v !== undefined && !(pname in storyArgs)) storyArgs[pname] = v; };

  for (const [p, d] of Object.entries(props)) {
    if (d.type === 'TEXT' || d.type === 'BOOLEAN') { addProp(camel(p), `{ default: ${lit(d.default)} }`); addArg(camel(p), d.default); }
    if (d.type === 'VARIANT') { addProp(camel(p), `{ options: [${d.options.map((o) => q(slug(o))).join(', ')}], default: ${q(slug(d.default))} }`); addArg(camel(p), slug(d.default)); }
  }
  for (const [p, d] of Object.entries(rules.props ?? {})) { addProp(p, 'default' in d ? `{ default: ${lit(d.default)} }` : '{}'); addArg(p, d.default); }
  const propDefault = (p) => (rules.props?.[p] && 'default' in rules.props[p] ? rules.props[p].default : undefined);
  const attrValue = (p) => { imports.add('prop'); if (typeof propDefault(p) === 'boolean') return `prop(${q(p)})`; imports.add('opt'); return `opt(prop(${q(p)}))`; };

  const cssRules = []; // [selettori, dichiarazioni, where]
  const classOf = (n, isRoot) => (isRoot ? base : `${base}__${slug(n.name)}`);

  /** Un livello → sorgente del template; raccoglie il CSS. */
  function node(n, parentMode, isRoot, path) {
    const where = path.join(' › ');
    const lr = isRoot ? {} : (rules.layers?.[n.name] ?? {});
    // Istanza di un altro componente
    if (n.type === 'INSTANCE') {
      const other = slug(n.instance.component);
      const exp = ctx.exports.get(other);
      if (!exp) fail(where, `istanza di ${n.instance.component}, che non è esportato`);
      if (!deps.includes(other)) deps.push(other);
      imports.add('use');
      const args = [];
      for (const [p, v] of Object.entries(n.instance.properties)) {
        const d = exp.properties?.[p];
        if (!d) continue;
        if (d.type === 'TEXT' && n.instance.exposed) {
          const own = camel(`${n.name} ${p}`);
          addProp(own, `{ default: ${lit(v)} }`);
          addArg(own, v);
          imports.add('prop');
          args.push(`${camel(p)}: prop(${q(own)})`);
        } else args.push(`${camel(p)}: ${lit(d.type === 'VARIANT' ? slug(v) : v)}`);
      }
      for (const [p, d] of Object.entries(rules.props ?? {})) {
        if (d.to && d.to.split('.')[0] === n.name) { imports.add('prop'); args.push(`${d.to.split('.')[1]}: prop(${q(p)})`); }
      }
      const size = sizeCss(n, parentMode, where);
      if (Object.keys(size).length) cssRules.push([[`.${classOf({ name: path[path.length - 2] ?? '' }, path.length === 2)} > .${PREFIX}-${other}`], size, where]);
      return wrapVisible(n, `use(${other.replace(/-(\w)/g, (_, c) => c.toUpperCase())}, { ${args.join(', ')} })`);
    }

    const image = Array.isArray(n.fills) && n.fills.some((f) => f.type === 'IMAGE');
    let tag = isRoot ? (rules.root?.tag ?? 'div') : (lr.tag ?? (image ? 'img' : n.type === 'TEXT' ? 'p' : 'div'));
    if (image && tag !== 'img') fail(where, 'riempimento immagine su un livello che non è img');
    if (!TAGS[tag]) fail(where, `tag ${tag} non ammesso`);

    const cls = classOf(n, isRoot);
    const decl = { ...lookCss(n, where), ...sizeCss(n, parentMode, where) };
    // Un elemento senza figli (input) non usa l'auto layout del frame da cui nasce: restano padding e aspetto
    if (lr.textAs) for (const k of ['display', 'flex-direction', 'justify-content', 'align-items', 'gap']) delete decl[k];
    // La regola del livello va prima di quelle dei figli: si prenota il posto e si riempie dopo
    const slot = cssRules.length;
    cssRules.push(null);
    const attrs = {};
    let children = [];
    const kids = n.children ?? [];
    const loneText = n.type !== 'TEXT' && kids.length === 1 && kids[0].type === 'TEXT' && !rules.layers?.[kids[0].name];

    if (n.type === 'TEXT') {
      Object.assign(decl, textCss(n, where));
      children = [n.refs?.characters ? (imports.add('prop'), `prop(${q(camel(n.refs.characters))})`) : q(n.text.characters)];
    } else if (lr.textAs) {
      // input: il testo del livello diventa un attributo; il suo colore va su ::placeholder
      if (kids.length !== 1 || kids[0].type !== 'TEXT') fail(where, 'textAs richiede un solo livello di testo dentro');
      const t = textCss(kids[0], `${where} › ${kids[0].name}`);
      const color = t.color;
      delete t.color; delete t['white-space'];
      Object.assign(decl, t);
      const ref = kids[0].refs?.characters;
      attrs[lr.textAs] = ref ? attrValueText(camel(ref)) : q(kids[0].text.characters);
      cssRules.push([[`.${cls}::${lr.textAs === 'placeholder' ? 'placeholder' : 'selection'}`], { color, opacity: '1' }, where]);
    } else if (loneText) {
      // Contenitore di un solo testo: il testo va direttamente nell'elemento, con la sua tipografia
      const t = textCss(kids[0], `${where} › ${kids[0].name}`);
      Object.assign(decl, t);
      children = [kids[0].refs?.characters ? (imports.add('prop'), `prop(${q(camel(kids[0].refs.characters))})`) : q(kids[0].text.characters)];
    } else {
      children = kids.map((c) => node(c, n.layout?.mode ?? 'NONE', false, [...path, c.name]));
    }
    let imgSrc = null;
    if (tag === 'img') {
      const src = lr.props?.src ?? camel(n.name);
      imgSrc = src;
      const alt = lr.props?.alt ?? camel(`${n.name} alt`);
      addProp(src, `{ default: ${lit(propDefault(src) ?? '')} }`);
      addProp(alt, `{ default: ${lit(propDefault(alt) ?? '')} }`);
      addArg(src, propDefault(src) ?? '');
      addArg(alt, propDefault(alt) ?? '');
      imports.add('prop');
      attrs.src = `prop(${q(src)})`;
      attrs.alt = `prop(${q(alt)})`;
      children = [];
    } else {
      for (const [attr, p] of Object.entries(lr.props ?? {})) attrs[attr] = attrValue(p);
    }
    if (lr.for) attrs.for = attrValue('id');
    if (tag === 'input' && rules.layers && Object.values(rules.layers).some((l) => l.for === n.name)) attrs.id = attrValue('id');

    // Classe (con varianti e modificatori sulla radice)
    let classSrc = q(cls);
    if (isRoot && (variantProps.length || rules.modifiers)) {
      imports.add('cls');
      const parts = [q(cls)];
      for (const [p] of variantProps) { imports.add('mod'); imports.add('prop'); parts.push(`mod(${q(`${cls}--`)}, prop(${q(camel(p))}))`); }
      for (const [m, p] of Object.entries(rules.modifiers ?? {})) { imports.add('when'); imports.add('prop'); parts.push(`when(prop(${q(p)}), ${q(`${cls}--${m}`)})`); }
      classSrc = `cls(${parts.join(', ')})`;
    }
    const tagDecl = { ...TAGS[tag], ...decl };
    const linkRoot = isRoot && rules.root?.linkWhen;
    const sel = [`.${cls}`];
    cssRules[slot] = [linkRoot ? [...sel, `.${cls}:hover`, `.${cls}:focus`] : sel, linkRoot ? { ...tagDecl, ...TAGS.a } : tagDecl, where];

    const allAttrs = { class: classSrc, ...attrs };
    if (isRoot) for (const [attr, p] of Object.entries(rules.root?.props ?? {})) allAttrs[attr] = attrValue(p);
    let src;
    if (linkRoot) {
      imports.add('choose'); imports.add('prop');
      const href = rules.root.linkWhen;
      const aAttrs = { class: classSrc, href: `prop(${q(href)})` };
      const bAttrs = { ...allAttrs };
      for (const [attr, p] of Object.entries(rules.root?.props ?? {})) if (attr.startsWith('on')) aAttrs[attr] = attrValue(p);
      src = `choose(prop(${q(href)}),\n${ind(hCall('a', aAttrs, children), 2)},\n${ind(hCall(tag, bAttrs, children), 2)},\n)`;
    } else src = hCall(tag, allAttrs, children);
    if (imgSrc) { imports.add('when'); src = `when(prop(${q(imgSrc)}), ${src})`; }
    return wrapVisible(n, src);
  }

  function attrValueText(p) { imports.add('prop'); imports.add('opt'); return `opt(prop(${q(p)}))`; }
  /** Visibilità: proprietà BOOLEAN di Figma (refs.visible), poi `optional` di rules.json (sparisce se la proprietà è vuota). */
  function wrapVisible(n, src) {
    const optional = rules.layers?.[n.name]?.optional;
    if (optional) { imports.add('when'); imports.add('prop'); src = `when(prop(${q(optional)}), ${src})`; }
    if (!n.refs?.visible) return src;
    imports.add('when'); imports.add('prop');
    return `when(prop(${q(camel(n.refs.visible))}), ${src})`;
  }

  const templateSrc = node(tree, null, true, [name]);

  // CSS delle varianti: solo le dichiarazioni diverse da quelle della variante predefinita
  const variantCss = [];
  for (const o of others) {
    const walk = (a, b, parentMode, isRoot, path) => {
      const where = `${path.join(' › ')} [${o.value}]`;
      if ((!isRoot && a.name !== b.name) || a.type !== b.type || (a.children?.length ?? 0) !== (b.children?.length ?? 0)) fail(where, 'le varianti devono avere gli stessi livelli');
      (a.children ?? []).forEach((c, i) => { if (c.name !== b.children[i].name || c.type !== b.children[i].type) fail(`${where} › ${c.name}`, 'le varianti devono avere gli stessi livelli'); });
      if (a.type === 'INSTANCE') return;
      const calc = (n) => {
        const kids = n.children ?? [];
        const lr = isRoot ? {} : (rules.layers?.[n.name] ?? {});
        const d = { ...lookCss(n, where), ...sizeCss(n, parentMode, where), ...(n.type === 'TEXT' ? textCss(n, where) : {}) };
        if (!lr.textAs && n.type !== 'TEXT' && kids.length === 1 && kids[0].type === 'TEXT' && !rules.layers?.[kids[0].name]) Object.assign(d, textCss(kids[0], where));
        return d;
      };
      const da = calc(a);
      const db = calc(b);
      const diff = {};
      for (const k of new Set([...Object.keys(da), ...Object.keys(db)])) if (da[k] !== db[k]) diff[k] = db[k] ?? 'initial';
      if (Object.keys(diff).length) {
        const sel = isRoot ? `.${base}--${o.value}` : `.${base}--${o.value} .${classOf(b, false)}`;
        const sels = isRoot && rules.root?.linkWhen ? [sel, `${sel}:hover`, `${sel}:focus`] : [sel];
        variantCss.push([sels, diff, where]);
      }
      const loneText = (a.children?.length === 1 && a.children[0].type === 'TEXT' && !rules.layers?.[a.children[0].name]);
      if (!loneText) (a.children ?? []).forEach((c, i) => walk(c, b.children[i], a.layout?.mode ?? 'NONE', false, [...path, c.name]));
    };
    walk(tree, o.tree, null, true, [name]);
  }

  // ---- file ----
  const depImports = deps.map((d) => `import ${d.replace(/-(\w)/g, (_, c) => c.toUpperCase())} from '../${d}/${d}.template.js';`);
  const helperList = ['h', 'prop', 'when', 'choose', 'use', 'cls', 'mod', 'opt'].filter((x) => imports.has(x));
  const template = [
    `// ${header}`,
    `import { ${helperList.join(', ')} } from '../../template.js';`,
    ...depImports,
    '',
    `/** Figma: ${name} (${data.component.nodeId}). */`,
    'export default {',
    `  name: ${q(name)},`,
    `  figma: ${q(data.component.nodeId)},`,
    '  props: {',
    ...tplProps.map(([p, s]) => `    ${p}: ${s},`),
    '  },',
    `  template: ${ind(templateSrc, 2).trimStart()},`,
    '};',
    '',
  ].join('\n');

  const css = [
    `/* ${header} */`,
    '',
    ...[...cssRules, ...variantCss].map(([s, d, w]) => formatRule(s, d, w) + '\n'),
  ].join('\n') + (ctx.extraCss ? `\n/* ---------- ${id}.extra.css (scritto a mano) ---------- */\n\n${ctx.extraCss.replace(/\r\n/g, '\n').trim()}\n` : '');

  const Name = pascal(name);
  const ident = comp.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const js = [
    `// ${header}`,
    "import { render } from '../../template.js';",
    `import ${ident} from './${id}.template.js';`,
    ...deps.map((d) => `import '../${d}/${d}.css';`),
    `import './${id}.css';`,
    '',
    `/** Figma: ${name} (${data.component.nodeId}). I token CSS arrivano da src/index.css. */`,
    `export const ${Name} = (props) => render(${ident}, props);`,
    '',
  ].join('\n');

  // Story: proprietà e varianti Figma da figma/manifest.json (figmaMeta, figmaVariant), le altre qui sotto
  const width = tree.size.w === 'FIXED' ? tree.size.width.value : null;
  const wrap = (w) => `(args) => el('div', { style: 'width:${num(w)}px' }, ${Name}(args))`;
  const figmaArgs = new Set(Object.keys(props).map(camel));
  const extra = Object.entries(storyArgs).filter(([k]) => !figmaArgs.has(k));
  const stories = [];
  if (data.variants.length) for (const o of variantProps[0][1].options) stories.push(`export const ${pascal(o)} = figmaVariant(${q(name)}, ${q(pascal(o))});`);
  else stories.push(`export const Default = ${rules.stories?.Default ? `{ args: ${JSON.stringify(rules.stories.Default.args ?? {})} }` : '{}'};`);
  let needEl = Boolean(width);
  for (const [k, st] of Object.entries(rules.stories ?? {})) {
    if (k === 'Default') continue;
    const body = [`name: ${q(st.name)}`, `args: ${JSON.stringify(st.args ?? {})}`];
    if (st.width) { body.push(`render: ${wrap(st.width)}`); needEl = true; }
    stories.push(`export const ${k} = { ${body.join(', ')} };`);
  }
  const storiesSrc = [
    `// ${header}`,
    ...(needEl ? ["import { el } from '../../el.js';"] : []),
    `import { figmaMeta${data.variants.length ? ', figmaVariant' : ''} } from '../../figma.js';`,
    `import { ${Name} } from './${id}.js';`,
    '',
    `const figma = figmaMeta(${q(name)});`,
    '',
    `// Figma: ${name} (${data.component.nodeId}). Proprietà e varianti da figma/manifest.json, generato dall'export;`,
    '// la descrizione in Docs è quella del componente Figma (figmaMeta).',
    'export default {',
    `  title: ${q(`Componenti/${Name}`)},`,
    width ? `  render: ${wrap(width)},` : `  render: (args) => ${Name}(args),`,
    '  parameters: figma.parameters,',
    '  args: {',
    '    ...figma.args,',
    ...extra.map(([k, v]) => `    ${k}: ${lit(v)},`),
    '  },',
    '  argTypes: {',
    '    ...figma.argTypes,',
    ...extra.map(([k]) => `    ${k}: { table: { category: 'Codice' } },`),
    '  },',
    '};',
    '',
    ...stories,
    '',
  ].join('\n');

  return { files: { [`${id}.template.js`]: template, [`${id}.css`]: css, [`${id}.js`]: js, [`${Name}.stories.js`]: storiesSrc }, deps };
}

/** tokens.css: variabili del mode predefinito di ogni collezione, poi i valori `styles` di tokens.json. */
export function generateTokens(variables, styles, hash) {
  const lines = [];
  for (const [cname, col] of Object.entries(variables.collections)) {
    lines.push(`  /* ${cname} (${col.defaultMode}) */`);
    for (const [vname, v] of Object.entries(col.variables)) {
      const value = v.values[col.defaultMode];
      let out;
      if (value && typeof value === 'object') out = `var(${cssVar(value.alias)})`;
      else if (v.type === 'COLOR') out = value;
      else if (v.type === 'FLOAT') out = px(value); // regola: i numeri delle variabili sono misure in px
      else fail(`variables.json › ${vname}`, `tipo ${v.type} non supportato nei token CSS`);
      lines.push(`  ${cssVar(vname)}: ${out};`);
    }
  }
  if (styles && Object.keys(styles).length) {
    lines.push('  /* styles di figma/tokens.json (valori non variabili, scritti a mano) */');
    for (const [k, v] of Object.entries(styles)) lines.push(`  ${cssVar(k)}: ${v};`);
  }
  return `/* GENERATO da figma/export/variables.json (sha256 ${hash.slice(0, 16)}) e figma/tokens.json (styles) con figma:generate ${GENERATOR_VERSION}: non modificare a mano */\n\n:root {\n${lines.join('\n')}\n}\n`;
}

const sha = (text) => createHash('sha256').update(text).digest('hex');

/** Tutti i file da generare: { percorso relativo a out → contenuto }. */
/** tokens.json: `variables` dal mode predefinito di variables.json (alias risolti), `styles` come sono (scritti a mano). */
export function generateTokensJson(current, variables, hash) {
  const flat = {};
  for (const col of Object.values(variables.collections)) {
    for (const [vname, v] of Object.entries(col.variables)) flat[vname] = { value: v.values[col.defaultMode], type: v.type };
  }
  const resolve = (name, seen = new Set()) => {
    const v = flat[name];
    if (!v) fail('variables.json', `alias verso la variabile sconosciuta ${name}`);
    if (v.value && typeof v.value === 'object') { if (seen.has(name)) fail('variables.json', `alias circolare ${name}`); seen.add(name); return resolve(v.value.alias, seen); }
    return v.type === 'FLOAT' ? num(v.value) : String(v.value);
  };
  const vars = {};
  for (const name of Object.keys(flat).sort()) vars[name] = resolve(name);
  return JSON.stringify({
    $comment: "Token. 'variables' è GENERATO da figma:generate (figma/export/variables.json, mode predefinito, alias risolti): non modificare a mano. 'styles' sono valori che in Figma non sono variabili: si scrivono a mano.",
    source: { export: 'figma/export/variables.json', sha256: hash.slice(0, 16) },
    variables: vars,
    styles: current.styles ?? {},
  }, null, 2) + '\n';
}

/** manifest.json: componenti dagli export; `file` e `screens` (schermate scritte a mano) restano come sono. */
export function generateManifest(current, exports) {
  const components = [];
  for (const [id, d] of exports) {
    const name = d.component.name;
    const vp = Object.entries(d.properties ?? {}).find(([, p]) => p.type === 'VARIANT');
    const def = d.variants.length ? d.variants.find((v) => vp && v.values[vp[0]] === vp[1].default) : null;
    const t = def ? def.tree : d.tree;
    const size = (tree) => [tree.size.width.value, tree.size.height.value];
    components.push({
      name,
      kind: d.variants.length ? 'component_set' : 'component',
      nodeId: d.component.nodeId,
      size: size(t),
      ...(d.component.description ? { description: d.component.description } : {}),
      variants: d.variants.map((v) => ({ name: v.name, nodeId: v.nodeId, size: size(v.tree), render: v.render, screenshot: `export/${v.screenshot}`, story: pascal(Object.values(v.values)[0]) })),
      properties: Object.fromEntries(Object.entries(d.properties ?? {}).map(([k, p]) => [k, { type: p.type, default: p.default, ...(p.options ? { options: p.options } : {}) }])),
      ...(d.variants.length ? {} : { visualStory: 'Default', render: d.render }),
      screenshot: `export/${def ? def.screenshot : d.screenshot}`,
      code: `src/components/${id}/`,
      stories: `Componenti/${pascal(name)}`,
    });
  }
  return JSON.stringify({
    $comment: "Inventario Figma. 'components' è GENERATO da figma:generate dagli export del plugin (figma/export/): non modificare a mano. 'screens' (schermate composte, non componenti) si scrive a mano. Screenshot: componenti in export/, schermate in screenshots/.",
    file: current.file,
    components,
    screens: current.screens.map(({ designContext, ...rest }) => rest),
  }, null, 2) + '\n';
}

/** Tutti i file da generare: { percorso relativo a figma-storybook/ → contenuto }. */
export function generateAll({ exportDir = join(root, 'figma', 'export'), componentsDir = join(root, 'src', 'components'), only = null } = {}) {
  const read = (f) => readFileSync(join(exportDir, f), 'utf8');
  const exports = new Map();
  const hashes = new Map();
  for (const f of readdirSync(exportDir).filter((f) => f.endsWith('.json') && f !== 'variables.json').sort()) {
    const text = read(f);
    exports.set(f.replace(/\.json$/, ''), JSON.parse(text));
    hashes.set(f.replace(/\.json$/, ''), sha(text));
  }
  const varText = read('variables.json');
  const variables = JSON.parse(varText);
  const tokensJson = JSON.parse(readFileSync(join(root, 'figma', 'tokens.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(root, 'figma', 'manifest.json'), 'utf8'));
  const tokensCss = generateTokens(variables, tokensJson.styles, sha(varText));
  const out = {
    'figma/manifest.json': generateManifest(manifest, exports),
    'figma/tokens.json': generateTokensJson(tokensJson, variables, sha(varText)),
    'src/tokens.css': tokensCss,
    '../it.progetti.figma/resources/css/tokens.css': tokensCss,
  };
  for (const [id, data] of exports) {
    if (only && id !== only) continue;
    const rulesPath = join(componentsDir, id, `${id}.rules.json`);
    const extraPath = join(componentsDir, id, `${id}.extra.css`);
    const { files } = generateComponent(id, data, {
      exports,
      hash: hashes.get(id),
      rules: existsSync(rulesPath) ? JSON.parse(readFileSync(rulesPath, 'utf8')) : null,
      extraCss: existsSync(extraPath) ? readFileSync(extraPath, 'utf8') : null,
    });
    for (const [f, c] of Object.entries(files)) out[`src/components/${id}/${f}`] = c;
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = args.find((a) => !a.startsWith('--')) ?? null;
  let files;
  try {
    files = generateAll({ only });
  } catch (e) {
    if (e instanceof GenError) { console.error(`ERRORE ${e.message}`); process.exit(1); }
    throw e;
  }
  let stale = 0;
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    const current = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : null;
    const name = relative(root, path).replace(/\\/g, '/');
    if (current === content) console.log(`${name}  già allineato`);
    else if (check) { console.error(`${name}  NON allineato: lancia npm run figma:generate`); stale++; }
    else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); console.log(`${name}  scritto`); }
  }
  process.exit(stale ? 1 : 0);
}
