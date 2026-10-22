// Carica i collegamenti OpenCms dei componenti (*.opencms.js) nell'ordine di figma/manifest.json.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const posix = (path) => path.split('\\').join('/');

export async function loadOpencms(root) {
  const manifest = JSON.parse(readFileSync(join(root, 'figma', 'manifest.json'), 'utf8'));
  const defs = [];
  for (const node of [...manifest.components, ...manifest.screens]) {
    const dir = join(root, node.code);
    for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.opencms.js')).sort() : []) {
      const def = (await import(pathToFileURL(join(dir, f)).href)).default;
      const template = f.replace('.opencms.js', '.template.js');
      defs.push({
        ...def,
        source: `figma-storybook/${posix(relative(root, join(dir, template)))}`,
        opencmsSource: `figma-storybook/${posix(relative(root, join(dir, f)))}`,
      });
    }
  }
  // componente → collegamenti, per sapere quali componenti usati da altri hanno un proprio JSP
  const registry = new Map(defs.map((d) => [d.component, d]));
  return { manifest, defs, registry };
}
