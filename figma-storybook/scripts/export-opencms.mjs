// Esporta i componenti di Storybook nel modulo OpenCms it.progetti.figma: Storybook è la fonte, i file del modulo sono generati.
// Oggi: resources/css/components.css, unione dei CSS dei componenti e delle schermate, nell'ordine di figma/manifest.json.
// Uso: npm run export:opencms               (scrive i file)
//      npm run export:opencms -- --check    (esce con 1 se il modulo non è allineato a Storybook)
// Dopo l'export, dev.py (se è in ascolto) porta i file cambiati in OpenCms.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const moduleDir = join(root, '..', 'it.progetti.figma');
const manifest = JSON.parse(readFileSync(join(root, 'figma', 'manifest.json'), 'utf8'));
const check = process.argv.includes('--check');

const posix = (path) => path.split('\\').join('/');

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

const targets = [{ path: join(moduleDir, 'resources', 'css', 'components.css'), content: componentsCss() }];

let stale = 0;
for (const { path, content } of targets) {
  const name = posix(relative(join(root, '..'), path));
  const current = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : null;
  if (current === content) {
    console.log(`${name}  già allineato`);
  } else if (check) {
    console.error(`${name}  NON allineato: lancia npm run export:opencms in figma-storybook`);
    stale++;
  } else {
    writeFileSync(path, content);
    console.log(`${name}  aggiornato`);
  }
}
if (stale) process.exit(1);
