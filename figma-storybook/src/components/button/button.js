import { el } from '../../el.js';
import './button.css';

/**
 * Figma: Button (1:22). Proprietà Figma: Variant (Primary | Secondary), Label.
 * Con `href` diventa un link, altrimenti un <button>.
 */
export function Button({ label = 'Accedi', variant = 'primary', fullWidth = false, href, type = 'button', onClick } = {}) {
  const className = [
    'fx-button',
    `fx-button--${variant === 'secondary' ? 'secondary' : 'primary'}`,
    fullWidth && 'fx-button--full',
  ].filter(Boolean).join(' ');

  return href
    ? el('a', { class: className, href, onClick }, label)
    : el('button', { class: className, type, onClick }, label);
}
