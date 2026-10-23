// Interprete minimo del sottoinsieme di JSP prodotto da jsp.mjs, solo per i test: non è OpenCms.
// Capisce <cms:formatter>, <c:if>, <c:choose>/<c:when>/<c:otherwise>, <cms:include>/<cms:param> ed espressioni EL con
// percorsi, 'stringhe', eq, and, not, empty, ternario e fn:escapeXml.

const TAG = /<(\/?)(c:if|c:choose|c:when|c:otherwise|cms:formatter|cms:include|cms:param)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function parse(src) {
  const root = { tag: null, attrs: {}, children: [] };
  const stack = [root];
  let last = 0;
  for (const m of src.matchAll(TAG)) {
    const top = stack[stack.length - 1];
    if (m.index > last) top.children.push(src.slice(last, m.index));
    last = m.index + m[0].length;
    const [, closing, tag, rawAttrs, self] = m;
    if (closing) {
      if (stack.pop().tag !== tag) throw new Error(`</${tag}> non atteso`);
      continue;
    }
    const attrs = Object.fromEntries([...rawAttrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    const node = { tag, attrs, children: [] };
    top.children.push(node);
    if (!self) stack.push(node);
  }
  if (stack.length !== 1) throw new Error(`<${stack[stack.length - 1].tag}> non chiuso`);
  root.children.push(src.slice(last));
  return root;
}

// ---------- EL ----------

function tokenize(expr) {
  const tokens = [];
  const re = /\s*(?:('(?:[^'\\]|\\.)*')|([A-Za-z_][\w]*(?::[\w]+)?(?:\.[\w]+)*)|([?:(),]))/y;
  let m;
  while (re.lastIndex < expr.length && (m = re.exec(expr))) {
    if (m[1]) tokens.push({ str: m[1].slice(1, -1) });
    else if (m[2]) tokens.push({ id: m[2] });
    else tokens.push({ op: m[3] });
  }
  if (expr.slice(re.lastIndex).trim()) throw new Error(`EL non capita: ${expr}`);
  return tokens;
}

const plain = (v) => (v == null ? '' : typeof v === 'object' ? v.text ?? '' : String(v));
const isEmpty = (v) => v == null || v === '' || (typeof v === 'object' && v.isSet === false);

function evalEl(expr, ctx) {
  const t = tokenize(expr);
  let i = 0;
  const peek = (k) => t[i] && (t[i].op === k || t[i].id === k);
  const ternary = () => {
    const c = and();
    if (!peek('?')) return c;
    i++; const a = ternary(); i++; /* : */ const b = ternary();
    return c === true ? a : b;
  };
  const and = () => { let v = eq(); while (peek('and')) { i++; const r = eq(); v = v === true && r === true; } return v; };
  const eq = () => { const a = unary(); if (!peek('eq')) return a; i++; return plain(a) === plain(unary()); };
  const unary = () => {
    if (peek('not')) { i++; return unary() !== true; }
    if (peek('empty')) { i++; return isEmpty(unary()); }
    return primary();
  };
  const primary = () => {
    const tok = t[i++];
    if ('str' in tok) return tok.str;
    if (tok.op === '(') { const v = ternary(); i++; return v; }
    if (tok.id === 'fn:escapeXml') { i++; const v = ternary(); i++; return plain(v).replace(/[&<>"']/g, (c) => ESC[c]); }
    return tok.id.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
  };
  return ternary();
}

const interpolate = (text, ctx) => text.replace(/\$\{([^}]*)\}/g, (_, e) => plain(evalEl(e, ctx)));
const truthy = (attr, ctx) => evalEl(attr.replace(/^\$\{|\}$/g, ''), ctx) === true;

function render(node, ctx, include) {
  return node.children.map((c) => {
    if (typeof c === 'string') return interpolate(c, ctx);
    switch (c.tag) {
      case 'cms:formatter': return render(c, ctx, include);
      case 'c:if': return truthy(c.attrs.test, ctx) ? render(c, ctx, include) : '';
      case 'c:choose': {
        const branch = c.children.find((b) => typeof b !== 'string' && (b.tag === 'c:otherwise' || truthy(b.attrs.test, ctx)));
        return branch ? render(branch, ctx, include) : '';
      }
      case 'cms:include': {
        const params = Object.fromEntries(c.children.filter((p) => p.tag === 'cms:param')
          .map((p) => [p.attrs.name, interpolate(p.attrs.value, ctx)]));
        return include(c.attrs.file, params);
      }
      default: throw new Error(`<${c.tag}> non atteso qui`);
    }
  }).join('');
}

/** Esegue un JSP. ctx: { value, param, cms }; include(file, params) restituisce l'HTML di un JSP incluso. */
export function runJsp(source, ctx, include) {
  const src = source.replace(/<%--[\s\S]*?--%>/g, '').replace(/<%@[\s\S]*?%>/g, '');
  return render(parse(src), ctx, include);
}
