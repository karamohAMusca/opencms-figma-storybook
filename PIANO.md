# Piano: da Storybook a OpenCms

Obiettivo: `figma-storybook/` è l'unica fonte dei componenti. Ogni componente descrive markup, CSS e come diventa contenuto OpenCms; `npm run export:opencms` genera i file del modulo `it.progetti.figma/` e `dev.py` li porta in OpenCms.

Stato: `fatto` / `in corso` / `da fare`.

## Punto di partenza (2026-10-22)

- Due implementazioni separate: Storybook (classi `ui-`, CSS per componente, rendering JS) e modulo OpenCms (classi `fx-`, `components.css` scritto a mano, JSP).
- Già disallineate: nel modulo `line-height: normal` (1px in più rispetto a Figma, corretto solo in Storybook), regole per Mercury solo nel modulo.
- Terza copia: `storybook/stories/markup.js` ricopia a mano i JSP.

## Fasi

| # | Fase | Cosa | Verifica | Stato |
|---|---|---|---|---|
| 1 | CSS unico | Prefisso `fx-` anche in Storybook; le regole contro gli stili di Mercury entrano nel CSS dei componenti; `npm run export:opencms` genera `resources/css/components.css` | `npm run visual` entro il 2%; `export:opencms -- --check` | fatto |
| 2 | Markup unico | Button, Input, Login con template dichiarativo (campi, condizioni, inclusione di componenti): Storybook lo disegna, l'esportatore lo traduce in JSP | stesso HTML in Storybook e nei JSP generati | fatto |
| 3 | Descrittore OpenCms | Ogni componente dichiara content type, campi con tipo OpenCms e impostazioni (default e varianti dal manifest Figma); l'esportatore genera `.xsd`, `.formatter` ed etichette. Si eliminano `storybook/` e `preview.html` | un componente nuovo arriva in OpenCms senza XML scritto a mano | fatto |
| 4 | Verifica in OpenCms | Script che crea una pagina di prova in OpenCms, la fotografa con Playwright e la confronta con la story | differenza entro la tolleranza | fatto |
| 5 | Nuovo componente da Figma | Card (immagine, titolo, testo, Button annidato) disegnata in Figma e portata per tutta la pipeline | Card in OpenCms uguale alla story | da fare |

## Decisioni

- Markup: JSP **generati** dal template unico, non scritti a mano.
- Componente nuovo per la fase 5: **Card**. Piano Figma Starter: poche chiamate MCP, si fa una volta a pipeline pronta.

## Note per fase

### Fase 1 (fatta il 2026-10-22)

- Classi `ui-` rinominate `fx-` in Storybook; `scripts/export-opencms.mjs` (`npm run export:opencms`) genera `components.css` del modulo; controllo `--check` anche nella skill `check-modifiche`.
- Effetti in OpenCms rispetto al CSS scritto a mano: altezza di riga come Figma (via il difetto da 1px), colonna del Login 400px invece di 420px, link del Login con focus visibile.
- Confronto visivo dopo il cambio: Button Primary 1,90%, Secondary 0,72%, Input 1,30%, Login 0,66%.
- La schermata Login prende tutta l'altezza della finestra (`min-height: 100dvh`) come il frame Figma: vale anche in OpenCms.

### Fase 2 (fatta il 2026-10-22)

- Markup in `*.template.js` (nodi di `src/template.js`), collegamenti a OpenCms in `*.opencms.js`; `scripts/opencms/jsp.mjs` traduce in JSP, l'export scrive `formatters/fx-cta-button.jsp`, `elements/fx-input.jsp`, `formatters/fx-login.jsp`.
- `npm run test:opencms`: 20 casi, JSP eseguiti con un interprete minimo e confrontati con l'HTML del template. Provato che fallisce con un default di variante sbagliato e con uno spazio mancante nelle classi.
- Confronto visivo invariato (stesse percentuali della fase 1): il nuovo motore disegna lo stesso markup.
- Cambi in OpenCms rispetto ai JSP scritti a mano: radice del Login `<section class="fx-login">` (prima `<div class="fx-element fx-login">`); `name` dell'Input omesso se vuoto.
- Da sapere: `storybook/stories/markup.js` ora non coincide più con il Login generato; si elimina nella fase 3. I JSP generati non sono ancora stati provati in OpenCms: lo fa la fase 4.

### Fase 3 (fatta il 2026-10-22)

- `*.opencms.js` con `type` (content type) ed etichette di campi e impostazioni; `scripts/opencms/xml.mjs` genera `.xsd`, `.formatter`, etichette `it`/`en`, `.config` e configurazione master (conservando il blocco `AddPlugins` di `dev.py`).
- I file generati coincidono con quelli scritti a mano, salvo le intestazioni "GENERATO" e il nome del tipo con il trattino lungo (`Figma – Bottone`, scritto `–` nelle etichette). Etichette `en` uguali alle `it`, come prima.
- Eliminati `storybook/` (copia a mano dei JSP, con i suoi `node_modules`) e `preview.html`; `build_module.py` non ha più `preview.html` tra i file esclusi.
- Nuovo controllo nella skill: XML del modulo ben formati.
- La prova "componente nuovo senza XML scritto a mano" da capo a fondo è la Card della fase 5; qui è verificato che la generazione riproduce i file esistenti.

### Fase 4 (fatta il 2026-10-22)

- `npm run compare:opencms`: pagina Mercury `/fx-test/` creata da `devtools/testpage.py` (progetto temporaneo, pubblicazione solo di quello, riavvio), foto degli elementi e confronto con le story.
- Primo risultato sul modulo generato: JSP, schemi e formatter funzionano in OpenCms (varianti dalle impostazioni, include dell'Input, link). Differenza principale: niente Inter in OpenCms.
- Correzione: l'export porta nel modulo i font di Storybook (`resources/fonts/`, `resources/css/fonts.css`, licenza OFL); `dev.py` ha registrato `plugins/fonts.xml`.
- Risultato finale: Button Primary 0,48%, Secondary 0,00%, Login 1,36% (solo resa del testo), misure uguali.
- Ostacoli trovati e risolti (in `PROBLEMI.md`): due aggiornamenti completi contemporanei (con `dev.py` attivo `--deploy` ora si rifiuta), `plugins/prova.xml` rimasto online, la shell come seconda istanza di OpenCms (serve un riavvio), WebDAV dopo il riavvio, posizioni frazionarie degli elementi nel confronto.
- La pagina `/fx-test/` resta pubblicata nel sito demo locale; ogni esecuzione la ricrea.
