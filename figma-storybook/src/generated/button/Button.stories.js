// GENERATO da figma/export/button.json (sha256 d851e51af60ee28c) con figma:generate 1.0.0: non modificare a mano
import { Button } from './button.js';

/** Figma: Button (1:22). */
export default {
  title: 'Generati/Button',
  render: (args) => Button(args),
  args: {
    label: 'Accedi',
    variant: 'primary',
    type: 'button',
    fullWidth: false,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary'] },
  },
};

export const Primary = { args: { variant: 'primary' } };
export const Secondary = { args: { variant: 'secondary' } };
