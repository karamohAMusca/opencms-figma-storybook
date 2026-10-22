import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

// Nome in alto a sinistra: distingue questo Storybook da quello in figma-storybook/
addons.setConfig({
  theme: create({ base: 'light', brandTitle: 'OpenCms · modulo fx-', colorSecondary: '#4f46e5' }),
});
