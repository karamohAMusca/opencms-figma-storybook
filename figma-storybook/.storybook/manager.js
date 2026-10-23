import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

// Nome in alto a sinistra
addons.setConfig({
  theme: create({ base: 'dark', brandTitle: 'Solo Figma · fx-', colorSecondary: '#4f46e5' }),
});
