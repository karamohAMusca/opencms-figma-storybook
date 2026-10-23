import { param } from '../../opencms.js';
import input from './input.template.js';

/** Input in OpenCms: non è un contenuto, è un elemento incluso con <cms:include> e parametri (lo usa il Login). */
export default {
  component: input,
  element: { jsp: 'elements/fx-input.jsp' },
  comment: 'Componente Figma "Input" (1:23). Parametri: id, name, type, label, placeholder, autocomplete',
  bind: {
    id: param('id'),
    name: param('name'),
    type: param('type', { default: 'text' }),
    label: param('label'),
    placeholder: param('placeholder'),
    autocomplete: param('autocomplete'),
    required: true,
  },
};
