import { field, image, link } from '../../opencms.js';
import card from './card.template.js';

/** Card in OpenCms: content type fx-card; il bottone annidato è fatto di due campi della card (testo e link). */
export default {
  component: card,
  type: {
    name: 'fx-card',
    niceName: 'Figma – Card',
    title: 'Crea una nuova card',
    description: 'Card con immagine, titolo, testo e bottone dal file Figma.',
    folder: 'fx-card',
    namePattern: 'fx-card_%(number).xml',
    order: 9020,
    titleField: 'Title',
  },
  // Senza contenitore: la radice del template (<article class="fx-card">) è già l'elemento.
  formatter: { jsp: 'formatters/fx-card.jsp', key: 'fx/card' },
  comment: 'Componente Figma "Card" (44:10). Usa il componente Button.',
  bind: {
    image: image('Image', { optional: true, label: 'Immagine' }),
    imageAlt: field('ImageAlt', { optional: true, label: 'Testo alternativo dell\'immagine' }),
    title: field('Title', { label: 'Titolo' }),
    text: field('Text', { optional: true, label: 'Testo' }),
    buttonLabel: field('ButtonText', { optional: true, requires: ['value.ButtonLink.isSet'], label: 'Testo del bottone' }),
    buttonHref: link('ButtonLink', { optional: true, label: 'Link del bottone' }),
  },
};
