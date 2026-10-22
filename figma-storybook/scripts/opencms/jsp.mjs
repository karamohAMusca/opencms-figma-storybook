// Traduce il template di un componente (src/template.js) in un JSP per OpenCms, usando i collegamenti del suo *.opencms.js.
// Nel JSP ogni valore è una costante { s } o un'espressione { out, test }: `test` sono le condizioni EL per cui è presente.
// Le condizioni già verificate da un <c:if> esterno (`known`) non si ripetono: così i link opzionali dentro un blocco
// che li richiede diventano semplici <a>.

const MODULE = '/system/modules/it.progetti.figma/';
const VOID = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
const IND = '    ';

const isStatic = (v) => 's' in v;
const empty = (s) => s == null || s === false || s === '';

/** Valore statico di una proprietà non collegata: il default del template (quelli calcolati valgono solo in Storybook). */
function staticProp(def, given) {
  let s = given === undefined ? (typeof def.default === 'function' ? null : def.default ?? null) : given;
  if (def.options && !def.options.includes(s)) s = def.default;
  return { s };
}

function rootScope(component, bind) {
  const scope = {};
  for (const [name, def] of Object.entries(component.props)) {
    const b = bind[name];
    scope[name] = b && typeof b === 'object' ? { out: b.out, test: b.test } : staticProp(def, b);
  }
  return scope;
}

function val(node, ctx) {
  if (node == null || typeof node !== 'object') return { s: node ?? null };
  switch (node.t) {
    case 'prop': return ctx.scope[node.name] ?? { s: null };
    case 'concat': {
      const parts = node.parts.map((p) => val(p, ctx));
      if (parts.every(isStatic)) return { s: parts.map((p) => p.s ?? '').join('') };
      return { out: parts.map((p) => (isStatic(p) ? esc(p.s ?? '') : p.out)).join(''), test: [] };
    }
    case 'mod': {
      const v = val(node.value, ctx);
      return isStatic(v) ? { s: empty(v.s) ? null : node.prefix + v.s } : { out: esc(node.prefix) + v.out, test: v.test };
    }
    case 'opt': {
      const v = val(node.value, ctx);
      return isStatic(v) ? { s: v.s === '' ? null : v.s } : { ...v, optional: true };
    }
    case 'cls': return classes(node, ctx);
    default: throw new Error(`nodo "${node.t}" non traducibile come valore`);
  }
}

/** true, false, oppure le condizioni EL ancora da verificare. */
function cond(node, ctx) {
  const v = val(node, ctx);
  if (isStatic(v)) return !empty(v.s);
  const open = v.test.filter((t) => !ctx.known.has(t));
  return open.length ? open : true;
}

const el = (tests) => `\${${tests.join(' and ')}}`;
const withKnown = (ctx, tests) => ({ ...ctx, known: new Set([...ctx.known, ...tests]) });

/** Attributo class: parti fisse unite da spazi, varianti come espressioni, classi condizionali come ternari. */
function classes(node, ctx) {
  const pieces = []; // { s } classe fissa, { out } espressione, { tests, name } classe solo se le condizioni sono vere
  for (const p of node.parts) {
    if (p?.t === 'when') {
      const c = cond(p.cond, ctx);
      if (c === true) pieces.push({ s: p.then[0] });
      else if (c !== false) pieces.push({ tests: c, name: p.then[0] });
    } else {
      const v = val(p, ctx);
      if (!isStatic(v)) pieces.push({ out: v.out });
      else if (!empty(v.s)) pieces.push({ s: v.s });
    }
  }
  if (pieces.every(isStatic)) return { s: pieces.length ? pieces.map((p) => p.s).join(' ') : null };
  let out = '';
  for (const p of pieces) {
    if (p.tests) out += `\${${p.tests.join(' and ')} ? '${out ? ' ' : ''}${esc(p.name)}' : ''}`;
    else out += (out ? ' ' : '') + (isStatic(p) ? esc(p.s) : p.out);
  }
  return { out, test: [] };
}

function text(v) {
  return isStatic(v) ? (empty(v.s) ? '' : esc(v.s)) : v.out;
}

function openTag(node, ctx) {
  let s = `<${node.tag}`;
  for (const [name, attr] of Object.entries(node.attrs)) {
    if (name.startsWith('on')) continue; // eventi: solo Storybook
    const v = val(attr, ctx);
    if (isStatic(v)) {
      if (v.s == null || v.s === false) continue;
      s += v.s === true ? ` ${name}` : ` ${name}="${esc(v.s)}"`;
      continue;
    }
    const piece = `${name}="${v.out}"`;
    const open = v.optional ? v.test.filter((t) => !ctx.known.has(t)) : [];
    s += open.length ? ` <c:if test="${el(open)}">${piece}</c:if>` : ` ${piece}`;
  }
  return `${s}>`;
}

const isInline = (node) => node.children.some((c) => typeof c === 'string' || c?.t === 'prop');

/** Proprietà di un componente usato dentro un altro, espresse nel contesto di chi lo usa. */
function childScope(node, ctx) {
  const scope = {};
  for (const [name, def] of Object.entries(node.component.props)) {
    if (!(name in node.props)) { scope[name] = staticProp(def); continue; }
    const v = val(node.props[name], ctx);
    scope[name] = isStatic(v) ? staticProp(def, v.s) : v;
  }
  return scope;
}

/** Un componente con un proprio JSP (elemento) si include con <cms:include>; gli altri si espandono qui. */
function include(node, ctx, ind) {
  const def = ctx.registry.get(node.component);
  if (!def?.element) return null;
  const params = Object.entries(def.bind)
    .filter(([name, b]) => b?.kind === 'param' && name in node.props)
    .map(([name, b]) => {
      const v = val(node.props[name], ctx);
      return `${ind}${IND}<cms:param name="${b.name}" value="${isStatic(v) ? (empty(v.s) ? '' : esc(v.s)) : v.out}" />`;
    });
  return [`${ind}<cms:include file="${MODULE}${def.element.jsp}">`, ...params, `${ind}</cms:include>`];
}

function block(node, ctx, ind) {
  if (empty(node)) return [];
  if (typeof node !== 'object') return [ind + esc(node)];
  switch (node.t) {
    case 'prop': { const t = text(val(node, ctx)); return t ? [ind + t] : []; }
    case 'el': {
      const open = openTag(node, ctx);
      if (VOID.has(node.tag)) return [ind + open];
      if (isInline(node)) return [ind + open + node.children.map((c) => inline(c, ctx)).join('') + `</${node.tag}>`];
      return [ind + open, ...node.children.flatMap((c) => block(c, ctx, ind + IND)), `${ind}</${node.tag}>`];
    }
    case 'when': {
      const c = cond(node.cond, ctx);
      if (c === false) return [];
      if (c === true) return node.then.flatMap((n) => block(n, ctx, ind));
      const k = withKnown(ctx, c);
      return [`${ind}<c:if test="${el(c)}">`, ...node.then.flatMap((n) => block(n, k, ind + IND)), `${ind}</c:if>`];
    }
    case 'choose': {
      const c = cond(node.cond, ctx);
      if (c !== true && c !== false) {
        return [`${ind}<c:choose>`, `${ind}${IND}<c:when test="${el(c)}">`, ...block(node.then, withKnown(ctx, c), ind + IND + IND),
          `${ind}${IND}</c:when>`, `${ind}${IND}<c:otherwise>`, ...block(node.otherwise, ctx, ind + IND + IND),
          `${ind}${IND}</c:otherwise>`, `${ind}</c:choose>`];
      }
      return block(c ? node.then : node.otherwise, ctx, ind);
    }
    case 'use': return include(node, ctx, ind) ?? block(node.component.template, { ...ctx, scope: childScope(node, ctx) }, ind);
    default: throw new Error(`nodo "${node.t}" non traducibile`);
  }
}

function inline(node, ctx) {
  if (empty(node)) return '';
  if (typeof node !== 'object') return esc(node);
  switch (node.t) {
    case 'prop': return text(val(node, ctx));
    case 'el': {
      const open = openTag(node, ctx);
      return VOID.has(node.tag) ? open : open + node.children.map((c) => inline(c, ctx)).join('') + `</${node.tag}>`;
    }
    case 'when': {
      const c = cond(node.cond, ctx);
      if (c === false) return '';
      const k = c === true ? ctx : withKnown(ctx, c);
      const inner = node.then.map((n) => inline(n, k)).join('');
      return c === true ? inner : `<c:if test="${el(c)}">${inner}</c:if>`;
    }
    case 'choose': {
      const c = cond(node.cond, ctx);
      if (c === true || c === false) return inline(c ? node.then : node.otherwise, ctx);
      return `<c:choose><c:when test="${el(c)}">${inline(node.then, withKnown(ctx, c))}</c:when>`
        + `<c:otherwise>${inline(node.otherwise, ctx)}</c:otherwise></c:choose>`;
    }
    case 'use': {
      const inc = include(node, ctx, '');
      return inc ? inc.join('') : inline(node.component.template, { ...ctx, scope: childScope(node, ctx) });
    }
    default: throw new Error(`nodo "${node.t}" non traducibile`);
  }
}

/** JSP completo di un componente. `registry`: componente → suo *.opencms.js (per sapere chi si include). */
export function compileJsp(def, registry) {
  const ctx = { scope: rootScope(def.component, def.bind), known: new Set(), registry };
  const f = def.formatter;
  let body = block(def.component.template, ctx, f?.wrapper ? IND : '');
  if (f?.wrapper) body = [`<div class="fx-element ${f.wrapper}">`, ...body, '</div>'];
  if (f) body = ['<cms:formatter var="content" val="value">', ...body, '</cms:formatter>'];
  const text = body.join('\n');
  const head = ['<%@page buffer="none" session="false" pageEncoding="UTF-8" trimDirectiveWhitespaces="true"%>'];
  if (text.includes('<cms:')) head.push('<%@taglib prefix="cms" uri="http://www.opencms.org/taglib/cms"%>');
  if (text.includes('<c:')) head.push('<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>');
  if (text.includes('fn:')) head.push('<%@taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions"%>');
  head.push(`<%-- GENERATO da figma-storybook/scripts/export-opencms.mjs: non modificare a mano, cambia ${def.source}. --%>`);
  head.push(`<%-- ${def.comment} --%>`);
  return `${[...head, ...body].join('\n')}\n`;
}
