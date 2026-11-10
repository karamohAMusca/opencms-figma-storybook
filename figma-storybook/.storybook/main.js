/** @type { import('@storybook/html-vite').StorybookConfig } */
export default {
  framework: '@storybook/html-vite',
  addons: ['@storybook/addon-docs', '@storybook/addon-designs'],
  stories: ['../src/**/*.stories.js'],
  // Nessun dato d'uso inviato a Storybook (piano-design-system/GENERATORE.md, requisiti per dati sensibili)
  core: { disableTelemetry: true },
  // Screenshot Figma salvati (figma/screenshots/), mostrati nella scheda Design accanto all'embed live
  staticDirs: [{ from: '../figma/screenshots', to: '/figma-screenshots' }],
  // .env sta nella root del repo; esporre solo le variabili FIGMA_* oltre a VITE_/STORYBOOK_
  viteFinal: (config) => ({ ...config, envDir: '..', envPrefix: ['VITE_', 'STORYBOOK_', 'FIGMA_'] }),
};
