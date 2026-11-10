# figma-storybook

Componenti del file Figma «Esempio Claude × Figma», in HTML + CSS + JS senza framework, con Storybook.
**Button, Input e Card sono generati dal Figma** con un percorso deterministico e senza AI
(`piano-design-system/GENERATORE.md`): plugin `fx-export` → `figma/export/` → `npm run figma:generate`.

| Figma | Codice | Storie |
|---|---|---|
| Variabili | `src/tokens.css` (generato da `figma/export/variables.json`) | Fondamenta/Token |
| Button (1:22) | `src/components/button/` | Componenti/Button |
| Input (1:23) | `src/components/input/` | Componenti/Input |
| Card (44:10) | `src/components/card/` | Componenti/Card |
| Login – Mobile (1:27) | `src/screens/login/` | Schermate/Login |

## Export verso OpenCms

Questo Storybook è la fonte dei componenti del modulo OpenCms `it.progetti.figma` (piano in `PIANO.md` nella radice).

```
npm run export:opencms             # genera i file del modulo
npm run export:opencms -- --check  # esce con 1 se il modulo non è allineato
```

Genera:

- `resources/css/components.css`: i CSS dei componenti e delle schermate, nell'ordine di `figma/manifest.json` (gli `*.extra.css` no: sono già dentro il CSS generato);
- i JSP: `formatters/fx-cta-button.jsp`, `elements/fx-input.jsp`, `formatters/fx-login.jsp`;
- per i componenti con un content type (`type` nel `*.opencms.js`): `schemas/*.xsd` (un elemento per ogni `field`/`link`, con i default dei testi presi dal template), `formatters/*.formatter` (una impostazione `select` per ogni `setting`/`settingIs`), le etichette in `i18n/`, `.config` e `configuration/figma.master.additions.xml`. Di quest'ultima si conserva il blocco `AddPlugins`, che aggiorna `dev.py` quando nasce un CSS.

Per un componente nuovo in OpenCms: lo si esporta da Figma con il plugin, si scrivono `rules.json` e `opencms.js`, e `npm run figma:generate` fa il resto (template, CSS, story, voce del manifest): niente XML né markup scritto a mano.

File di un componente (`src/components/<nome>/`):

| File | Chi lo scrive | Contenuto |
|---|---|---|
| `*.template.js` | **generato** (`figma:generate`) | markup e proprietà, scritti con i nodi di `src/template.js` (`h`, `prop`, `when`, `choose`, `use`, `cls`, `mod`, `concat`, `opt`): niente funzioni, perché ogni nodo deve avere un equivalente JSP |
| `*.css` | **generato** | stili, dalle tabelle del generatore; in coda il contenuto di `*.extra.css` |
| `*.js`, `*.stories.js` | **generato** | il componente per Storybook (`render(template, props)`) e le story (`figmaMeta`, `figmaVariant`) |
| `*.rules.json` | a mano | la semantica che Figma non sa esprimere: tag HTML, link, attributi, proprietà in più, story di prova (schema in `scripts/figma/rules.schema.json`) |
| `*.extra.css` | a mano, facoltativo | ciò che non si disegna in Figma (focus, larghezza piena) |
| `*.opencms.js` | a mano | content type (`type`: nome, etichette, cartella, campo titolo), formatter o elemento, e da dove prende i valori il JSP: campi del contenuto (`field`, `link`, `image`, con etichetta e obbligatorietà), impostazioni (`setting`, `settingIs`, con opzioni), parametri di un elemento incluso (`param`), testo JSP (`raw`), costanti. Helper in `src/opencms.js` |

La schermata Login (`src/screens/login/`) resta scritta a mano: è una composizione di componenti, non un componente Figma.

Un componente usato da un altro (`use`) diventa `<cms:include>` se ha un proprio elemento JSP (Input), altrimenti viene espanso nel JSP di chi lo usa (Button nel Login).
`npm run test:opencms` esegue i JSP generati con un interprete minimo (`scripts/opencms/jsp-sim.mjs`) e confronta l'HTML con quello del template, per i default e per ogni opzione, sì/no e testo facoltativo vuoto: controlla la traduzione, non sostituisce la prova in OpenCms.
`npm run golden` confronta l'impronta (SHA-256, fine riga ignorati) dei file del modulo, di `src/tokens.css` e dei file generati da Figma (componenti, `figma/manifest.json`, `figma/tokens.json`) con quella salvata in `golden.json`: fallisce se un file generato cambia, manca o si aggiunge. Se il cambiamento è voluto, `npm run golden -- --update` nello stesso commit (vedi `piano-design-system/`).
Le regole che servono solo dentro Mercury (colori ripetuti su `:hover`/`:focus` dei link, niente ombra sui campi, font dei titoli) le aggiunge
il generatore per tag HTML (tabella `TAGS` in `scripts/figma/generate.mjs`). Classi con prefisso `fx-`. Con `dev.py` in ascolto, i file generati arrivano in OpenCms da soli.

### Confronto con OpenCms

```
npm run compare:opencms               # ricrea la pagina di prova e confronta
npm run compare:opencms -- --deploy   # prima carica il modulo (aggiornamento completo; solo con dev.py spento)
npm run compare:opencms -- --no-page  # solo il confronto, sulla pagina già pubblicata
```

Con OpenCms e Storybook accesi, crea in OpenCms la pagina `/fx-test/` (`devtools/testpage.py`): una pagina Mercury vera, con un elemento per ogni caso
di `scripts/compare-opencms.mjs` (contenuti e impostazioni ricavati dai `*.opencms.js`). La prepara in un progetto OpenCms temporaneo, pubblica solo quello e
riavvia OpenCms (la shell è un'altra istanza di OpenCms: il server vede i cambi solo dopo il riavvio). Poi fotografa ogni elemento lì e nella sua story,
allineati al pixel intero, e li confronta (tolleranza 2%, report in `opencms-report/index.html`).

## Dati Figma (`figma/`)

| File | Contenuto | Come si aggiorna |
|---|---|---|
| `export/` | JSON e screenshot dei componenti e delle variabili, dal plugin `fx-export` (README in `figma-export/`) | si riesporta dal Figma e `npm run figma:import -- <zip>` |
| `manifest.json` | inventario: `components` (**generato** dagli export), `screens` (Login, a mano) | `npm run figma:generate` |
| `tokens.json` | `variables` (**generato** da `export/variables.json`) e `styles` (valori che in Figma non sono variabili, a mano) | `npm run figma:generate` |
| `screenshots/login-1_27.png` | screenshot della schermata Login (non è un componente, il plugin non la esporta) | a mano |

`src/tokens.css` e il `tokens.css` del modulo OpenCms li genera `npm run figma:generate`: non vanno modificati a mano
(`npm run figma:generate -- --check` verifica che siano allineati). Niente dati presi con l'MCP: il percorso non usa AI.

## Story guidate dal manifest

`src/figma.js` legge `figma/manifest.json`:

- `figmaMeta('Button')` → `args` (default Figma), `argTypes` (categoria **Figma**: VARIANT → radio, TEXT → testo, BOOLEAN → sì/no) e descrizione docs presa dal componente Figma;
- `figmaVariant('Button', 'Primary')` → una story per variante (`Variant=Primary` → `{ variant: 'primary' }`).

Entrambe aggiungono il parametro `design` di [`@storybook/addon-designs`](https://storybook.js.org/addons/@storybook/addon-designs): nel pannello **Design** di ogni story
ci sono l'embed Figma live del nodo (per le varianti, la singola variante) e lo screenshot salvato: per i componenti quello del plugin
in `figma/export/` (servito come `/figma-export/`), per le schermate `figma/screenshots/` (`/figma-screenshots/`), vedi `staticDirs` in `.storybook/main.js`.
L'embed live richiede di essere loggati a Figma con accesso al file; lo screenshot si vede sempre, anche nello Storybook statico.

Convenzioni: proprietà `Label` → arg `label`, opzione `Primary` → `'primary'`. Gli args che esistono solo nel codice vanno in categoria **Codice**.
Niente JSDoc sulla meta (`/** */` sopra `export default`): sostituirebbe la descrizione Figma.

I nomi delle story restano `export const` scritti nel file (Storybook li legge senza eseguire il codice). Se in Figma nasce una variante,
`npm run check:figma` fallisce finché non c'è la story corrispondente; lo stesso se un componente del manifest non ha story.

## Confronto visivo con Figma

Con Storybook acceso, `npm run visual` fotografa le story con Playwright (Chromium) e le confronta pixel per pixel con gli screenshot Figma (pixelmatch).
Report in `visual-report/index.html` (Figma, story, differenze in rosso; il giallo è antialiasing e non conta).

- Componenti: ogni variante (o la story `Default`) ↔ screenshot del plugin in `figma/export/`, composto su bianco (il plugin esporta con lo
  sfondo trasparente); il campo `render` dell'export dà di quanto lo screenshot sporge dal componente (l'ombra della Card).
- Schermate: `figma/screenshots/` ↔ story `visualStory` del manifest, con viewport grande quanto il frame.
- Fallisce se la story supera il 2% di pixel diversi (`VISUAL_TOLERANCE`) o se la misura differisce di più di 1px.

Cosa è emerso e come è stato risolto:

- **Altezza di riga**: `line-height: normal` in Chromium su Windows arrotonda ascendente e discendente del font (Inter 15px → 19px), Figma no (18px).
  Ora c'è il token `--font-line-height: round(1.21em, 1px)`, che riproduce le altezze dei testi Figma (13→16, 15→18, 28→34…).
- **Antialiasing**: il confronto usa testo in scala di grigi (`--disable-lcd-text`), come Figma.
- **Residuo 1–2%**: il testo del browser è un po' più stretto (Button Primary 98,3px invece di 99). Dipende dal font (build di Inter di `@fontsource`
  rispetto a quello di Figma), non dal CSS. Un errore vero pesa di più: un bordo di 2px al posto di 1px sul Secondary dà 5,2% e misura sbagliata.
- Sulle schermate intere un errore piccolo si diluisce (lo stesso bordo sul Login: +0,15%): i componenti si controllano sulle loro story.

Ogni componente è una funzione che restituisce un elemento DOM (`Button({ label, variant })`) e importa il proprio CSS.
`src/index.css` carica font Inter (ospitato via `@fontsource`, nessuna chiamata a Google) e token.

```
npm install
npm run storybook        # http://localhost:6007
npm run build-storybook  # versione statica in storybook-static/
npm run check:figma      # story allineate a figma/manifest.json
npm run figma:lint       # regole del disegno sugli export
npm run figma:generate   # componenti, token e manifest dagli export (-- --check per verificare)
npm run visual           # confronto visivo con gli screenshot Figma (Storybook acceso)
```

## Decisioni prese dove il Figma non dice nulla

Da validare con il design:

- **Stati**: in Figma non ci sono hover, pressed, disabled né errori. Ho aggiunto solo il focus visibile (bordo/contorno `brand/primary`) e la sottolineatura dei link al passaggio.
- **Oltre il mobile**: esiste solo il frame 390px. Su schermi larghi la colonna del Login resta al massimo 400px, centrata.
- **Link**: "Password dimenticata?" e "Registrati" sono testi in Figma; li ho resi link. "Registrati" ha lo stesso stile della frase, come nel design.
- **Form**: la card è un `<form>` con submit sul bottone Accedi; "Continua con Google" è un link.
- **Larghezze**: Input (326px) e Button (auto) in Figma hanno larghezza fissa; nel codice l'Input riempie il contenitore, il Button lo fa con `fullWidth`.
- **Valori non variabili**: dal 2026-11-10 dimensioni dei testi e padding sono variabili Figma e l'ombra è uno stile di effetto; restano fissi i pesi dei testi e lo spessore dei bordi (1px).
- **iOS**: i campi hanno testo a 15px come in Figma; Safari su iPhone zooma sugli input sotto i 16px.
