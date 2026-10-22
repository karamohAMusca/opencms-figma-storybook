# it.progetti.figma

Componenti OpenCms (template Mercury) generati dal file Figma "Esempio Claude × Figma".

| Figma | OpenCms | File |
|---|---|---|
| Button (1:22) | content type `fx-cta-button`, settings `variant` e `width` | `schemas/fx-cta-button.xsd`, `formatters/fx-cta-button.*` |
| Input (1:23) | include JSP riusabile (non è un contenuto) | `elements/fx-input.jsp` |
| Login – Mobile (1:27) | content type `fx-login` | `schemas/fx-login.xsd`, `formatters/fx-login.*` |

CSS: `resources/css/tokens.css` (variabili Figma, **generato** da `python sync_tokens.py` a partire da `figma-storybook/figma/tokens.json`: non modificarlo a mano) e `resources/css/components.css` (classi `fx-`),
caricati su tutte le pagine come plugin Mercury del gruppo `css` (`plugins/*.xml`, registrati in `configuration/figma.master.additions.xml`).
`preview.html` mostra lo stesso markup senza OpenCms.

## Sviluppo in locale

Dalla radice del repo, con `start.ps1` (avvia Docker, OpenCms e `dev.py`; vedi il README principale). Solo la sincronizzazione, con OpenCms già acceso:

```
python dev.py
```

Resta in ascolto e decide da solo come aggiornare OpenCms:

| Cosa cambi | Cosa fa |
|---|---|
| file esistente modificato, nuovo CSS/JS/JSP/immagine | lo invia subito via WebDAV |
| file eliminato | lo elimina anche in OpenCms |
| nuovo formatter, plugin, configurazione, etichette, font, schema (content type) | aggiornamento completo: build, `replaceModule`, riavvio (~1 minuto) |

All'avvio allinea tutto. Le modifiche arrivano nel progetto Offline: per il sito pubblico vanno pubblicate.
I content type si ricavano da `schemas/*.xsd`; gli id sono fissati in `module-types.json`, la versione dell'ultimo aggiornamento completo in `module-version.txt` (file locale, non versionato: se manca si riparte da 1.0.0).

## Storybook

In `storybook/`, nella radice del repo (fuori dal modulo, non finisce nello zip). Usa gli stessi `tokens.css` e `components.css`;
il markup è in `storybook/stories/markup.js`, copia fedele dei JSP: se cambi un JSP, aggiorna anche lì.

```
cd storybook
npm install
npm run storybook        # http://localhost:6006
npm run build-storybook  # versione statica in storybook-static/
```

Viewport di default 375px (mobile first); c'è anche 390px per il confronto col frame Figma.

## Build e installazione

Dalla radice del repo:

```
python build_module.py it.progetti.figma dist/it.progetti.figma_1.0.0.zip
```

Genera lo zip con il `manifest.xml` (tipi `fx-cta-button` id 20001 e `fx-login` id 20002).
Si importa da **Launchpad → Modules → Import** oppure con la shell OpenCms (`importModuleFromDefault`).
`README.md` e `preview.html` non vengono inclusi.

## Da sapere

- **Font Inter**: Mercury non lo include. Ospitalo nel modulo (consigliato per il GDPR) e aggiungi un `@font-face`,
  altrimenti si usa il font di sistema.
- **Login**: il form fa una POST all'URL del campo `Action`. L'autenticazione (OpenCms o backend esterno) va collegata lì.
- **iOS**: i campi hanno font 15px come in Figma. Safari su iPhone zooma sugli input sotto i 16px.
- **Hover**: in Figma non ci sono stati hover/pressed. Ho aggiunto solo focus visibile e sottolineatura dei link.
