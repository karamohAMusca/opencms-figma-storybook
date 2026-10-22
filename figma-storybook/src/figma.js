import manifest from '../figma/manifest.json';

/**
 * Legge figma/manifest.json e ne ricava i pezzi delle story, così varianti e proprietà arrivano dal Figma
 * e non sono riscritte a mano. Convenzioni: proprietà Figma "Label" → arg `label`, opzione "Primary" → 'primary'.
 *
 * I nomi delle story restano export statici nei file .stories.js (Storybook li legge senza eseguire il codice);
 * `npm run check:figma` verifica che ci sia una story per ogni variante del manifest.
 */

const nodes = [...manifest.components, ...manifest.screens];

function node(name) {
  const found = nodes.find((n) => n.name === name);
  if (!found) throw new Error(`"${name}" non è in figma/manifest.json`);
  return found;
}

const argName = (prop) => prop.charAt(0).toLowerCase() + prop.slice(1).replace(/\s+(\w)/g, (_, c) => c.toUpperCase());
const optionValue = (option) => option.toLowerCase();

// La chiave del file sta in .env (FIGMA_FILE_KEY), non nel repo; senza, restano gli screenshot salvati.
const fileKey = import.meta.env.FIGMA_FILE_KEY;
export const figmaUrl = (nodeId) =>
  fileKey ? `https://www.figma.com/design/${fileKey}/?node-id=${nodeId.replace(':', '-')}` : null;

/**
 * Parametro `design` di @storybook/addon-designs: embed Figma live del nodo (serve essere loggati a Figma
 * con accesso al file) e, se c'è, lo screenshot salvato, che si vede anche offline.
 */
function design(nodeId, screenshot, label) {
  const tabs = figmaUrl(nodeId) ? [{ name: `Figma ${label}`, type: 'figma', url: figmaUrl(nodeId) }] : [];
  if (screenshot) {
    tabs.push({ name: 'Screenshot', type: 'image', url: `./figma-screenshots/${screenshot.replace(/^screenshots\//, '')}`, scale: 1 });
  }
  return tabs;
}

/** args, argTypes e descrizione della meta di un componente o di una schermata del manifest. */
export function figmaMeta(name) {
  const n = node(name);
  const args = {};
  const argTypes = {};
  for (const [prop, def] of Object.entries(n.properties ?? {})) {
    const arg = argName(prop);
    const variant = def.type === 'VARIANT';
    args[arg] = variant ? optionValue(def.default) : def.default;
    argTypes[arg] = {
      description: `Proprietà Figma "${prop}"`,
      table: { category: 'Figma' },
      ...(variant ? { control: 'inline-radio', options: def.options.map(optionValue) } : { control: 'text' }),
    };
  }
  const [w, h] = n.size;
  const description = [n.description, `Figma: ${n.name} (${n.nodeId}), ${w}×${h}.`].filter(Boolean).join('\n\n');
  return {
    args,
    argTypes,
    parameters: { docs: { description: { component: description } }, design: design(n.nodeId, n.screenshot, n.nodeId) },
  };
}

/** Story di una variante Figma: `figmaVariant('Button', 'Primary')` → args { variant: 'primary' }. */
export function figmaVariant(name, story) {
  const n = node(name);
  const v = n.variants.find((x) => x.story === story);
  if (!v) throw new Error(`${name}: nessuna variante con story "${story}" nel manifest`);
  // "Variant=Primary, Size=Large" → { variant: 'primary', size: 'large' }
  const args = Object.fromEntries(
    v.name.split(',').map((pair) => pair.split('=').map((s) => s.trim())).map(([k, val]) => [argName(k), optionValue(val)]),
  );
  const [w, h] = v.size;
  return {
    args,
    parameters: {
      docs: { description: { story: `Figma: ${v.name} (${v.nodeId}), ${w}×${h}.` } },
      // Embed della singola variante; lo screenshot è quello del component set (contiene tutte le varianti)
      design: design(v.nodeId, n.screenshot, v.nodeId),
    },
  };
}
