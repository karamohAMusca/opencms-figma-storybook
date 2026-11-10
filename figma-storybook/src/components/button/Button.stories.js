// GENERATO da figma/export/button.json (sha256 9be490341256d55d) con figma:generate 1.0.0: non modificare a mano
import { el } from '../../el.js';
import { figmaMeta, figmaVariant } from '../../figma.js';
import { Button } from './button.js';

const figma = figmaMeta('Button');

// Figma: Button (1:22). Proprietà e varianti da figma/manifest.json, generato dall'export;
// la descrizione in Docs è quella del componente Figma (figmaMeta).
export default {
  title: 'Componenti/Button',
  render: (args) => Button(args),
  parameters: figma.parameters,
  args: {
    ...figma.args,
    type: 'button',
    fullWidth: false,
  },
  argTypes: {
    ...figma.argTypes,
    type: { table: { category: 'Codice' } },
    fullWidth: { table: { category: 'Codice' } },
  },
};

export const Primary = figmaVariant('Button', 'Primary');
export const Secondary = figmaVariant('Button', 'Secondary');
export const Tertiary = figmaVariant('Button', 'Tertiary');
export const FullWidth = { name: 'Full width', args: {"fullWidth":true}, render: (args) => el('div', { style: 'width:292px' }, Button(args)) };
export const AsLink = { name: 'Come link', args: {"variant":"secondary","label":"Continua con Google","href":"#"} };
