/**
 * Collegamenti tra le proprietà di un template (src/template.js) e OpenCms: da dove prende il valore il JSP generato
 * e quando quel valore c'è. Li usano i file *.opencms.js dei componenti; Storybook non li legge.
 *
 * Ogni collegamento è { kind, name, out, test }:
 * - out: cosa scrive il JSP (testo con espressioni EL);
 * - test: condizioni EL (in AND) per cui il valore è presente; [] = sempre presente (campo obbligatorio).
 * Un valore semplice (stringa, booleano) al posto di un collegamento è una costante.
 */

/** Campo di testo del contenuto. `requires`: altre condizioni perché il blocco abbia senso (es. il link che accompagna il testo). */
export const field = (name, { optional = false, requires = [] } = {}) =>
  ({ kind: 'field', name, out: `\${value.${name}}`, test: [...(optional ? [`value.${name}.isSet`] : []), ...requires] });

/** Campo link del contenuto (OpenCmsVarLink). */
export const link = (name, { optional = false } = {}) =>
  ({ kind: 'link', name, out: `\${value.${name}.toLink}`, test: optional ? [`value.${name}.isSet`] : [] });

/** Impostazione dell'elemento con valori ammessi; valori non ammessi diventano `def`. */
export function setting(name, options, def) {
  const expr = options.filter((o) => o !== def)
    .reduceRight((acc, o) => `cms.element.settings.${name} eq '${o}' ? '${o}' : ${acc}`, `'${def}'`);
  return { kind: 'setting', name, out: `\${${expr}}`, test: [] };
}

/** Impostazione usata come sì/no: vera se vale `on`. */
export const settingIs = (name, on) =>
  ({ kind: 'settingIs', name, on, out: '', test: [`cms.element.settings.${name} eq '${on}'`] });

/** Parametro di un elemento incluso con <cms:include> (escapato). Con `default`, vale quello se il parametro è vuoto. */
export const param = (name, { default: def } = {}) => (def === undefined
  ? { kind: 'param', name, out: `\${fn:escapeXml(param.${name})}`, test: [`not empty param.${name}`] }
  : { kind: 'param', name, out: `\${empty param.${name} ? '${def}' : fn:escapeXml(param.${name})}`, test: [] });

/** Testo JSP scritto così com'è (es. un id che dipende dall'istanza dell'elemento). */
export const raw = (out) => ({ kind: 'raw', out, test: [] });
