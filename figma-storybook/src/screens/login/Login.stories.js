import { fn } from 'storybook/test';
import { figmaMeta } from '../../figma.js';
import { Login } from './login.js';

const onSubmit = fn();
const figma = figmaMeta('Login – Mobile');

// Usa Input e Button. Gli args sono del codice: in Figma la schermata non ha proprietà.
export default {
  title: 'Schermate/Login',
  render: (args) =>
    Login({
      ...args,
      onSubmit: (e) => {
        e.preventDefault();
        args.onSubmit(Object.fromEntries(new FormData(e.target)));
      },
    }),
  args: { onSubmit },
  parameters: { ...figma.parameters, layout: 'fullscreen' },
};

/** Stesse misure del frame Figma. */
export const Figma390 = {
  name: 'Figma 390',
  globals: { viewport: { value: 'figma', isRotated: false } },
};

export const Mobile375 = { name: 'Mobile 375' };

/** Non disegnato in Figma: la colonna resta larga al massimo 400px. */
export const Desktop = {
  globals: { viewport: { value: 'desktop', isRotated: false } },
};

/** Senza i blocchi opzionali (logo, sottotitolo, link, Google, registrazione). */
export const Minimal = {
  args: { logo: '', subtitle: '', forgotLabel: '', googleLabel: '', signupText: '' },
};
