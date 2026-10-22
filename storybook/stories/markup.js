// Markup dei componenti fx-, identico a quello prodotto dai JSP del modulo OpenCms.
// Se cambi un JSP, aggiorna la funzione corrispondente (e viceversa).

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

const attr = (name, value) => (value ? ` ${name}="${esc(value)}"` : '');

/** Classi del Button (Figma 1:22). variant: primary|secondary, full: larghezza 100% */
const buttonClass = ({ variant, full }) =>
  `fx-button fx-button--${variant === 'secondary' ? 'secondary' : 'primary'}${full ? ' fx-button--full' : ''}`;

/** formatters/fx-cta-button.jsp: settings variant (primary|secondary) e width (auto|full) */
export const ctaButton = ({ text, link, variant, width }) => `
<div class="fx-element fx-cta-button">
    <a class="${buttonClass({ variant, full: width === 'full' })}" href="${esc(link)}">${esc(text)}</a>
</div>`;

/** elements/fx-input.jsp (Figma 1:23) */
export const input = ({ id, name, type, label, placeholder, autocomplete }) => `
<div class="fx-input">
    <label class="fx-input__label" for="${esc(id)}">${esc(label)}</label>
    <input class="fx-input__field" id="${esc(id)}" name="${esc(name)}" type="${esc(type || 'text')}"${attr('placeholder', placeholder)}${attr('autocomplete', autocomplete)} required>
</div>`;

/** formatters/fx-login.jsp (Figma 1:27). I campi opzionali vuoti non vengono resi, come nel JSP. */
export const login = (v, idPrefix = 'fx-login-sb') => `
<div class="fx-element fx-login">
    <div class="fx-login__inner">

        <header class="fx-login__header">
            ${v.LogoText ? `<div class="fx-login__logo" aria-hidden="true">${esc(v.LogoText)}</div>` : ''}
            <h1 class="fx-login__title">${esc(v.Title)}</h1>
            ${v.Subtitle ? `<p class="fx-login__subtitle">${esc(v.Subtitle)}</p>` : ''}
        </header>

        <form class="fx-login__card" method="post" action="${esc(v.Action)}">
            ${input({ id: `${idPrefix}-email`, name: 'email', type: 'email', label: v.EmailLabel, placeholder: v.EmailPlaceholder, autocomplete: 'email' })}
            ${input({ id: `${idPrefix}-password`, name: 'password', type: 'password', label: v.PasswordLabel, placeholder: v.PasswordPlaceholder, autocomplete: 'current-password' })}

            ${v.ForgotText && v.ForgotLink ? `<a class="fx-login__forgot" href="${esc(v.ForgotLink)}">${esc(v.ForgotText)}</a>` : ''}

            <button class="${buttonClass({ variant: 'primary', full: true })}" type="submit">${esc(v.SubmitText)}</button>

            ${v.GoogleText && v.GoogleLink ? `<a class="${buttonClass({ variant: 'secondary', full: true })}" href="${esc(v.GoogleLink)}">${esc(v.GoogleText)}</a>` : ''}
        </form>

        ${v.SignupText ? `<p class="fx-login__footer">
            ${esc(v.SignupText)}
            ${v.SignupLinkText && v.SignupLink ? `<a href="${esc(v.SignupLink)}">${esc(v.SignupLinkText)}</a>` : ''}
        </p>` : ''}

    </div>
</div>`;

// Link al nodo Figma: la chiave sta in .env (FIGMA_FILE_KEY), non nel repo; senza, nessuna scheda Design.
export const figmaDesign = (nodeId) =>
  import.meta.env.FIGMA_FILE_KEY
    ? { type: 'figma', url: `https://www.figma.com/design/${import.meta.env.FIGMA_FILE_KEY}/?node-id=${nodeId}` }
    : undefined;
