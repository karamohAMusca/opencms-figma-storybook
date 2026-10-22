// File di configurazione OpenCms generati dai *.opencms.js con un content type (`type`): schema .xsd, .formatter,
// etichette (i18n), .config del modulo e configurazione master del sito. Il formato ricalca i file scritti a mano.

const MODULE = 'it.progetti.figma';
const GEN = 'GENERATO da figma-storybook/scripts/export-opencms.mjs: non modificare a mano';
const XML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const xmlAttr = (s) => String(s).replace(/[&<>"]/g, (c) => XML_ESC[c]);
const cdata = (s) => `<![CDATA[${s}]]>`;

/** fx-cta-button → FxCtaButton (nome dei tipi XML e prefisso delle etichette). */
export const xsdName = (type) => type.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');

const fields = (def) => Object.entries(def.bind).filter(([, b]) => ['field', 'link', 'image'].includes(b?.kind));
const XSD_TYPE = { field: 'OpenCmsString', link: 'OpenCmsVarLink', image: 'OpenCmsVfsFile' };
// Editor dei campi che non usano quello predefinito del tipo: le immagini si scelgono dalla galleria.
const WIDGET = { image: 'ImageGalleryWidget' };
const settings = (def) => Object.values(def.bind).filter((b) => b?.kind === 'setting' || b?.kind === 'settingIs');

export function schemaXsd(def) {
  const n = xsdName(def.type.name);
  const elements = fields(def).map(([, b]) =>
    `            <xsd:element name="${b.name}" type="${XSD_TYPE[b.kind]}"${b.optional ? ' minOccurs="0"' : ''}/>`);
  // Default dei campi di testo: quelli del template, cioè i testi del Figma.
  const defaults = fields(def).filter(([prop, b]) => b.kind === 'field' && typeof def.component.props[prop].default === 'string'
    && def.component.props[prop].default !== '')
    .map(([prop, b]) => `                <default element="${b.name}" value="${xmlAttr(def.component.props[prop].default)}"/>`);
  const layouts = fields(def).filter(([, b]) => WIDGET[b.kind])
    .map(([, b]) => `                <layout element="${b.name}" widget="${WIDGET[b.kind]}"/>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${GEN}, cambia ${def.opencmsSource}. -->`,
    '<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">',
    '',
    '    <xsd:include schemaLocation="opencms://opencms-xmlcontent.xsd"/>',
    '',
    `    <xsd:element name="${n}s" type="OpenCms${n}s"/>`,
    '',
    `    <xsd:complexType name="OpenCms${n}s">`,
    '        <xsd:sequence>',
    `            <xsd:element name="${n}" type="OpenCms${n}" minOccurs="0" maxOccurs="unbounded"/>`,
    '        </xsd:sequence>',
    '    </xsd:complexType>',
    '',
    `    <xsd:complexType name="OpenCms${n}">`,
    '        <xsd:sequence>',
    ...elements,
    '        </xsd:sequence>',
    '        <xsd:attribute name="language" type="OpenCmsLocale" use="required"/>',
    '    </xsd:complexType>',
    '',
    '    <xsd:annotation>',
    '        <xsd:appinfo>',
    '            <resourcebundles>',
    `                <propertybundle name="${MODULE}.messages"/>`,
    '            </resourcebundles>',
    ...(def.type.titleField ? ['            <mappings>', `                <mapping element="${def.type.titleField}" mapto="property:Title"/>`, '            </mappings>'] : []),
    ...(defaults.length ? ['            <defaults>', ...defaults, '            </defaults>'] : []),
    ...(layouts.length ? ['            <layouts>', ...layouts, '            </layouts>'] : []),
    '        </xsd:appinfo>',
    '    </xsd:annotation>',
    '',
    '</xsd:schema>',
    '',
  ].join('\n');
}

export function formatterXml(def) {
  const s = settings(def).flatMap((b) => [
    '    <Setting>',
    `      <PropertyName>${cdata(b.name)}</PropertyName>`,
    `      <DisplayName>${cdata(b.label)}</DisplayName>`,
    `      <Widget>${cdata('select')}</Widget>`,
    `      <Default>${cdata(b.default)}</Default>`,
    `      <WidgetConfig>${cdata(Object.entries(b.options).map(([v, l]) => `${v}:${l}`).join('|'))}</WidgetConfig>`,
    '    </Setting>',
  ]);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${GEN}, cambia ${def.opencmsSource}. -->`,
    '<NewFormatters xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="opencms://system/modules/org.opencms.ade.config/schemas/formatters/new_formatter.xsd">',
    '  <NewFormatter language="en">',
    `    <NiceName>${cdata(def.type.niceName)}</NiceName>`,
    `    <Type>${cdata(def.type.name)}</Type>`,
    `    <Key>${cdata(def.formatter.key)}</Key>`,
    '    <Jsp>',
    '      <link type="STRONG">',
    `        <target>${cdata(`/system/modules/${MODULE}/${def.formatter.jsp}`)}</target>`,
    '      </link>',
    '    </Jsp>',
    `    <Rank>${cdata('1000')}</Rank>`,
    '    <Match>',
    '      <Types>',
    `        <ContainerType>${cdata('element')}</ContainerType>`,
    `        <ContainerType>${cdata('m-element')}</ContainerType>`,
    '      </Types>',
    '    </Match>',
    '    <AutoEnabled>true</AutoEnabled>',
    '    <SearchContent>true</SearchContent>',
    '    <StrictContainers>false</StrictContainers>',
    ...s,
    '  </NewFormatter>',
    '</NewFormatters>',
    '',
  ].join('\n');
}

/** Le etichette sono file .properties: i caratteri non ASCII diventano \uXXXX, validi con qualunque codifica. */
const prop = (s) => String(s).replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

export function messages(defs) {
  const typed = defs.filter((d) => d.type);
  const labels = typed.map((d) => fields(d).map(([, b]) => `label.${xsdName(d.type.name)}.${b.name}=${prop(b.label)}`).join('\n'));
  const types = typed.flatMap((d) => [
    `type.${d.type.name}.name=${prop(d.type.niceName)}`,
    `type.${d.type.name}.title=${prop(d.type.title)}`,
    `type.${d.type.name}.description=${prop(d.type.description)}`,
  ]);
  return `# ${GEN}, cambia i *.opencms.js in figma-storybook/src/.\n${labels.join('\n\n')}\n\n${types.join('\n')}\n`;
}

const resourceType = (d, master) => [
  '    <ResourceType>',
  `      <TypeName>${cdata(d.type.name)}</TypeName>`,
  ...(master ? [`      <Disabled>${cdata('false')}</Disabled>`] : []),
  '      <Folder>',
  `        <Name>${cdata(d.type.folder)}</Name>`,
  '      </Folder>',
  `      <NamePattern>${cdata(d.type.namePattern)}</NamePattern>`,
  `      <Order>${cdata(String(d.type.order))}</Order>`,
  ...(master ? ['      <ElementView/>'] : []),
  '      <DetailPagesDisabled>true</DetailPagesDisabled>',
  '    </ResourceType>',
];

export function moduleConfig(defs) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${GEN}, cambia i *.opencms.js in figma-storybook/src/. -->`,
    '',
    '<ModuleConfigurations xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="opencms://system/modules/org.opencms.ade.config/schemas/module_config.xsd">',
    '  <ModuleConfiguration language="en">',
    ...defs.filter((d) => d.type).flatMap((d) => resourceType(d, false)),
    '  </ModuleConfiguration>',
    '</ModuleConfigurations>',
    '',
  ].join('\n');
}

/**
 * Configurazione master del sito: content type e formatter generati qui; il blocco <AddPlugins> lo gestisce dev.py
 * (un CSS nuovo in resources/css/ diventa un plugin) e viene conservato com'è. Se manca, si elencano i plugins/*.xml.
 */
export function masterConfig(defs, current, pluginFiles) {
  const kept = current?.replace(/\r\n/g, '\n').match(/ {4}<AddPlugins>[\s\S]*?<\/AddPlugins>\n/)?.[0];
  const plugins = kept ?? [
    '    <AddPlugins>',
    ...pluginFiles.flatMap((f) => ['      <Plugin>', '        <link type="WEAK">',
      `          <target>${cdata(`/system/modules/${MODULE}/plugins/${f}`)}</target>`, '        </link>', '      </Plugin>']),
    '    </AddPlugins>',
    '',
  ].join('\n');
  const typed = defs.filter((d) => d.type);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${GEN}, cambia i *.opencms.js in figma-storybook/src/ (il blocco AddPlugins lo aggiorna dev.py). -->`,
    '',
    '<SitemapMasterConfigurations xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="opencms://system/modules/org.opencms.ade.config/schemas/sitemap_master_config.xsd">',
    '  <SitemapMasterConfiguration language="en">',
    ...typed.flatMap((d) => resourceType(d, true)),
    '    <AddFormatters>',
    ...typed.flatMap((d) => ['      <AddFormatter>', '        <link type="WEAK">',
      `          <target>${cdata(`/system/modules/${MODULE}/${d.formatter.jsp.replace(/\.jsp$/, '.formatter')}`)}</target>`,
      '        </link>', '      </AddFormatter>']),
    '    </AddFormatters>',
  ].join('\n') + '\n' + plugins + [
    '  </SitemapMasterConfiguration>',
    '</SitemapMasterConfigurations>',
    '',
  ].join('\n');
}
