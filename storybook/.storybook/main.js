/** @type { import('@storybook/html-vite').StorybookConfig } */
export default {
  framework: '@storybook/html-vite',
  addons: ['@storybook/addon-docs'],
  stories: ['../stories/**/*.stories.js'],
  // .env sta nella root del repo; esporre solo le variabili FIGMA_* oltre a VITE_/STORYBOOK_
  viteFinal: (config) => ({ ...config, envDir: '..', envPrefix: ['VITE_', 'STORYBOOK_', 'FIGMA_'] }),
};
