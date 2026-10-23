import { render } from '../../template.js';
import card from './card.template.js';
import '../button/button.css';
import './card.css';

/** Figma: Card (44:10). Markup in card.template.js, da cui viene anche il JSP di OpenCms. */
export const Card = (props) => render(card, props);
