// GENERATO da figma/export/card.json (sha256 6a12a9ec94666f70) con figma:generate 1.0.0: non modificare a mano
import { el } from '../../el.js';
import { Card } from './card.js';

/** Figma: Card (44:10). */
export default {
  title: 'Generati/Card',
  render: (args) => el('div', { style: 'width:342px' }, Card(args)),
  args: {
    showButton: true,
    showImage: true,
    showText: true,
    text: 'Accedi alla nuova area riservata per gestire il tuo account e le tue preferenze.',
    title: 'Scopri le novità',
    buttonHref: '#',
    image: '',
    imageAlt: '',
    buttonLabel: 'Scopri di più',
  },
};

export const Default = { args: {"image":"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23f8fafc'/%3E%3C/svg%3E"} };
export const SenzaImmagine = { name: 'Senza immagine', args: {"showImage":false} };
export const SenzaBottone = { name: 'Senza bottone', args: {"showButton":false} };
