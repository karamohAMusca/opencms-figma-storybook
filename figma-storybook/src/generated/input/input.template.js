// GENERATO da figma/export/input.json (sha256 7353b69354ee3115) con figma:generate 1.0.0: non modificare a mano
import { h, prop, opt } from '../../template.js';

/** Figma: Input (1:23). */
export default {
  name: 'Input',
  figma: '1:23',
  props: {
    label: { default: 'Email' },
    placeholder: { default: 'nome@esempio.it' },
    type: { default: 'text' },
    name: {},
    id: { default: '' },
    autocomplete: {},
    required: { default: false },
  },
  template: h('div', { class: 'fx-input' },
    h('label', { class: 'fx-input__label', for: opt(prop('id')) }, prop('label')),
    h('input', { class: 'fx-input__field', placeholder: opt(prop('placeholder')), type: opt(prop('type')), name: opt(prop('name')), autocomplete: opt(prop('autocomplete')), required: prop('required'), id: opt(prop('id')) }),
  ),
};
