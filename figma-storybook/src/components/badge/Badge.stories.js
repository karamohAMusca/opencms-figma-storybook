// GENERATO da figma/export/badge.json (sha256 3bae6ae5b4dac06c) con figma:generate 1.0.0: non modificare a mano
import { figmaMeta, figmaVariant } from '../../figma.js';
import { Badge } from './badge.js';

const figma = figmaMeta('Badge');

// Figma: Badge (51:19). Proprietà e varianti da figma/manifest.json, generato dall'export;
// la descrizione in Docs è quella del componente Figma (figmaMeta).
export default {
  title: 'Componenti/Badge',
  render: (args) => Badge(args),
  parameters: figma.parameters,
  args: {
    ...figma.args,
  },
  argTypes: {
    ...figma.argTypes,
  },
};

export const Brand = figmaVariant('Badge', 'Brand');
export const Neutral = figmaVariant('Badge', 'Neutral');
