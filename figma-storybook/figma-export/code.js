// fx-export: estrattore deterministico Figma → JSON (piano-design-system/GENERATORE.md, fase G1).
//
// Gira come plugin Figma in sviluppo (nessun accesso alla rete, vedi manifest.json). Legge il componente
// selezionato e le variabili locali con la Plugin API e consegna a chi lo lancia uno zip con:
//   <componente>.json            albero dei livelli, proprietà, varianti (formato: schema.json)
//   <componente>[.<variante>].png screenshot 1x
//   variables.json               tutte le variabili locali, per collezione e mode
// Stesso file Figma → stessi byte: chiavi ordinate, numeri arrotondati, nessuna data, utente o chiave del file.
// Niente AI, niente rete, niente dipendenze. Le funzioni sotto sono pure: test-export.mjs le prova in Node
// con un Figma simulato (in Node questo file viene caricato con `exports` definito).
'use strict';

var FX_EXPORT_VERSION = '1.0.0'; // deve coincidere con VERSION
var FX_SCHEMA = 1;

// ---------- normalizzazione ----------

function round(v) {
  var r = Math.round(v * 100) / 100;
  return r === 0 ? 0 : r; // niente -0
}

function hex2(n) {
  var s = Math.round(n * 255).toString(16);
  return s.length < 2 ? '0' + s : s;
}

/** Colore Figma (r, g, b, a tra 0 e 1) → '#rrggbb' o 'rgba(r, g, b, a)'. */
function color(c, opacity) {
  var a = round((c.a === undefined ? 1 : c.a) * (opacity === undefined ? 1 : opacity));
  if (a >= 1) return '#' + hex2(c.r) + hex2(c.g) + hex2(c.b);
  return 'rgba(' + Math.round(c.r * 255) + ', ' + Math.round(c.g * 255) + ', ' + Math.round(c.b * 255) + ', ' + a + ')';
}

/** Nome di proprietà senza il suffisso che Figma aggiunge: 'Label#1:5' → 'Label'. */
function propName(name) {
  var i = name.lastIndexOf('#');
  return i > 0 ? name.slice(0, i) : name;
}

/** Nome → parte di nome di file: minuscole, senza accenti, spazi e '/' → '-', resto tolto. */
function slug(name) {
  return String(name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s\/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    var out = {};
    Object.keys(v).sort().forEach(function (k) { if (v[k] !== undefined) out[k] = sortKeys(v[k]); });
    return out;
  }
  return v;
}

/** JSON canonico: chiavi in ordine, 2 spazi, LF, a capo finale. */
function stringify(v) {
  return JSON.stringify(sortKeys(v), null, 2) + '\n';
}

// ---------- lettura dei nodi ----------

function makeContext(api) {
  var varNames = {};
  var styleNames = {};
  return {
    mixed: api.mixed,
    variableName: async function (alias) {
      if (!alias || alias.type !== 'VARIABLE_ALIAS') return undefined;
      if (!(alias.id in varNames)) {
        var v = await api.variables.getVariableByIdAsync(alias.id);
        varNames[alias.id] = v ? v.name : 'UNKNOWN';
      }
      return varNames[alias.id];
    },
    styleName: async function (id) {
      if (!id || id === api.mixed) return undefined;
      if (!(id in styleNames)) {
        var s = await api.getStyleByIdAsync(id);
        styleNames[id] = s ? s.name : 'UNKNOWN';
      }
      return styleNames[id];
    },
  };
}

/** Variabile legata a un campo: alias singolo, o lista (testi) con un solo elemento. */
async function boundName(ctx, bound, key) {
  if (!bound || !(key in bound)) return undefined;
  var b = bound[key];
  if (Array.isArray(b)) {
    if (b.length === 0) return undefined;
    if (b.length > 1) return 'MIXED';
    b = b[0];
  }
  return ctx.variableName(b);
}

async function num(ctx, node, key, boundKey) {
  return { value: round(node[key]), var: await boundName(ctx, node.boundVariables, boundKey || key) };
}

async function paints(ctx, list) {
  if (list === ctx.mixed) return 'MIXED';
  var out = [];
  for (var i = 0; i < (list || []).length; i++) {
    var p = list[i];
    if (p.visible === false) continue;
    if (p.type === 'SOLID') {
      out.push({ type: 'SOLID', color: color(p.color, p.opacity), var: await boundName(ctx, p.boundVariables, 'color') });
    } else if (p.type === 'IMAGE') {
      out.push({ type: 'IMAGE', scaleMode: p.scaleMode });
    } else {
      out.push({ type: p.type }); // gradienti, video…: il controllo (G2) li rifiuta
    }
  }
  return out;
}

async function strokeInfo(ctx, node) {
  var list = await paints(ctx, node.strokes);
  if (list !== 'MIXED' && list.length === 0) return undefined;
  var weight;
  if (node.strokeWeight === ctx.mixed) {
    weight = { mixed: [round(node.strokeTopWeight), round(node.strokeRightWeight), round(node.strokeBottomWeight), round(node.strokeLeftWeight)] };
  } else {
    weight = { value: round(node.strokeWeight), var: await boundName(ctx, node.boundVariables, 'strokeTopWeight') || await boundName(ctx, node.boundVariables, 'strokeWeight') };
  }
  return { paints: list, weight: weight, align: node.strokeAlign };
}

async function radiusInfo(ctx, node) {
  if (!('cornerRadius' in node)) return undefined;
  var b = node.boundVariables || {};
  if (node.cornerRadius === ctx.mixed) {
    var corners = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'];
    var out = [];
    for (var i = 0; i < corners.length; i++) out.push({ value: round(node[corners[i]]), var: await boundName(ctx, b, corners[i]) });
    return { corners: out };
  }
  if (!node.cornerRadius) return undefined;
  return { value: round(node.cornerRadius), var: await boundName(ctx, b, 'topLeftRadius') || await boundName(ctx, b, 'cornerRadius') };
}

async function effectsInfo(ctx, node) {
  var list = (node.effects || []).filter(function (e) { return e.visible !== false; });
  if (list.length === 0) return undefined;
  var items = list.map(function (e) {
    var out = { type: e.type, radius: round(e.radius || 0) };
    if (e.color) out.color = color(e.color);
    if (e.offset) out.offset = { x: round(e.offset.x), y: round(e.offset.y) };
    if (e.spread !== undefined) out.spread = round(e.spread);
    return out;
  });
  return { items: items, style: await ctx.styleName(node.effectStyleId) };
}

async function layoutInfo(ctx, node) {
  if (!('layoutMode' in node)) return undefined;
  if (node.layoutMode === 'NONE') return { mode: 'NONE' };
  return {
    mode: node.layoutMode,
    wrap: node.layoutWrap === 'WRAP' ? true : undefined,
    gap: await num(ctx, node, 'itemSpacing'),
    padding: {
      top: await num(ctx, node, 'paddingTop'),
      right: await num(ctx, node, 'paddingRight'),
      bottom: await num(ctx, node, 'paddingBottom'),
      left: await num(ctx, node, 'paddingLeft'),
    },
    main: node.primaryAxisAlignItems,
    cross: node.counterAxisAlignItems,
  };
}

async function textInfo(ctx, node) {
  var b = node.boundVariables || {};
  var font = node.fontName === ctx.mixed ? { family: 'MIXED', style: 'MIXED' } : { family: node.fontName.family, style: node.fontName.style };
  var mixedOr = function (v, f) { return v === ctx.mixed ? 'MIXED' : f(v); };
  return {
    characters: node.characters,
    font: font,
    weight: mixedOr(node.fontWeight, function (v) { return v; }),
    size: node.fontSize === ctx.mixed ? 'MIXED' : { value: round(node.fontSize), var: await boundName(ctx, b, 'fontSize') },
    lineHeight: mixedOr(node.lineHeight, function (v) { return v.unit === 'AUTO' ? { unit: 'AUTO' } : { unit: v.unit, value: round(v.value) }; }),
    letterSpacing: mixedOr(node.letterSpacing, function (v) { return { unit: v.unit, value: round(v.value) }; }),
    align: node.textAlignHorizontal,
    case: mixedOr(node.textCase, function (v) { return v === 'ORIGINAL' ? undefined : v; }),
    decoration: mixedOr(node.textDecoration, function (v) { return v === 'NONE' ? undefined : v; }),
    style: await ctx.styleName(node.textStyleId),
  };
}

async function instanceInfo(ctx, node) {
  var main = await node.getMainComponentAsync();
  var set = main && main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent : null;
  var props = {};
  var cp = node.componentProperties || {};
  Object.keys(cp).forEach(function (k) {
    if (cp[k].type !== 'INSTANCE_SWAP') props[propName(k)] = cp[k].value;
  });
  return {
    component: set ? set.name : main ? main.name : 'UNKNOWN',
    componentNodeId: set ? set.id : main ? main.id : undefined,
    exposed: node.isExposedInstance ? true : undefined,
    properties: props,
  };
}

/** Un livello e i suoi figli. Le istanze non si aprono: rimandano al loro componente. */
async function serialize(ctx, node) {
  var out = { name: node.name, type: node.type, nodeId: node.id };
  if (node.visible === false) out.visible = false;
  if (node.componentPropertyReferences) {
    var refs = {};
    Object.keys(node.componentPropertyReferences).forEach(function (k) { refs[k] = propName(node.componentPropertyReferences[k]); });
    if (Object.keys(refs).length) out.refs = refs;
  }
  if (node.layoutPositioning === 'ABSOLUTE') out.positioning = 'ABSOLUTE';
  if (node.rotation) out.rotation = round(node.rotation);
  if (node.isMask) out.mask = true;
  if (node.blendMode && node.blendMode !== 'PASS_THROUGH' && node.blendMode !== 'NORMAL') out.blend = node.blendMode;
  if (node.opacity !== undefined && node.opacity < 1) out.opacity = round(node.opacity);
  out.size = {
    w: node.layoutSizingHorizontal || 'FIXED',
    h: node.layoutSizingVertical || 'FIXED',
    width: await num(ctx, node, 'width'),
    height: await num(ctx, node, 'height'),
  };
  if ('clipsContent' in node && node.clipsContent) out.clip = true;
  out.layout = await layoutInfo(ctx, node);
  if (node.type !== 'TEXT') {
    var f = await paints(ctx, node.fills);
    if (f === 'MIXED' || f.length) out.fills = f;
  }
  out.stroke = await strokeInfo(ctx, node);
  out.radius = await radiusInfo(ctx, node);
  out.effects = await effectsInfo(ctx, node);
  if (node.type === 'TEXT') {
    out.text = await textInfo(ctx, node);
    out.text.fills = await paints(ctx, node.fills);
  }
  if (node.type === 'INSTANCE') {
    out.instance = await instanceInfo(ctx, node);
    return out;
  }
  if (node.children && node.children.length) {
    out.children = [];
    for (var i = 0; i < node.children.length; i++) out.children.push(await serialize(ctx, node.children[i]));
  }
  return out;
}

function renderBounds(node) {
  var bb = node.absoluteBoundingBox;
  var rb = node.absoluteRenderBounds || bb;
  return [round(rb.x - bb.x), round(rb.y - bb.y), round(rb.width), round(rb.height)];
}

function definitions(node) {
  var defs = node.componentPropertyDefinitions || {};
  var out = {};
  Object.keys(defs).forEach(function (k) {
    var d = defs[k];
    out[propName(k)] = { type: d.type, default: d.defaultValue, options: d.variantOptions };
  });
  return out;
}

function variantSlug(values) {
  return Object.keys(values).sort().map(function (k) { return slug(values[k]); }).join('-');
}

/** Il componente selezionato → { name, data, shots: [{ node, file }] }. */
async function exportComponent(api, node) {
  if (node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET') {
    throw new Error('"' + node.name + '" è una variante: seleziona il set "' + node.parent.name + '".');
  }
  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
    throw new Error('Seleziona un componente o un set di varianti (selezionato: ' + node.type + ' "' + node.name + '").');
  }
  var ctx = makeContext(api);
  var base = slug(node.name);
  var data = {
    exporter: FX_EXPORT_VERSION,
    schema: FX_SCHEMA,
    component: { name: node.name, nodeId: node.id, kind: node.type, description: node.description || undefined },
    properties: definitions(node),
    variants: [],
  };
  var shots = [];
  if (node.type === 'COMPONENT_SET') {
    var kids = node.children.filter(function (c) { return c.type === 'COMPONENT'; });
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      var file = base + '.' + variantSlug(c.variantProperties || {}) + '.png';
      data.variants.push({ name: c.name, nodeId: c.id, values: c.variantProperties, render: renderBounds(c), screenshot: file, tree: await serialize(ctx, c) });
      shots.push({ node: c, file: file });
    }
  } else {
    data.render = renderBounds(node);
    data.screenshot = base + '.png';
    data.tree = await serialize(ctx, node);
    shots.push({ node: node, file: base + '.png' });
  }
  return { name: base, data: data, shots: shots };
}

/** Variabili locali: collezioni, mode e valori per mode, con gli alias risolti per nome. */
async function exportVariables(api) {
  var ctx = makeContext(api);
  var collections = await api.variables.getLocalVariableCollectionsAsync();
  var variables = await api.variables.getLocalVariablesAsync();
  var out = { exporter: FX_EXPORT_VERSION, schema: FX_SCHEMA, collections: {} };
  for (var i = 0; i < collections.length; i++) {
    var col = collections[i];
    var modeNames = {};
    col.modes.forEach(function (m) { modeNames[m.modeId] = m.name; });
    var vars = {};
    var own = variables.filter(function (v) { return v.variableCollectionId === col.id; });
    for (var j = 0; j < own.length; j++) {
      var v = own[j];
      var values = {};
      var ids = Object.keys(v.valuesByMode);
      for (var k = 0; k < ids.length; k++) {
        var val = v.valuesByMode[ids[k]];
        var norm;
        if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') norm = { alias: await ctx.variableName(val) };
        else if (v.resolvedType === 'COLOR') norm = color(val);
        else if (v.resolvedType === 'FLOAT') norm = round(val);
        else norm = val;
        values[modeNames[ids[k]] || ids[k]] = norm;
      }
      vars[v.name] = { type: v.resolvedType, values: values };
    }
    out.collections[col.name] = { defaultMode: modeNames[col.defaultModeId], modes: col.modes.map(function (m) { return m.name; }), variables: vars };
  }
  return out;
}

// ---------- zip (solo "store", senza compressione: deterministico e senza librerie) ----------

function utf8(str) {
  var out = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.codePointAt(i);
    if (c > 0xffff) i++;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(out);
}

var CRC_TABLE = (function () {
  var t = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(bytes) {
  var c = 0xffffffff;
  for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** files: [{ name, bytes }] → zip. File in ordine di nome, data fissa 1980-01-01 00:00. */
function makeZip(files) {
  files = files.slice().sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  var chunks = [];
  var central = [];
  var offset = 0;
  var DATE = 33; // 1980-01-01 in formato DOS
  function u16(n) { return [n & 0xff, (n >>> 8) & 0xff]; }
  function u32(n) { return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]; }
  files.forEach(function (f) {
    var name = utf8(f.name);
    var crc = crc32(f.bytes);
    var size = f.bytes.length;
    var common = [].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(DATE), u32(crc), u32(size), u32(size), u16(name.length), u16(0));
    var local = new Uint8Array([].concat(u32(0x04034b50), common));
    chunks.push(local, name, f.bytes);
    central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), common, u16(0), u16(0), u16(0), u32(0), u32(offset))), name);
    offset += local.length + name.length + size;
  });
  var centralSize = central.reduce(function (s, c) { return s + c.length; }, 0);
  var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralSize), u32(offset), u16(0)));
  var all = chunks.concat(central, [end]);
  var total = all.reduce(function (s, c) { return s + c.length; }, 0);
  var out = new Uint8Array(total);
  var pos = 0;
  all.forEach(function (c) { out.set(c, pos); pos += c.length; });
  return out;
}

/** Tutto l'export della selezione → { name, files: [{ name, bytes }] }. */
async function buildExport(api, node) {
  var comp = await exportComponent(api, node);
  var files = [
    { name: comp.name + '.json', bytes: utf8(stringify(comp.data)) },
    { name: 'variables.json', bytes: utf8(stringify(await exportVariables(api))) },
  ];
  for (var i = 0; i < comp.shots.length; i++) {
    var png = await comp.shots[i].node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
    files.push({ name: comp.shots[i].file, bytes: png });
  }
  return { name: comp.name, files: files };
}

// ---------- plugin ----------

if (typeof figma !== 'undefined') {
  figma.showUI(__html__, { width: 360, height: 240 });
  var describe = function () {
    var sel = figma.currentPage.selection;
    figma.ui.postMessage({ type: 'selection', text: sel.length === 1 ? sel[0].type + ' "' + sel[0].name + '"' : sel.length + ' elementi selezionati' });
  };
  figma.on('selectionchange', describe);
  describe();
  figma.ui.onmessage = async function (msg) {
    if (msg.type !== 'export') return;
    try {
      var sel = figma.currentPage.selection;
      if (sel.length !== 1) throw new Error('Seleziona un solo componente o set di varianti.');
      var result = await buildExport(figma, sel[0]);
      var zip = makeZip(result.files);
      figma.ui.postMessage({ type: 'zip', name: 'fx-export-' + result.name + '.zip', bytes: zip, files: result.files.map(function (f) { return f.name; }) });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: String(e && e.message ? e.message : e) });
    }
  };
} else if (typeof exports !== 'undefined') {
  exports.FX_EXPORT_VERSION = FX_EXPORT_VERSION;
  exports.round = round;
  exports.color = color;
  exports.slug = slug;
  exports.propName = propName;
  exports.stringify = stringify;
  exports.exportComponent = exportComponent;
  exports.exportVariables = exportVariables;
  exports.buildExport = buildExport;
  exports.makeZip = makeZip;
  exports.crc32 = crc32;
  exports.utf8 = utf8;
}
