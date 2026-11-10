// Carica figma-export/code.js in Node (senza `figma`: esegue solo le definizioni) per riusarne le funzioni pure
// nei comandi e nei test. Una sola implementazione di normalizzazione, CRC e zip, quella del plugin.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const exportDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'figma-export');

// Il contesto contiene solo ciò che serve: niente Date, timer, rete o process. Se code.js li usasse,
// i test fallirebbero (è voluto: l'export non deve dipendere da ora, ambiente o rete).
export function loadPlugin() {
  const exports = {};
  const code = readFileSync(join(exportDir, 'code.js'), 'utf8');
  vm.runInNewContext(code, { exports, Uint8Array, Math, JSON, Object, Array, String, Error, Promise }, { filename: 'code.js' });
  return exports;
}
