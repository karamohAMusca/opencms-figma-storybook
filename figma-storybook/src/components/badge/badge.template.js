// GENERATO da figma/export/badge.json (sha256 3bae6ae5b4dac06c) con figma:generate 1.0.0: non modificare a mano
import { h, prop, cls, mod } from '../../template.js';

/** Figma: Badge (51:19). */
export default {
  name: 'Badge',
  figma: '51:19',
  props: {
    label: { default: 'Nuovo' },
    variant: { options: ['brand', 'neutral'], default: 'brand' },
  },
  template: h('span', { class: cls('fx-badge', mod('fx-badge--', prop('variant'))) }, prop('label')),
};
