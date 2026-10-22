import { h, prop, when, use } from '../../template.js';
import button from '../button/button.template.js';

/**
 * Figma: Card (44:10). Proprietà Figma: Title, Text; il Button Primary annidato è un'istanza esposta (Label → buttonLabel).
 * L'immagine in Figma è un segnaposto: qui è un <img> facoltativo, senza immagine la card parte dal corpo.
 * Senza buttonLabel il bottone non c'è.
 */
export default {
  name: 'Card',
  figma: '44:10',
  props: {
    image: { default: '' },
    imageAlt: { default: '' },
    title: { default: 'Scopri le novità' },
    text: { default: 'Accedi alla nuova area riservata per gestire il tuo account e le tue preferenze.' },
    buttonLabel: { default: 'Scopri di più' },
    buttonHref: { default: '#' },
  },
  template: h('article', { class: 'fx-card' },
    when(prop('image'), h('img', { class: 'fx-card__image', src: prop('image'), alt: prop('imageAlt') })),
    h('div', { class: 'fx-card__body' },
      h('div', { class: 'fx-card__texts' },
        h('h3', { class: 'fx-card__title' }, prop('title')),
        when(prop('text'), h('p', { class: 'fx-card__text' }, prop('text'))),
      ),
      when(prop('buttonLabel'), use(button, { label: prop('buttonLabel'), variant: 'primary', href: prop('buttonHref') })),
    ),
  ),
};
