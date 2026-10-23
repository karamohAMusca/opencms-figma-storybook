// Esporta i componenti di Storybook nel modulo OpenCms it.progetti.figma: Storybook è la fonte, i file del modulo sono generati.
// Oggi genera:
// - resources/css/components.css: unione dei CSS dei componenti e delle schermate, nell'ordine di figma/manifest.json;
// - i JSP dei componenti con un *.opencms.js (formatter ed elementi), tradotti dai loro *.template.js;
// - per i componenti con un content type: schema .xsd, .formatter, etichette, .config e configurazione master del sito.
// Uso: npm run export:opencms               (scrive i file)
//      npm run export:opencms -- --check    (esce con 1 se il modulo non è allineato a Storybook)
// Dopo l'export, dev.py (se è in ascolto) porta i file cambiati in OpenCms.
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileJsp } from './opencms/jsp.mjs';
import { loadOpencms, posix } from './opencms/load.mjs';
import { schemaXsd, formatterXml, messages, moduleConfig, masterConfig } from './opencms/xml.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const moduleDir = join(root, '..', 'it.progetti.figma');
const check = process.argv.includes('--check');
const { manifest, defs, registry } = await loadOpencms(root);

/** CSS dei nodi del manifest (prima i componenti, poi le schermate), ognuno preceduto dal file da cui viene. */
function componentsCss() {
  const parts = [];
  for (const node of [...manifest.components, ...manifest.screens]) {
    const dir = join(root, node.code);
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.css')).sort() : [];
    if (!files.length) throw new Error(`${node.name} (${node.nodeId}): nessun CSS in ${node.code}`);
    for (const f of files) {
      const css = readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n').trim();
      parts.push(`/* ---------- ${posix(relative(root, join(dir, f)))} ---------- */\n\n${css}`);
    }
  }
  return [
    '/*',
    ' * GENERATO da figma-storybook/scripts/export-opencms.mjs: non modificare a mano, cambia i CSS in figma-storybook/src/.',
    ' * Richiede tokens.css. Classi con prefisso fx- per non collidere con Mercury. Mobile first.',
    ' */',
    '',
    parts.join('\n\n'),
    '',
  ].join('\n');
}

/**
 * Font: gli stessi file che Storybook importa da @fontsource in src/index.css, sottoinsiemi latin e latin-ext in woff2,
 * copiati in resources/fonts/ con la licenza, e un fonts.css con i loro @font-face (dev.py lo registra come plugin).
 */
function fonts() {
  const imports = [...readFileSync(join(root, 'src', 'index.css'), 'utf8').matchAll(/@import\s+"(@fontsource\/[^"]+\.css)"/g)].map((m) => m[1]);
  const faces = [];
  const files = new Map();
  for (const imp of imports) {
    const css = readFileSync(join(root, 'node_modules', imp), 'utf8');
    const dir = join(root, 'node_modules', dirname(imp));
    for (const [, name, block] of css.matchAll(/\/\* ([\w-]+-latin(?:-ext)?-\d+-\w+) \*\/\s*(@font-face \{[^}]*\})/g)) {
      files.set(`${name}.woff2`, readFileSync(join(dir, 'files', `${name}.woff2`)));
      faces.push(`/* ${name} */\n${block.replace(/src: [^;]+;/, `src: url(../fonts/${name}.woff2) format('woff2');`)}`);
    }
    // Testo, non binario: Git su Windows (autocrlf) può riscriverlo con CRLF, e il confronto deve ignorare i fine riga
    const license = readFileSync(join(dir, 'LICENSE'), 'utf8').replace(/\r\n/g, '\n');
    files.set(`LICENSE-${imp.split('/')[1]}.txt`, license);
  }
  const css = [
    '/*',
    ' * GENERATO da figma-storybook/scripts/export-opencms.mjs: non modificare a mano.',
    ` * Font usati da Storybook (${imports.join(', ')}): sottoinsiemi latin e latin-ext, file e licenze in ../fonts/.`,
    ' */',
    '',
    faces.join('\n\n'),
    '',
  ].join('\n');
  return [
    { path: join(moduleDir, 'resources', 'css', 'fonts.css'), content: css },
    ...[...files].map(([name, data]) => ({ path: join(moduleDir, 'resources', 'fonts', name), content: data })),
  ];
}

const typed = defs.filter((def) => def.type);
const masterPath = join(moduleDir, 'configuration', 'figma.master.additions.xml');
const pluginFiles = readdirSync(join(moduleDir, 'plugins')).filter((f) => f.endsWith('.xml')).sort();

const targets = [
  { path: join(moduleDir, 'resources', 'css', 'components.css'), content: componentsCss() },
  ...fonts(),
  ...defs.map((def) => ({
    path: join(moduleDir, (def.formatter ?? def.element).jsp),
    content: compileJsp(def, registry),
  })),
  ...typed.flatMap((def) => [
    { path: join(moduleDir, 'schemas', `${def.type.name}.xsd`), content: schemaXsd(def) },
    { path: join(moduleDir, def.formatter.jsp.replace(/\.jsp$/, '.formatter')), content: formatterXml(def) },
  ]),
  ...['it', 'en'].map((lang) => ({ path: join(moduleDir, 'i18n', `it.progetti.figma.messages_${lang}`), content: messages(defs) })),
  { path: join(moduleDir, '.config'), content: moduleConfig(defs) },
  { path: masterPath, content: masterConfig(defs, existsSync(masterPath) ? readFileSync(masterPath, 'utf8') : null, pluginFiles) },
];

let stale = 0;
for (const { path, content } of targets) {
  const name = posix(relative(join(root, '..'), path));
  const binary = Buffer.isBuffer(content);
  const current = !existsSync(path) ? null : binary ? readFileSync(path) : readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  if (binary ? current?.equals(content) : current === content) {
    console.log(`${name}  già allineato`);
  } else if (check) {
    console.error(`${name}  NON allineato: lancia npm run export:opencms in figma-storybook`);
    stale++;
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    console.log(`${name}  aggiornato`);
  }
}
if (stale) process.exit(1);
