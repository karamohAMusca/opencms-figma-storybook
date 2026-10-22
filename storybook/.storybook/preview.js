// Stessi file CSS caricati da OpenCms: nessuno stile duplicato in Storybook.
import '../../it.progetti.figma/resources/css/tokens.css';
import '../../it.progetti.figma/resources/css/components.css';

/** @type { import('@storybook/html-vite').Preview } */
export default {
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      options: {
        background: { name: 'surface/background', value: '#f8fafc' },
        card: { name: 'surface/card', value: '#ffffff' },
      },
    },
    // Mobile first: si parte da 375px, il desktop viene dopo.
    viewport: {
      options: {
        mobile: { name: 'Mobile 375', styles: { width: '375px', height: '812px' }, type: 'mobile' },
        figma: { name: 'Figma 390 (Login – Mobile)', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
        desktop: { name: 'Desktop 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
      },
    },
  },
  initialGlobals: {
    viewport: { value: 'mobile', isRotated: false },
    backgrounds: { value: 'background' },
  },
};
