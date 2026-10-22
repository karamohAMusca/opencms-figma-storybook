import { el } from '../../el.js';
import { Button } from '../../components/button/button.js';
import { Input } from '../../components/input/input.js';
import './login.css';

/**
 * Figma: Login – Mobile (1:27). Compone Input (1:23) e Button (1:22).
 * I testi di default sono quelli del frame. Un testo vuoto nasconde il suo blocco
 * (tranne titolo, etichette dei campi e bottone di accesso).
 */
export function Login({
  logo = 'A',
  title = 'Bentornato',
  subtitle = 'Accedi per continuare sul tuo account',
  action = '#',
  emailLabel = 'Email',
  emailPlaceholder = 'nome@esempio.it',
  passwordLabel = 'Password',
  passwordPlaceholder = '••••••••',
  forgotLabel = 'Password dimenticata?',
  forgotHref = '#',
  submitLabel = 'Accedi',
  googleLabel = 'Continua con Google',
  googleHref = '#',
  signupText = 'Non hai un account?',
  signupLabel = 'Registrati',
  signupHref = '#',
  onSubmit,
} = {}) {
  return el('section', { class: 'ui-login' },
    el('div', { class: 'ui-login__inner' },
      el('header', { class: 'ui-login__header' },
        logo && el('div', { class: 'ui-login__logo', 'aria-hidden': 'true' }, logo),
        el('h1', { class: 'ui-login__title' }, title),
        subtitle && el('p', { class: 'ui-login__subtitle' }, subtitle),
      ),
      el('form', { class: 'ui-login__card', method: 'post', action, onSubmit },
        Input({ label: emailLabel, placeholder: emailPlaceholder, type: 'email', name: 'email', autocomplete: 'email', required: true }),
        Input({ label: passwordLabel, placeholder: passwordPlaceholder, type: 'password', name: 'password', autocomplete: 'current-password', required: true }),
        forgotLabel && el('a', { class: 'ui-login__forgot', href: forgotHref }, forgotLabel),
        Button({ label: submitLabel, variant: 'primary', fullWidth: true, type: 'submit' }),
        googleLabel && Button({ label: googleLabel, variant: 'secondary', fullWidth: true, href: googleHref }),
      ),
      signupText && el('p', { class: 'ui-login__footer' },
        `${signupText} `,
        signupLabel && el('a', { href: signupHref }, signupLabel),
      ),
    ),
  );
}
