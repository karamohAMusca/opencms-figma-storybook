// Importa lo zip prodotto dal plugin fx-export in figma/export/ (piano-design-system/GENERATORE.md, G1).
// Uso: npm run figma:import -- <percorso dello zip>
// Controlla: formato zip "store" del plugin, CRC di ogni file, nomi ammessi (niente cartelle né percorsi),
// JSON conformi a figma-export/schema.json e scritti in forma canonica. Nessuna rete, nessuna dipendenza.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlugin } from './plugin.mjs';
import { validate } from './schema.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const outDir = join(root, 'figma', 'export');
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)?\.(json|png)$/;

/** Legge uno zip "store" (come quelli di makeZip) → [{ name, bytes }]. */
export function readZip(buf, crc32) {
  const files = [];
  let pos = 0;
  while (pos + 4 <= buf.length && buf.readUInt32LE(pos) === 0x04034b50) {
    const method = buf.readUInt16LE(pos + 8);
    const crc = buf.readUInt32LE(pos + 14);
    const size = buf.readUInt32LE(pos + 18);
    const nameLen = buf.readUInt16LE(pos + 26);
    const extraLen = buf.readUInt16LE(pos + 28);
    const name = buf.subarray(pos + 30, pos + 30 + nameLen).toString('utf8');
    const start = pos + 30 + nameLen + extraLen;
    if (method !== 0) throw new Error(`${name}: compressione non ammessa (lo zip deve venire da fx-export)`);
    const bytes = buf.subarray(start, start + size);
    if (crc32(bytes) !== crc) throw new Error(`${name}: CRC errato, zip danneggiato`);
    files.push({ name, bytes: Buffer.from(bytes) });
    pos = start + size;
  }
  if (files.length === 0) throw new Error('nessun file nello zip');
  return files;
}

/** Controlla i file e li scrive in `dir`. Restituisce i nomi scritti. */
export function importFiles(files, dir, plugin) {
  for (const f of files) {
    if (!NAME.test(f.name)) throw new Error(`${f.name}: nome non ammesso`);
    if (f.name.endsWith('.json')) {
      const data = JSON.parse(f.bytes.toString('utf8'));
      const errors = validate(data, f.name === 'variables.json' ? 'variables' : 'component');
      if (errors.length) throw new Error(`${f.name} non rispetta lo schema:\n  ${errors.slice(0, 10).join('\n  ')}`);
      if (plugin.stringify(data) !== f.bytes.toString('utf8')) throw new Error(`${f.name}: non è in forma canonica`);
    }
  }
  mkdirSync(dir, { recursive: true });
  for (const f of files) writeFileSync(join(dir, f.name), f.bytes);
  return files.map((f) => f.name);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const zip = process.argv[2];
  if (!zip || !existsSync(zip)) {
    console.error('Uso: npm run figma:import -- <percorso dello zip esportato da fx-export>');
    process.exit(1);
  }
  try {
    const plugin = loadPlugin();
    const names = importFiles(readZip(readFileSync(zip), plugin.crc32), outDir, plugin);
    for (const n of names) console.log(`figma/export/${n}`);
    console.log(`${names.length} file importati`);
  } catch (e) {
    console.error(`ERRORE: ${e.message}`);
    process.exit(1);
  }
}
