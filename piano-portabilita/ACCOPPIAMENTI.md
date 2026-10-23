# Cosa lega il motore a questo progetto

Inventario del 2026-10-23, ricavato cercando nel codice (non a memoria). "Motore" = ciò che si vuole portare: gli script in `figma-storybook/scripts/`, `figma-storybook/src/template.js` e `src/opencms.js`, il pacchetto `devtools/`, `build_module.py`. Ogni riga dice **dove**, **cosa è fisso** e **in quale fase si risolve**.

## 1. Nome del modulo e percorsi

| Cosa è fisso | Dove | Fase |
|---|---|---|
| Nome del modulo `it.progetti.figma` | `build_module.py:9` (`MOD`), `figma-storybook/scripts/opencms/jsp.mjs:6`, `.../opencms/xml.mjs:4`, `.../export-opencms.mjs:17`, `.../test-opencms.mjs:15`, `devtools/testpage.py:39` | P1 |
| Cartella del modulo `../it.progetti.figma` (vicina a `figma-storybook/`) | `export-opencms.mjs:17`, `sync_tokens.py:15` | P1 |
| Etichette `it.progetti.figma.messages_it/_en` e le due lingue `it`, `en` | `export-opencms.mjs:93` | P1 |
| Posizione di `module-types.json`, `module-version.txt`, `dist/` | `build_module.py:12`, `devtools/config.py:25` | P1 |
| Primo id dei content type `20001` | `build_module.py:13` | P1 |

## 2. Prefisso e convenzioni di nome

| Cosa è fisso | Dove | Fase |
|---|---|---|
| Prefisso `fx-` nelle classi CSS dei componenti | tutti i `*.css` e `*.template.js` | P1 (configurabile) |
| Contenitore `<div class="fx-element …">` attorno ai formatter | `jsp.mjs:201`, `test-opencms.mjs:77` | P1 |
| Nome del tipo = nome dello schema = nome della cartella (`fx-card`) | `*.opencms.js` (campo `type`), `xml.mjs` | P2 |
| Cartella e progetto di prova `fx-test` | `devtools/testpage.py:24-25,27-28`, `compare-opencms.mjs:60,83,131` | P5 |

## 3. Come si trovano i componenti

| Cosa è fisso | Dove | Fase |
|---|---|---|
| I componenti si scoprono passando dal manifest Figma (`node.code`, `stories`, ordine) | `scripts/opencms/load.mjs` | P4 |
| L'ordine dei componenti nel CSS e nei file è quello del manifest | `export-opencms.mjs` (`componentsCss`) | P4 |
| `check-figma` e `visual-compare` richiedono il manifest | `scripts/check-figma.mjs`, `scripts/visual-compare.mjs` | P4 (restano, ma opzionali) |
| L'elenco dei casi del confronto in OpenCms è scritto a mano | `compare-opencms.mjs:36-44` (`CASES`) | P5 |

## 4. Dove vive il linguaggio dei template

| Cosa è fisso | Dove | Fase |
|---|---|---|
| `template.js` e `opencms.js` stanno in `figma-storybook/src/` e i componenti li importano con percorsi relativi (`../../template.js`) | tutti i `*.template.js`, `*.opencms.js` | P3 |
| Il motore importa `../src/template.js` (per `resolveProps`, `renderHtml`) | `compare-opencms.mjs`, `test-opencms.mjs` | P3 |

## 5. Tipi di campo (la conoscenza è sparsa in quattro posti)

Aggiungere un tipo di campo (come `image` nella fase 5) ha richiesto di toccare più file, perché ognuno sa qualcosa del tipo:

| Cosa sa del tipo | Dove |
|---|---|
| Come lo dichiara il componente (`field`, `link`, `image`…) | `src/opencms.js` |
| Tipo dello schema e editor (`OpenCmsString`, `OpenCmsVfsFile` + `ImageGalleryWidget`) | `scripts/opencms/xml.mjs` (`XSD_TYPE`, `WIDGET`) |
| Come si simula nel test dei JSP | `scripts/test-opencms.mjs` (`context`, `cases`) |
| Come si scrive nel contenuto della pagina di prova | `devtools/testpage.py` (`content_xml`) e `compare-opencms.mjs` (`opencmsCase`) |

Fase: P2 (un registro, una voce per tipo).

## 6. Ipotesi su Mercury

| Cosa è fisso | Dove | Fase |
|---|---|---|
| Tipi di contenitore `element` e `m-element` nel formatter | `xml.mjs` (`formatterXml`) | P1 |
| Chiavi dei formatter `fx/…`, rank `1000` | `*.opencms.js`, `xml.mjs` | P1 |
| Pagina modello `/sites/default/login/index.html`, con i nomi `mercury-page`, `m/layout/area…`, `m/layout/row-simple` | `devtools/testpage.py:26,76-90` | P5 |
| Sito `/sites/default/` | `devtools/testpage.py:23` | P5 |
| Banner dei cookie `#privacy-policy-banner` nascosto nelle foto | `compare-opencms.mjs` (`NO_BANNER`) | P5 |
| Il blocco `<AddPlugins>` della configurazione lo aggiorna `dev.py` (un CSS nuovo diventa un plugin) | `xml.mjs` (`masterConfig`), `devtools/css_plugins.py` | P1 |

## 7. Dove gira OpenCms: l'immagine Docker di Alkacon

È l'accoppiamento più grosso, perché è fuori dai file di configurazione: le parti Python assumono quell'immagine.

| Cosa è fisso | Dove | Fase |
|---|---|---|
| Container `opencms` (modificabile con `OPENCMS_CONTAINER`) | `devtools/config.py:28` | P5 |
| Cartella dei moduli `/container/webapps/ROOT/WEB-INF/packages/modules` | `devtools/config.py` (`PKG`) | P5 |
| `docker cp`, `docker exec -u opencms`, `chown opencms:opencms`, `source /root/common.sh`, `shell_classpath`, `$OPENCMS_HOME` | `devtools/full_update.py`, `devtools/testpage.py` | P5 |
| Riavvio con `docker restart` (necessario perché la shell è un'altra istanza di OpenCms) | `full_update.py`, `testpage.py` | P5 |
| Progetto `Offline`, gruppi `Users`/`Administrators` | `testpage.py`, `full_update.py` | P5 |
| Credenziali: `OPENCMS_USER`, `OPENCMS_PASSWORD` da `.env` | `devtools/config.py` | già configurabile |
| Porta di Storybook `6007` | `compare-opencms.mjs:22`, `visual-compare.mjs:22`, `package.json` | P1 |

## 8. Token e font

| Cosa è fisso | Dove | Fase |
|---|---|---|
| I token vengono da `figma-storybook/figma/tokens.json` e si scrivono in due `tokens.css` fissi | `sync_tokens.py:11-15` | P1 / P4 (parte "Figma") |
| I font arrivano dagli `@import "@fontsource/…"` di `src/index.css` | `export-opencms.mjs` (`fonts`) | P1 |

## Cosa invece è già portabile

- La traduzione template → JSP (`jsp.mjs`) e le generazioni XML (`xml.mjs`) non contengono nulla di specifico di Button, Input, Card o Login: funzionano per qualunque componente scritto con i nodi di `template.js`.
- Gli id dei content type si assegnano da soli (`build_module.py`) e restano stabili.
- Il test di equivalenza JSP/template (`test-opencms.mjs`) legge i componenti dai loro file `*.opencms.js`.
