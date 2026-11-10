// GENERATO da figma/export/button.json (sha256 9be490341256d55d) con figma:generate 1.0.0: non modificare a mano
import { h, prop, when, choose, cls, mod, opt } from '../../template.js';

/** Figma: Button (1:22). */
export default {
  name: 'Button',
  figma: '1:22',
  props: {
    label: { default: 'Accedi' },
    variant: { options: ['primary', 'secondary', 'tertiary'], default: 'primary' },
    href: {},
    type: { default: 'button' },
    fullWidth: { default: false },
    onClick: {},
  },
  template: choose(prop('href'),
    h('a', { class: cls('fx-button', mod('fx-button--', prop('variant')), when(prop('fullWidth'), 'fx-button--full')), href: prop('href'), onClick: opt(prop('onClick')) }, prop('label')),
    h('button', { class: cls('fx-button', mod('fx-button--', prop('variant')), when(prop('fullWidth'), 'fx-button--full')), type: opt(prop('type')), onClick: opt(prop('onClick')) }, prop('label')),
  ),
};
