import { input, figmaDesign } from './markup.js';

/** Figma: Input (1:23). OpenCms: include `elements/fx-input.jsp` (non è un contenuto). */
export default {
  title: 'Componenti/Input',
  render: input,
  args: { id: 'sb-email', name: 'email', type: 'email', label: 'Email', placeholder: 'nome@esempio.it', autocomplete: 'email' },
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'tel', 'url', 'search'] },
  },
  parameters: {
    layout: 'padded',
    design: figmaDesign('1-23'),
  },
};

export const Email = {};

export const Password = {
  args: { id: 'sb-password', name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', autocomplete: 'current-password' },
};
