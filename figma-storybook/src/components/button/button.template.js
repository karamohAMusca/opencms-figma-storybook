import { h, prop, when, choose, cls, mod } from '../../template.js';

const classes = cls('fx-button', mod('fx-button--', prop('variant')), when(prop('fullWidth'), 'fx-button--full'));

/**
 * Figma: Button (1:22). Proprietà Figma: Variant (Primary | Secondary), Label.
 * Con `href` diventa un link, altrimenti un <button>.
 */
export default {
  name: 'Button',
  figma: '1:22',
  props: {
    label: { default: 'Accedi' },
    variant: { options: ['primary', 'secondary'], default: 'primary' },
    fullWidth: { default: false },
    href: {},
    type: { default: 'button' },
    onClick: {},
  },
  template: choose(prop('href'),
    h('a', { class: classes, href: prop('href'), onClick: prop('onClick') }, prop('label')),
    h('button', { class: classes, type: prop('type'), onClick: prop('onClick') }, prop('label')),
  ),
};
