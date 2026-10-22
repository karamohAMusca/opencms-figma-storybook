import { fn } from 'storybook/test';
import { el } from '../../el.js';
import { figmaMeta, figmaVariant } from '../../figma.js';
import { Button } from './button.js';

const figma = figmaMeta('Button');

// Varianti e proprietà (Variant, Label) arrivano da figma/manifest.json; la descrizione docs è quella del componente Figma.
export default {
  title: 'Componenti/Button',
  render: Button,
  parameters: figma.parameters,
  args: { ...figma.args, fullWidth: false, type: 'button', onClick: fn() },
  argTypes: {
    ...figma.argTypes,
    fullWidth: { description: 'Non in Figma: la larghezza piena è usata nella card del Login', table: { category: 'Codice' } },
    href: { control: 'text', description: 'Se presente, il bottone diventa un link', table: { category: 'Codice' } },
    type: { control: 'inline-radio', options: ['button', 'submit'], table: { category: 'Codice' } },
    onClick: { table: { category: 'Codice' } },
  },
};

// ---- Una story per variante Figma ----

export const Primary = figmaVariant('Button', 'Primary');

export const Secondary = figmaVariant('Button', 'Secondary');

// ---- Usi nel codice, non varianti Figma ----

/** Come nella card del Login: larghezza 292px (342 − padding 24×2 − bordo 1×2). */
export const FullWidth = {
  name: 'Full width',
  args: { fullWidth: true },
  render: (args) => el('div', { style: 'width:292px' }, Button(args)),
};

export const AsLink = {
  name: 'Come link',
  args: { variant: 'secondary', label: 'Continua con Google', href: '#' },
};
