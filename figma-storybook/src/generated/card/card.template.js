// GENERATO da figma/export/card.json (sha256 6a12a9ec94666f70) con figma:generate 1.0.0: non modificare a mano
import { h, prop, when, use } from '../../template.js';
import button from '../button/button.template.js';

/** Figma: Card (44:10). */
export default {
  name: 'Card',
  figma: '44:10',
  props: {
    showButton: { default: true },
    showImage: { default: true },
    showText: { default: true },
    text: { default: 'Accedi alla nuova area riservata per gestire il tuo account e le tue preferenze.' },
    title: { default: 'Scopri le novità' },
    buttonHref: { default: '#' },
    image: { default: '' },
    imageAlt: { default: '' },
    buttonLabel: { default: 'Scopri di più' },
  },
  template: h('article', { class: 'fx-card' },
    when(prop('showImage'), when(prop('image'), h('img', { class: 'fx-card__image', src: prop('image'), alt: prop('imageAlt') }))),
    h('div', { class: 'fx-card__body' },
      h('div', { class: 'fx-card__texts' },
        h('h3', { class: 'fx-card__title' }, prop('title')),
        when(prop('showText'), when(prop('text'), h('p', { class: 'fx-card__text' }, prop('text')))),
      ),
      when(prop('showButton'), when(prop('buttonLabel'), use(button, { label: prop('buttonLabel'), variant: 'primary', href: prop('buttonHref') }))),
    ),
  ),
};
