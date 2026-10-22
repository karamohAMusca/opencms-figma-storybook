import { render } from '../../template.js';
import login from './login.template.js';
import '../../components/button/button.css';
import '../../components/input/input.css';
import './login.css';

/** Figma: Login – Mobile (1:27). Markup in login.template.js, da cui viene anche il JSP di OpenCms. */
export const Login = (props) => render(login, props);
