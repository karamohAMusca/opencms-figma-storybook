import { el } from './el.js';

/**
 * Template dei componenti: un albero di dati, senza funzioni, che Storybook disegna (`render`) e che
 * l'esportatore traduce in JSP per OpenCms (scripts/opencms/jsp.mjs). Per questo il markup va scritto
 * solo con i nodi qui sotto: ogni nodo ha un equivalente JSP.
 *
 * Un componente è { name, figma, props, template }: `props` dà per ogni proprietà il `default`
 * (anche una funzione, solo per Storybook) e, se è una scelta, le `options` ammesse.
 */

/** Valore di una proprietà. */
export const prop = (name) => ({ t: 'prop', name });
/** Elemento HTML. Attributi null o false vengono saltati (quelli vuoti solo con `opt`); `on*` sono eventi, solo in Storybook. */
export const h = (tag, attrs = {}, ...children) => ({ t: 'el', tag, attrs, children: children.flat() });
/** Figli mostrati solo se la condizione è vera (in un attributo di classe: la classe `then` solo se vera). */
export const when = (cond, ...then) => ({ t: 'when', cond, then: then.flat() });
/** Uno dei due rami. */
export const choose = (cond, then, otherwise) => ({ t: 'choose', cond, then, otherwise });
/** Un altro componente, con le sue proprietà espresse con i nodi di questo template. */
export const use = (component, props = {}) => ({ t: 'use', component, props });
/** Lista di classi: stringhe, `mod` e `when`. */
export const cls = (...parts) => ({ t: 'cls', parts });
/** Prefisso + valore, per le classi di variante: mod('fx-button--', prop('variant')). */
export const mod = (prefix, value) => ({ t: 'mod', prefix, value });
/** Concatenazione di stringhe e proprietà. */
export const concat = (...parts) => ({ t: 'concat', parts });
/** Attributo omesso se il valore è vuoto. */
export const opt = (value) => ({ t: 'opt', value });

const VOID = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);

/** Proprietà effettive: default per quelle mancanti, scelte non ammesse riportate al default. */
export function resolveProps(component, given = {}) {
  const props = {};
  for (const [name, def] of Object.entries(component.props)) {
    let v = given[name];
    if (v === undefined) v = typeof def.default === 'function' ? def.default() : def.default;
    if (def.options && !def.options.includes(v)) v = def.default;
    props[name] = v;
  }
  return props;
}

function value(node, scope) {
  if (node == null || typeof node !== 'object') return node;
  switch (node.t) {
    case 'prop': return scope[node.name];
    case 'concat': return node.parts.map((p) => value(p, scope) ?? '').join('');
    case 'mod': { const v = value(node.value, scope); return v ? node.prefix + v : null; }
    case 'when': return value(node.cond, scope) ? value(node.then[0], scope) : null;
    case 'cls': return node.parts.map((p) => value(p, scope)).filter(Boolean).join(' ');
    case 'opt': { const v = value(node.value, scope); return v === '' ? null : v; }
    default: throw new Error(`nodo "${node.t}" non ammesso come valore`);
  }
}

const empty = (v) => v == null || v === false || v === '';

function nodes(node, scope, build) {
  if (empty(node)) return [];
  if (typeof node !== 'object') return [String(node)];
  switch (node.t) {
    case 'prop': { const v = scope[node.name]; return empty(v) ? [] : [String(v)]; }
    case 'el': {
      const attrs = Object.fromEntries(Object.entries(node.attrs).map(([k, v]) => [k, value(v, scope)]));
      return [build(node.tag, attrs, node.children.flatMap((c) => nodes(c, scope, build)))];
    }
    case 'when': return value(node.cond, scope) ? node.then.flatMap((c) => nodes(c, scope, build)) : [];
    case 'choose': return nodes(value(node.cond, scope) ? node.then : node.otherwise, scope, build);
    case 'use': {
      const given = Object.fromEntries(Object.entries(node.props).map(([k, v]) => [k, value(v, scope)]));
      return nodes(node.component.template, resolveProps(node.component, given), build);
    }
    default: throw new Error(`nodo "${node.t}" non ammesso nel markup`);
  }
}

/** Disegna il componente come nodo DOM (Storybook). */
export function render(component, props) {
  return nodes(component.template, resolveProps(component, props), (tag, attrs, children) => el(tag, attrs, children))[0];
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/** Disegna il componente come HTML testuale (senza DOM: per i test in Node). */
export function renderHtml(component, props) {
  // Gli elementi già costruiti sono { html }, i testi stringhe da escapare.
  const html = (c) => (typeof c === 'string' ? esc(c) : c.html);
  return nodes(component.template, resolveProps(component, props), (tag, attrs, children) => {
    const a = Object.entries(attrs)
      .filter(([k, v]) => !k.startsWith('on') && v != null && v !== false)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');
    return { html: VOID.has(tag) ? `<${tag}${a}>` : `<${tag}${a}>${children.map(html).join('')}</${tag}>` };
  }).map(html).join('');
}
