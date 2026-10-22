import { action } from 'storybook/actions';
import { login, figmaDesign } from './markup.js';

// Default dello schema schemas/fx-login.xsd
const defaults = {
  LogoText: 'A',
  Title: 'Bentornato',
  Subtitle: 'Accedi per continuare sul tuo account',
  Action: '#',
  EmailLabel: 'Email',
  EmailPlaceholder: 'nome@esempio.it',
  PasswordLabel: 'Password',
  PasswordPlaceholder: '••••••••',
  ForgotText: 'Password dimenticata?',
  ForgotLink: '#',
  SubmitText: 'Accedi',
  GoogleText: 'Continua con Google',
  GoogleLink: '#',
  SignupText: 'Non hai un account?',
  SignupLinkText: 'Registrati',
  SignupLink: '#',
};

/** Figma: Login – Mobile (1:27). OpenCms: content type `fx-login`, usa Input e Button. */
export default {
  title: 'Schermate/Login',
  args: defaults,
  render: (args) => {
    const root = document.createElement('div');
    // Come il frame Figma: sfondo a tutta altezza, contenuto centrato in verticale
    root.style.cssText = 'min-height:100vh;display:flex;flex-direction:column;justify-content:center;background:var(--surface-background)';
    root.innerHTML = login(args);
    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      action('submit')(Object.fromEntries(new FormData(e.target)));
    });
    return root;
  },
  parameters: {
    layout: 'fullscreen',
    design: figmaDesign('1-27'),
  },
};

export const Default = {};

/** Solo i campi obbligatori dello schema: i blocchi opzionali spariscono come nel JSP. */
export const Minimal = {
  args: {
    LogoText: '', Subtitle: '', EmailPlaceholder: '', PasswordPlaceholder: '',
    ForgotText: '', ForgotLink: '', GoogleText: '', GoogleLink: '',
    SignupText: '', SignupLinkText: '', SignupLink: '',
  },
};

export const Desktop = {
  globals: { viewport: { value: 'desktop', isRotated: false } },
};
