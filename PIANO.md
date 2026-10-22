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
| 2 | Markup unico | Button, Input, Login con template dichiarativo (campi, condizioni, inclusione di componenti): Storybook lo disegna, l'esportatore lo traduce in JSP | stesso HTML in Storybook e nei JSP generati | da fare |
| 3 | Descrittore OpenCms | Ogni componente dichiara content type, campi con tipo OpenCms e impostazioni (default e varianti dal manifest Figma); l'esportatore genera `.xsd`, `.formatter` ed etichette. Si eliminano `storybook/` e `preview.html` | un componente nuovo arriva in OpenCms senza XML scritto a mano | da fare |
| 4 | Verifica in OpenCms | Script che crea una pagina di prova in OpenCms, la fotografa con Playwright e la confronta con la story | differenza entro la tolleranza | da fare |
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
