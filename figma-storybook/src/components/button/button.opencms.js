import { field, link, setting, settingIs, optionsOf } from '../../opencms.js';
import button from './button.template.js';

/** Button in OpenCms: content type fx-cta-button (un testo e un link), variante e larghezza come impostazioni dell'elemento. */
export default {
  component: button,
  type: {
    name: 'fx-cta-button',
    niceName: 'Figma – Bottone',
    title: 'Crea un nuovo bottone',
    description: 'Bottone Primary o Secondary dal file Figma.',
    folder: 'fx-cta-button',
    namePattern: 'fx-button_%(number).xml',
    order: 9000,
    titleField: 'Text',
  },
  formatter: { jsp: 'formatters/fx-cta-button.jsp', key: 'fx/cta-button', wrapper: 'fx-cta-button' },
  comment: `Componente Figma "Button" (1:22). Settings: variant (${button.props.variant.options.join('|')}), width (auto|full)`,
  bind: {
    label: field('Text', { label: 'Testo' }),
    href: link('Link', { label: 'Link' }),
    variant: setting('variant', { label: 'Variante', options: optionsOf(button, 'variant'), default: button.props.variant.default }),
    fullWidth: settingIs('width', 'full', { label: 'Larghezza', options: { auto: 'Automatica', full: 'Tutta la larghezza' }, default: 'auto' }),
  },
};
