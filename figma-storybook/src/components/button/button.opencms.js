import { field, link, setting, settingIs } from '../../opencms.js';
import button from './button.template.js';

/** Button in OpenCms: content type fx-cta-button (un testo e un link), variante e larghezza come impostazioni dell'elemento. */
export default {
  component: button,
  formatter: { jsp: 'formatters/fx-cta-button.jsp', wrapper: 'fx-cta-button' },
  comment: 'Componente Figma "Button" (1:22). Settings: variant (primary|secondary), width (auto|full)',
  bind: {
    label: field('Text'),
    href: link('Link'),
    variant: setting('variant', ['primary', 'secondary'], 'primary'),
    fullWidth: settingIs('width', 'full'),
  },
};
