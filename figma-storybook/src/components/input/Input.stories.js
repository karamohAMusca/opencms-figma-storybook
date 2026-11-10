// GENERATO da figma/export/input.json (sha256 7353b69354ee3115) con figma:generate 1.0.0: non modificare a mano
import { el } from '../../el.js';
import { figmaMeta } from '../../figma.js';
import { Input } from './input.js';

const figma = figmaMeta('Input');

// Figma: Input (1:23). Proprietà e varianti da figma/manifest.json, generato dall'export;
// la descrizione in Docs è quella del componente Figma (figmaMeta).
export default {
  title: 'Componenti/Input',
  render: (args) => el('div', { style: 'width:326px' }, Input(args)),
  parameters: figma.parameters,
  args: {
    ...figma.args,
    type: 'text',
    id: '',
    required: false,
  },
  argTypes: {
    ...figma.argTypes,
    type: { table: { category: 'Codice' } },
    id: { table: { category: 'Codice' } },
    required: { table: { category: 'Codice' } },
  },
};

export const Default = {};
export const Password = { name: 'Password', args: {"label":"Password","placeholder":"••••••••","type":"password","name":"password","autocomplete":"current-password"} };
