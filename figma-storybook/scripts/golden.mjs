// Impronta dei file generati (fase F0 di piano-design-system/): l'ancora contro le regressioni.
// Confronta lo SHA-256 di ogni file del modulo it.progetti.figma (tranne README.md) e di src/tokens.css
// con quello salvato in golden.json. Testi confrontati con fine riga LF, così il checkout su Windows non conta.
// Uso: npm run golden                (esce con 1 se un file è cambiato, mancante o nuovo)
//      npm run golden -- --update    (riscrive golden.json: solo nelle fasi che cambiano l'output, scrivendo il motivo nelle note della fase)
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..');
const goldenPath = join(root, 'golden.json');
const update = process.argv.includes('--update');

const BINARY = new Set(['.woff2', '.woff', '.ttf', '.png', '.jpg', '.gif', '.svg', '.zip']);
const SKIP = new Set(['README.md']);

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return SKIP.has(name) && dir.endsWith('it.progetti.figma') ? [] : [path];
  });

const files = [...walk(join(repo, 'it.progetti.figma')), join(root, 'src', 'tokens.css')];

const hash = (path) => {
  const raw = readFileSync(path);
  const data = BINARY.has(extname(path).toLowerCase()) ? raw : Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  return createHash('sha256').update(data).digest('hex');
};

const current = Object.fromEntries(
  files.map((path) => [relative(repo, path).replace(/\\/g, '/'), hash(path)]).sort(([a], [b]) => a.localeCompare(b)),
);

if (update) {
  writeFileSync(goldenPath, JSON.stringify({ $comment: 'Generato da npm run golden -- --update: non modificare a mano.', files: current }, null, 2) + '\n');
  console.log(`golden.json aggiornato: ${Object.keys(current).length} file`);
  process.exit(0);
}

if (!existsSync(goldenPath)) {
  console.error('golden.json assente: lancia npm run golden -- --update');
  process.exit(1);
}
const saved = JSON.parse(readFileSync(goldenPath, 'utf8')).files;

const problems = [];
for (const [name, h] of Object.entries(saved)) {
  if (!(name in current)) problems.push(`${name}  MANCANTE`);
  else if (current[name] !== h) problems.push(`${name}  CAMBIATO`);
}
for (const name of Object.keys(current)) if (!(name in saved)) problems.push(`${name}  NUOVO`);

if (problems.length) {
  problems.forEach((p) => console.error(p));
  console.error(`\n${problems.length} differenze dall'impronta. Se il cambiamento è voluto: npm run golden -- --update (e annota il motivo nella fase).`);
  process.exit(1);
}
console.log(`ok: ${Object.keys(saved).length} file identici all'impronta`);
