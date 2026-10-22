import { el } from '../../el.js';
import './input.css';

let count = 0;

/**
 * Figma: Input (1:23). Proprietà Figma: Label, Placeholder.
 * type, name, autocomplete e required non esistono in Figma: servono al campo vero.
 */
export function Input({
  label = 'Email',
  placeholder = 'nome@esempio.it',
  type = 'text',
  name,
  id = `fx-input-${++count}`,
  autocomplete,
  required = false,
} = {}) {
  return el('div', { class: 'fx-input' },
    el('label', { class: 'fx-input__label', for: id }, label),
    el('input', { class: 'fx-input__field', id, name, type, placeholder, autocomplete, required }),
  );
}
