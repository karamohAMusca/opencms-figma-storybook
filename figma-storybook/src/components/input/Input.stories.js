import { el } from '../../el.js';
import { figmaMeta } from '../../figma.js';
import { Input } from './input.js';

const figma = figmaMeta('Input');

// Proprietà (Label, Placeholder) da figma/manifest.json. In Figma non ci sono varianti.
export default {
  title: 'Componenti/Input',
  // Larghezza del componente in Figma: 326px
  render: (args) => el('div', { style: 'width:326px' }, Input(args)),
  parameters: figma.parameters,
  args: { ...figma.args, type: 'email', name: 'email', autocomplete: 'email', required: false },
  argTypes: {
    ...figma.argTypes,
    type: { control: 'select', options: ['text', 'email', 'password', 'tel', 'url', 'search'], table: { category: 'Codice' } },
    name: { table: { category: 'Codice' } },
    autocomplete: { table: { category: 'Codice' } },
    required: { table: { category: 'Codice' } },
    id: { control: false, table: { category: 'Codice' } },
  },
};

/** Default del componente Figma; è anche la prima istanza nel Login (1:34). */
export const Email = {};

/** Valori dell'istanza Password nel Login (1:38). */
export const Password = {
  args: { label: 'Password', placeholder: '••••••••', type: 'password', name: 'password', autocomplete: 'current-password' },
};
