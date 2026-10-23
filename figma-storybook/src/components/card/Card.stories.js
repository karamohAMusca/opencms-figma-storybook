import { el } from '../../el.js';
import { figmaMeta } from '../../figma.js';
import { Card } from './card.js';
import placeholder from './placeholder.svg';

const figma = figmaMeta('Card');

// Proprietà (Title, Text, Button label) da figma/manifest.json. In Figma non ci sono varianti.
export default {
  title: 'Componenti/Card',
  // Larghezza del componente in Figma: 342px
  render: (args) => el('div', { style: 'width:342px' }, Card(args)),
  parameters: figma.parameters,
  // L'immagine in Figma è un segnaposto color surface/background: la story usa un SVG dello stesso colore
  args: { ...figma.args, image: placeholder, imageAlt: '', buttonHref: '#' },
  argTypes: {
    ...figma.argTypes,
    image: { control: 'text', description: 'URL dell\'immagine; vuoto = card senza immagine', table: { category: 'Codice' } },
    imageAlt: { control: 'text', table: { category: 'Codice' } },
    buttonHref: { control: 'text', table: { category: 'Codice' } },
  },
};

/** Come in Figma (44:10). */
export const Default = {};

/** Senza immagine: la card parte dal corpo. */
export const SenzaImmagine = { name: 'Senza immagine', args: { image: '' } };

/** Senza bottone. */
export const SenzaBottone = { name: 'Senza bottone', args: { buttonLabel: '' } };
