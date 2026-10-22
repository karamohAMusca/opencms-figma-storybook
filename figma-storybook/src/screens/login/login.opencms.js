import { field, link, raw } from '../../opencms.js';
import login from './login.template.js';

const optional = { optional: true };

/** Login in OpenCms: content type fx-login, un campo per ogni testo e link della schermata. */
export default {
  component: login,
  // Senza contenitore: la radice del template (<section class="fx-login">) è già l'elemento.
  formatter: { jsp: 'formatters/fx-login.jsp' },
  comment: 'Schermata Figma "Login – Mobile" (1:27). Usa i componenti Input (elements/fx-input.jsp) e Button.',
  bind: {
    logo: field('LogoText', optional),
    title: field('Title'),
    subtitle: field('Subtitle', optional),
    action: link('Action'),
    emailLabel: field('EmailLabel'),
    emailPlaceholder: field('EmailPlaceholder', optional),
    passwordLabel: field('PasswordLabel'),
    passwordPlaceholder: field('PasswordPlaceholder', optional),
    forgotLabel: field('ForgotText', { optional: true, requires: ['value.ForgotLink.isSet'] }),
    forgotHref: link('ForgotLink', optional),
    submitLabel: field('SubmitText'),
    googleLabel: field('GoogleText', { optional: true, requires: ['value.GoogleLink.isSet'] }),
    googleHref: link('GoogleLink', optional),
    signupText: field('SignupText', optional),
    signupLabel: field('SignupLinkText', { optional: true, requires: ['value.SignupLink.isSet'] }),
    signupHref: link('SignupLink', optional),
    idPrefix: raw('fx-login-${cms.element.instanceId}'),
  },
};
