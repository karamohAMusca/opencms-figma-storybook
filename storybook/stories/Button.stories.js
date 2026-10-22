import { ctaButton, figmaDesign } from './markup.js';

/** Figma: Button (1:22), varianti Primary (1:18) e Secondary (1:20). OpenCms: content type `fx-cta-button`. */
export default {
  title: 'Componenti/Button',
  render: ctaButton,
  args: { text: 'Accedi', link: '#', variant: 'primary', width: 'auto' },
  argTypes: {
    text: { description: 'Campo `Text` del contenuto' },
    link: { description: 'Campo `Link` del contenuto' },
    variant: { control: 'inline-radio', options: ['primary', 'secondary'], description: 'Setting `variant`' },
    width: { control: 'inline-radio', options: ['auto', 'full'], description: 'Setting `width`' },
  },
  parameters: {
    design: figmaDesign('1-22'),
  },
};

export const Primary = {};

export const Secondary = { args: { variant: 'secondary' } };

export const FullWidth = {
  name: 'Full width',
  args: { width: 'full' },
  parameters: { layout: 'padded' },
};
