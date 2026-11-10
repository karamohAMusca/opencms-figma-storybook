# Cosa lega il motore a questo progetto

Inventario del 2026-10-23, ricavato cercando nel codice (non a memoria). "Motore" = ciò che si vuole portare: gli script in `figma-storybook/scripts/`, `figma-storybook/src/template.js` e `src/opencms.js`, il pacchetto `devtools/`, `build_module.py`. Ogni riga dice **dove**, **cosa è fisso** e **in quale fase si risolve**. Scritto per il piano di portabilità (fasi P1-P5); il 2026-11-10 le fasi sono state riportate a quelle del piano Design System (F1-F6). I numeri di riga sono quelli del 2026-10-23: si ricontrollano all'inizio di ogni fase.

## 1. Nome del modulo e percorsi

| Cosa è fisso | Dove | Fase |
|---|---|---|
| Nome del modulo `it.progetti.figma` | `build_module.py:9` (`MOD`), `figma-storybook/scripts/opencms/jsp.mjs:6`, `.../opencms/xml.mjs:4`, `.../export-opencms.mjs:17`, `.../test-opencms.mjs:15`, `devtools/testpage.py:39` | F1 |
| Cartella del modulo `../it.progetti.figma` (vicina a `figma-storybook/`) | `export-opencms.mjs:17`, `sync_tokens.py:15` | F1 |
| Etichette `it.progetti.figma.messages_it/_en` e le due lingue `it`, `en` | `export-opencms.mjs:93` | F1 |
| Posizione di `module-types.json`, `module-version.txt`, `dist/` | `build_module.py:12`, `devtools/config.py:25` | F1 |
| Primo id dei content type `20001` | `build_module.py:13` | F1 |

## 2. Prefisso e convenzioni di nome

| Cosa è fisso | Dove | Fase |
|---|---|---|
| Prefisso `fx-` nelle classi CSS dei componenti | tutti i `*.css` e `*.template.js` | F1 (configurabile; sostituzione nei CSS in F6) |
| Contenitore `<div class="fx-element …">` attorno ai formatter | `jsp.mjs:201`, `test-opencms.mjs:77` | F1 |
| Nome del tipo = nome dello schema = nome della cartella (`fx-card`) | `*.opencms.js` (campo `type`), `xml.mjs` | F3 |
| Cartella e progetto di prova `fx-test` | `devtools/testpage.py:24-25,27-28`, `compare-opencms.mjs:60,83,131` | F6 |

## 3. Come si trovano i componenti

| Cosa è fisso | Dove | Fase |
|---|---|---|
| I componenti si scoprono passando dal manifest Figma (`node.code`, `stories`, ordine) | `scripts/opencms/load.mjs` | F3 |
| L'ordine dei componenti nel CSS e nei file è quello del manifest | `export-opencms.mjs` (`componentsCss`) | F3 |
| `check-figma` e `visual-compare` richiedono il manifest | `scripts/check-figma.mjs`, `scripts/visual-compare.mjs` | F3 (restano, per Figma) |
| L'elenco dei casi del confronto in OpenCms è scritto a mano | `compare-opencms.mjs:36-44` (`CASES`) | F3 |

## 4. Dove vive il linguaggio dei template

| Cosa è fisso | Dove | Fase |
|---|---|---|
| `template.js` e `opencms.js` stanno in `figma-storybook/src/` e i componenti li importano con percorsi relativi (`../../template.js`) | tutti i `*.template.js`, `*.opencms.js` | F4 |
| Il motore importa `../src/template.js` (per `resolveProps`, `renderHtml`) | `compare-opencms.mjs`, `test-opencms.mjs` | F4 |

## 5. Tipi di campo (la conoscenza è sparsa in quattro posti)

Aggiungere un tipo di campo (come `image` nella fase 5) ha richiesto di toccare più file, perché ognuno sa qualcosa del tipo:

| Cosa sa del tipo | Dove |
|---|---|
| Come lo dichiara il componente (`field`, `link`, `image`…) | `src/opencms.js` |
| Tipo dello schema e editor (`OpenCmsString`, `OpenCmsVfsFile` + `ImageGalleryWidget`) | `scripts/opencms/xml.mjs` (`XSD_TYPE`, `WIDGET`) |
| Come si simula nel test dei JSP | `scripts/test-opencms.mjs` (`context`, `cases`) |
| Come si scrive nel contenuto della pagina di prova | `devtools/testpage.py` (`content_xml`) e `compare-opencms.mjs` (`opencmsCase`) |

Fase: F3 (un registro, una voce per tipo).

## 6. Ipotesi su Mercury

| Cosa è fisso | Dove | Fase |
|---|---|---|
| Tipi di contenitore `element` e `m-element` nel formatter | `xml.mjs` (`formatterXml`) | F1 |
| Chiavi dei formatter `fx/…`, rank `1000` | `*.opencms.js`, `xml.mjs` | F1 |
| Pagina modello `/sites/default/login/index.html`, con i nomi `mercury-page`, `m/layout/area…`, `m/layout/row-simple` | `devtools/testpage.py:26,76-90` | F6 |
| Sito `/sites/default/` | `devtools/testpage.py:23` | F6 |
| Banner dei cookie `#privacy-policy-banner` nascosto nelle foto | `compare-opencms.mjs` (`NO_BANNER`) | F6 |
| Il blocco `<AddPlugins>` della configurazione lo aggiorna `dev.py` (un CSS nuovo diventa un plugin) | `xml.mjs` (`masterConfig`), `devtools/css_plugins.py` | F1 |

## 7. Dove gira OpenCms: l'immagine Docker di Alkacon

È l'accoppiamento più grosso, perché è fuori dai file di configurazione: le parti Python assumono quell'immagine.

| Cosa è fisso | Dove | Fase |
|---|---|---|
| Container `opencms` (modificabile con `OPENCMS_CONTAINER`) | `devtools/config.py:28` | dopo il piano |
| Cartella dei moduli `/container/webapps/ROOT/WEB-INF/packages/modules` | `devtools/config.py` (`PKG`) | dopo il piano |
| `docker cp`, `docker exec -u opencms`, `chown opencms:opencms`, `source /root/common.sh`, `shell_classpath`, `$OPENCMS_HOME` | `devtools/full_update.py`, `devtools/testpage.py` | dopo il piano |
| Riavvio con `docker restart` (necessario perché la shell è un'altra istanza di OpenCms) | `full_update.py`, `testpage.py` | dopo il piano |
| Progetto `Offline`, gruppi `Users`/`Administrators` | `testpage.py`, `full_update.py` | dopo il piano |
| Credenziali: `OPENCMS_USER`, `OPENCMS_PASSWORD` da `.env` | `devtools/config.py` | già configurabile |
| Porta di Storybook `6007` | `compare-opencms.mjs:22`, `visual-compare.mjs:22`, `package.json` | F1 |

## 8. Token e font

| Cosa è fisso | Dove | Fase |
|---|---|---|
| I token vengono da `figma-storybook/figma/tokens.json` e si scrivono in due `tokens.css` fissi | `sync_tokens.py:11-15` | F1 / F2 (token per tema, in Node) |
| I font arrivano dagli `@import "@fontsource/…"` di `src/index.css` | `export-opencms.mjs` (`fonts`) | F1 |

## Cosa invece è già portabile

- La traduzione template → JSP (`jsp.mjs`) e le generazioni XML (`xml.mjs`) non contengono nulla di specifico di Button, Input, Card o Login: funzionano per qualunque componente scritto con i nodi di `template.js`.
- Gli id dei content type si assegnano da soli (`build_module.py`) e restano stabili.
- Il test di equivalenza JSP/template (`test-opencms.mjs`) legge i componenti dai loro file `*.opencms.js`.

## Aggiunte per il Design System (2026-11-10)

| Cosa è fisso | Dove | Fase |
|---|---|---|
| Un solo insieme di token, letto da un solo nodo Figma (`1:27`) | `figma-storybook/figma/tokens.json`, `sync_tokens.py` | F2 |
| La story dei token legge `tokens.variables` | `figma-storybook/src/foundations/Tokens.stories.js` | F2 |
| Un solo modulo per tutto: componenti, token, font, Login | `export-opencms.mjs`, `build_module.py`, `devtools/` | F6 |
| Tre CSS registrati come plugin separati, non minificati | `it.progetti.figma/plugins/*.xml`, `devtools/css_plugins.py` | F7 |
| La versione cresce a ogni aggiornamento completo locale | `devtools/full_update.py:29` | F11 |
