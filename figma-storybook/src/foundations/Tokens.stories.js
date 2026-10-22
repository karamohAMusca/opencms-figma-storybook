import { el } from '../el.js';

import tokens from '../../figma/tokens.json';

// Variabili Figma da figma/tokens.json: i colori insieme, il resto per prefisso (space → Spaziature, radius → Raggi)
const titles = { space: 'Spaziature', radius: 'Raggi' };
const groups = { Colori: [], Spaziature: [], Raggi: [] }; // ordine di visualizzazione; altri prefissi in coda
for (const [name, val] of Object.entries(tokens.variables)) {
  const group = val.startsWith('#') ? 'Colori' : titles[name.split('/')[0]] ?? name.split('/')[0];
  (groups[group] ??= []).push([name.replace(/\//g, '-'), val]);
}
// Colori nell'ordine del file, misure dalla più piccola
for (const [group, list] of Object.entries(groups)) {
  if (group !== 'Colori') list.sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]));
  groups[group] = list.map(([name]) => name);
}

const value = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();

const swatch = (name, group) => {
  const sample =
    group === 'Colori' ? `background:var(--${name});width:48px;height:48px;border:1px solid var(--border-default);border-radius:8px`
    : group === 'Spaziature' ? `background:var(--brand-primary);width:var(--${name});height:24px`
    : `width:48px;height:48px;border:2px solid var(--brand-primary);border-radius:var(--${name})`;
  const row = el('div', { style: 'display:flex;align-items:center;gap:16px;padding:8px 0' },
    el('div', { style: `flex:none;${sample}` }),
    el('code', { style: 'font-size:13px;color:var(--text-primary)' }, `--${name}`),
    el('span', { style: 'margin-left:auto;font-size:13px;color:var(--text-secondary)' }),
  );
  // Il valore si legge dopo il montaggio, quando il CSS è applicato
  requestAnimationFrame(() => { row.lastChild.textContent = value(name); });
  return row;
};

/** Variabili Figma esportate in `src/tokens.css` (brand/primary → --brand-primary). */
export default {
  title: 'Fondamenta/Token',
  parameters: { layout: 'padded' },
};

export const Tutti = {
  render: () =>
    el('div', { style: 'font-family:var(--font-family);max-width:480px' },
      Object.entries(groups).filter(([, names]) => names.length).map(([group, names]) => [
        el('h3', { style: 'margin:16px 0 4px;font-size:15px;color:var(--text-primary)' }, group),
        names.map((name) => swatch(name, group)),
      ]),
    ),
};
