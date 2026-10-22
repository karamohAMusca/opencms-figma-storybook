// Verifica che le story coprano figma/manifest.json: per ogni componente e schermata
// un file .stories.js nella cartella "code" che usi figma.js, e un export per ogni variante.
// Uso: npm run check:figma   (esce con 1 se manca qualcosa)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'figma', 'manifest.json'), 'utf8'));
const errors = [];

for (const node of [...manifest.components, ...manifest.screens]) {
  const dir = join(root, node.code);
  const file = existsSync(dir) && readdirSync(dir).find((f) => f.endsWith('.stories.js'));
  if (!file) {
    errors.push(`${node.name} (${node.nodeId}): nessun file .stories.js in ${node.code}`);
    continue;
  }
  const src = readFileSync(join(dir, file), 'utf8');
  if (!src.includes(`figmaMeta('${node.name}')`)) errors.push(`${node.name}: ${file} non usa figmaMeta('${node.name}')`);
  if (!src.includes(`title: '${node.stories}'`)) errors.push(`${node.name}: ${file} non ha title '${node.stories}'`);
  for (const v of node.variants ?? []) {
    if (!new RegExp(`export const ${v.story}\\s*=\\s*figmaVariant\\('${node.name}', '${v.story}'\\)`).test(src))
      errors.push(`${node.name}: manca "export const ${v.story} = figmaVariant('${node.name}', '${v.story}')" (${v.name}, ${v.nodeId})`);
  }
}

if (errors.length) {
  console.error(`Story non allineate al manifest:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`ok: ${manifest.components.length} componenti e ${manifest.screens.length} schermate coperti`);
