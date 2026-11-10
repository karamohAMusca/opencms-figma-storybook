// GENERATO da figma/export/card.json (sha256 6a12a9ec94666f70) con figma:generate 1.0.0: non modificare a mano
import { el } from '../../el.js';
import { figmaMeta } from '../../figma.js';
import { Card } from './card.js';

const figma = figmaMeta('Card');

// Figma: Card (44:10). Proprietà e varianti da figma/manifest.json, generato dall'export;
// la descrizione in Docs è quella del componente Figma (figmaMeta).
export default {
  title: 'Componenti/Card',
  render: (args) => el('div', { style: 'width:342px' }, Card(args)),
  parameters: figma.parameters,
  args: {
    ...figma.args,
    buttonHref: '#',
    image: '',
    imageAlt: '',
    buttonLabel: 'Scopri di più',
  },
  argTypes: {
    ...figma.argTypes,
    buttonHref: { table: { category: 'Codice' } },
    image: { table: { category: 'Codice' } },
    imageAlt: { table: { category: 'Codice' } },
    buttonLabel: { table: { category: 'Codice' } },
  },
};

export const Default = { args: {"image":"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23f8fafc'/%3E%3C/svg%3E"} };
export const SenzaImmagine = { name: 'Senza immagine', args: {"showImage":false} };
export const SenzaBottone = { name: 'Senza bottone', args: {"showButton":false} };
