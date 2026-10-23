import { render } from '../../template.js';
import input from './input.template.js';
import './input.css';

/** Figma: Input (1:23). Markup in input.template.js, da cui viene anche il JSP di OpenCms. */
export const Input = (props) => render(input, props);
