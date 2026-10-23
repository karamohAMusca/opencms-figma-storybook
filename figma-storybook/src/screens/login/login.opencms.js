import { field, link, raw } from '../../opencms.js';
import login from './login.template.js';

/** Login in OpenCms: content type fx-login, un campo per ogni testo e link della schermata. */
export default {
  component: login,
  type: {
    name: 'fx-login',
    niceName: 'Figma – Login',
    title: 'Crea un nuovo login',
    description: 'Form di login dal file Figma.',
    folder: 'fx-login',
    namePattern: 'fx-login_%(number).xml',
    order: 9010,
    titleField: 'Title',
  },
  // Senza contenitore: la radice del template (<section class="fx-login">) è già l'elemento.
  formatter: { jsp: 'formatters/fx-login.jsp', key: 'fx/login' },
  comment: 'Schermata Figma "Login – Mobile" (1:27). Usa i componenti Input (elements/fx-input.jsp) e Button.',
  bind: {
    logo: field('LogoText', { optional: true, label: 'Testo logo' }),
    title: field('Title', { label: 'Titolo' }),
    subtitle: field('Subtitle', { optional: true, label: 'Sottotitolo' }),
    action: link('Action', { label: 'URL di invio del form' }),
    emailLabel: field('EmailLabel', { label: 'Etichetta email' }),
    emailPlaceholder: field('EmailPlaceholder', { optional: true, label: 'Placeholder email' }),
    passwordLabel: field('PasswordLabel', { label: 'Etichetta password' }),
    passwordPlaceholder: field('PasswordPlaceholder', { optional: true, label: 'Placeholder password' }),
    forgotLabel: field('ForgotText', { optional: true, requires: ['value.ForgotLink.isSet'], label: 'Testo "password dimenticata"' }),
    forgotHref: link('ForgotLink', { optional: true, label: 'Link "password dimenticata"' }),
    submitLabel: field('SubmitText', { label: 'Testo bottone di accesso' }),
    googleLabel: field('GoogleText', { optional: true, requires: ['value.GoogleLink.isSet'], label: 'Testo bottone Google' }),
    googleHref: link('GoogleLink', { optional: true, label: 'Link accesso Google' }),
    signupText: field('SignupText', { optional: true, label: 'Testo registrazione' }),
    signupLabel: field('SignupLinkText', { optional: true, requires: ['value.SignupLink.isSet'], label: 'Testo link registrazione' }),
    signupHref: link('SignupLink', { optional: true, label: 'Link registrazione' }),
    idPrefix: raw('fx-login-${cms.element.instanceId}'),
  },
};
