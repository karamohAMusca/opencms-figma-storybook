import { render } from '../../template.js';
import button from './button.template.js';
import './button.css';

/** Figma: Button (1:22). Markup in button.template.js, da cui viene anche il JSP di OpenCms. */
export const Button = (props) => render(button, props);
