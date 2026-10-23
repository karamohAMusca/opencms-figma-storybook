import { h, prop, opt } from '../../template.js';

let count = 0;

/**
 * Figma: Input (1:23). Proprietà Figma: Label, Placeholder.
 * type, name, autocomplete e required non esistono in Figma: servono al campo vero.
 */
export default {
  name: 'Input',
  figma: '1:23',
  props: {
    label: { default: 'Email' },
    placeholder: { default: 'nome@esempio.it' },
    type: { default: 'text' },
    name: {},
    id: { default: () => `fx-input-${++count}` },
    autocomplete: {},
    required: { default: false },
  },
  template: h('div', { class: 'fx-input' },
    h('label', { class: 'fx-input__label', for: prop('id') }, prop('label')),
    h('input', {
      class: 'fx-input__field',
      id: prop('id'),
      name: opt(prop('name')),
      type: prop('type'),
      placeholder: opt(prop('placeholder')),
      autocomplete: opt(prop('autocomplete')),
      required: prop('required'),
    }),
  ),
};
