import { h, prop, when, use, concat } from '../../template.js';
import button from '../../components/button/button.template.js';
import input from '../../components/input/input.template.js';

let count = 0;

/**
 * Figma: Login – Mobile (1:27). Compone Input (1:23) e Button (1:22).
 * I testi di default sono quelli del frame. Un testo vuoto nasconde il suo blocco
 * (tranne titolo, etichette dei campi e bottone di accesso).
 */
export default {
  name: 'Login – Mobile',
  figma: '1:27',
  props: {
    logo: { default: 'A' },
    title: { default: 'Bentornato' },
    subtitle: { default: 'Accedi per continuare sul tuo account' },
    action: { default: '#' },
    emailLabel: { default: 'Email' },
    emailPlaceholder: { default: 'nome@esempio.it' },
    passwordLabel: { default: 'Password' },
    passwordPlaceholder: { default: '••••••••' },
    forgotLabel: { default: 'Password dimenticata?' },
    forgotHref: { default: '#' },
    submitLabel: { default: 'Accedi' },
    googleLabel: { default: 'Continua con Google' },
    googleHref: { default: '#' },
    signupText: { default: 'Non hai un account?' },
    signupLabel: { default: 'Registrati' },
    signupHref: { default: '#' },
    idPrefix: { default: () => `fx-login-${++count}` }, // id dei campi: <idPrefix>-email, <idPrefix>-password
    onSubmit: {},
  },
  template: h('section', { class: 'fx-login' },
    h('div', { class: 'fx-login__inner' },
      h('header', { class: 'fx-login__header' },
        when(prop('logo'), h('div', { class: 'fx-login__logo', 'aria-hidden': 'true' }, prop('logo'))),
        h('h1', { class: 'fx-login__title' }, prop('title')),
        when(prop('subtitle'), h('p', { class: 'fx-login__subtitle' }, prop('subtitle'))),
      ),
      h('form', { class: 'fx-login__card', method: 'post', action: prop('action'), onSubmit: prop('onSubmit') },
        use(input, {
          id: concat(prop('idPrefix'), '-email'), name: 'email', type: 'email', label: prop('emailLabel'),
          placeholder: prop('emailPlaceholder'), autocomplete: 'email', required: true,
        }),
        use(input, {
          id: concat(prop('idPrefix'), '-password'), name: 'password', type: 'password', label: prop('passwordLabel'),
          placeholder: prop('passwordPlaceholder'), autocomplete: 'current-password', required: true,
        }),
        when(prop('forgotLabel'), h('a', { class: 'fx-login__forgot', href: prop('forgotHref') }, prop('forgotLabel'))),
        use(button, { label: prop('submitLabel'), variant: 'primary', fullWidth: true, type: 'submit' }),
        when(prop('googleLabel'), use(button, { label: prop('googleLabel'), variant: 'secondary', fullWidth: true, href: prop('googleHref') })),
      ),
      when(prop('signupText'), h('p', { class: 'fx-login__footer' },
        prop('signupText'), ' ',
        when(prop('signupLabel'), h('a', { href: prop('signupHref') }, prop('signupLabel'))),
      )),
    ),
  ),
};
