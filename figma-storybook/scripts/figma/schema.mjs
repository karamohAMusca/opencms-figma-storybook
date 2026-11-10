// Validatore minimo per figma-export/schema.json, senza dipendenze (requisito: nessuna libreria esterna).
// Supporta solo ciò che lo schema usa: type, enum, const, properties, required, additionalProperties,
// items, anyOf, $ref (#/$defs/…). Restituisce l'elenco degli errori con il percorso nel JSON.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const SCHEMA = JSON.parse(readFileSync(join(here, '..', '..', 'figma-export', 'schema.json'), 'utf8'));

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

function check(value, schema, path, root, errors) {
  if (schema.$ref) {
    const name = schema.$ref.replace('#/$defs/', '');
    return check(value, root.$defs[name], path, root, errors);
  }
  if (schema.anyOf) {
    const ok = schema.anyOf.some((s) => check(value, s, path, root, []).length === 0);
    if (!ok) errors.push(`${path}: nessuna delle forme ammesse`);
    return errors;
  }
  if ('const' in schema && value !== schema.const) errors.push(`${path}: atteso ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: ${JSON.stringify(value)} non è tra ${schema.enum.join(', ')}`);
  if (schema.type) {
    const types = [].concat(schema.type);
    const t = typeOf(value);
    if (!types.includes(t)) {
      errors.push(`${path}: tipo ${t}, atteso ${types.join(' o ')}`);
      return errors;
    }
  }
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${path}: manca "${key}"`);
    for (const [key, v] of Object.entries(value)) {
      if (schema.properties && key in schema.properties) check(v, schema.properties[key], `${path}.${key}`, root, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}: campo non ammesso "${key}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') check(v, schema.additionalProperties, `${path}.${key}`, root, errors);
    }
  }
  if (typeOf(value) === 'array' && schema.items) value.forEach((v, i) => check(v, schema.items, `${path}[${i}]`, root, errors));
  return errors;
}

/** kind: 'component' | 'variables'. */
export function validate(data, kind) {
  return check(data, SCHEMA[kind], kind, SCHEMA, []);
}
