# figma-storybook

Componenti del file Figma «Esempio Claude × Figma»
ricavati **solo dal Figma**, in HTML + CSS + JS senza framework, con Storybook.

| Figma | Codice | Storie |
|---|---|---|
| Variabili | `src/tokens.css` (generato da `figma/tokens.json`) | Fondamenta/Token |
| Button (1:22) | `src/components/button/` | Componenti/Button |
| Input (1:23) | `src/components/input/` | Componenti/Input |
| Login – Mobile (1:27) | `src/screens/login/` | Schermate/Login |

## Export verso OpenCms

Questo Storybook è la fonte dei componenti del modulo OpenCms `it.progetti.figma` (piano in `PIANO.md` nella radice).

```
npm run export:opencms             # genera i file del modulo
npm run export:opencms -- --check  # esce con 1 se il modulo non è allineato
```

Genera:

- `resources/css/components.css`: i CSS dei componenti e delle schermate, nell'ordine di `figma/manifest.json`;
- i JSP: `formatters/fx-cta-button.jsp`, `elements/fx-input.jsp`, `formatters/fx-login.jsp`;
- per i componenti con un content type (`type` nel `*.opencms.js`): `schemas/*.xsd` (un elemento per ogni `field`/`link`, con i default dei testi presi dal template), `formatters/*.formatter` (una impostazione `select` per ogni `setting`/`settingIs`), le etichette in `i18n/`, `.config` e `configuration/figma.master.additions.xml`. Di quest'ultima si conserva il blocco `AddPlugins`, che aggiorna `dev.py` quando nasce un CSS.

Per un componente nuovo in OpenCms bastano quindi i suoi file in `src/` (template, opencms, css, stories) e la voce nel manifest: niente XML scritto a mano.

Ogni componente ha quattro file:

| File | Contenuto |
|---|---|
| `*.template.js` | markup e proprietà, scritti con i nodi di `src/template.js` (`h`, `prop`, `when`, `choose`, `use`, `cls`, `mod`, `concat`, `opt`): niente funzioni, perché ogni nodo deve avere un equivalente JSP |
| `*.js` | il componente per Storybook: CSS e `render(template, props)` |
| `*.opencms.js` | content type (`type`: nome, etichette, cartella, campo titolo), formatter o elemento, e da dove prende i valori il JSP: campi del contenuto (`field`, `link`, con etichetta e obbligatorietà), impostazioni (`setting`, `settingIs`, con opzioni), parametri di un elemento incluso (`param`), testo JSP (`raw`), costanti. Helper in `src/opencms.js` |
| `*.css` | stili |

Un componente usato da un altro (`use`) diventa `<cms:include>` se ha un proprio elemento JSP (Input), altrimenti viene espanso nel JSP di chi lo usa (Button nel Login).
`npm run test:opencms` esegue i JSP generati con un interprete minimo (`scripts/opencms/jsp-sim.mjs`) e confronta l'HTML con quello del template, per i default e per ogni opzione, sì/no e testo facoltativo vuoto: controlla la traduzione, non sostituisce la prova in OpenCms.
Le regole che servono solo dentro Mercury (colori ripetuti su `:hover`/`:focus` dei link, niente ombra sui campi, font dei titoli) stanno
nel CSS dei componenti, commentate. Classi con prefisso `fx-`. Con `dev.py` in ascolto, i file generati arrivano in OpenCms da soli.

## Dati Figma (`figma/`)

| File | Contenuto | Come si aggiorna |
|---|---|---|
| `metadata.xml` | struttura della pagina 🎨 Design (output grezzo di `get_metadata` 0:1) | si richiama il tool e si sostituisce |
| `manifest.json` | inventario: componenti, varianti, proprietà con default, istanze nel Login, node-id | a mano da `metadata.xml` e `design-context/` |
| `design-context/*.tsx` | output grezzo di `get_design_context` (React + Tailwind): **riferimento, non codice del progetto** | si richiama il tool sul node-id e si sostituisce |
| `screenshots/*.png` | render 1x dei nodi (stesse misure del canvas), riferimento per il confronto visivo | idem, insieme al design context |
| `tokens.json` | **fonte unica dei token**: `variables` (output di `get_variable_defs` 1:27) e `styles` (valori non variabili) | si sostituisce `variables`, poi `python sync_tokens.py` dalla cartella `opencms/` |

`src/tokens.css` e il `tokens.css` del modulo OpenCms sono generati da `sync_tokens.py`: non vanno modificati a mano
(`python sync_tokens.py --check` verifica che siano allineati).

## Story guidate dal manifest

`src/figma.js` legge `figma/manifest.json`:

- `figmaMeta('Button')` → `args` (default Figma), `argTypes` (categoria **Figma**: VARIANT → radio, TEXT → testo) e descrizione docs presa dal componente Figma;
- `figmaVariant('Button', 'Primary')` → una story per variante (`Variant=Primary` → `{ variant: 'primary' }`).

Entrambe aggiungono il parametro `design` di [`@storybook/addon-designs`](https://storybook.js.org/addons/@storybook/addon-designs): nel pannello **Design** di ogni story
ci sono l'embed Figma live del nodo (per le varianti, la singola variante) e lo screenshot salvato in `figma/screenshots/`
(servito come `/figma-screenshots/`, vedi `staticDirs` in `.storybook/main.js`).
L'embed live richiede di essere loggati a Figma con accesso al file; lo screenshot si vede sempre, anche nello Storybook statico.

Convenzioni: proprietà `Label` → arg `label`, opzione `Primary` → `'primary'`. Gli args che esistono solo nel codice vanno in categoria **Codice**.
Niente JSDoc sulla meta (`/** */` sopra `export default`): sostituirebbe la descrizione Figma.

I nomi delle story restano `export const` scritti nel file (Storybook li legge senza eseguire il codice). Se in Figma nasce una variante,
`npm run check:figma` fallisce finché non c'è la story corrispondente; lo stesso se un componente del manifest non ha story.

## Confronto visivo con Figma

Con Storybook acceso, `npm run visual` fotografa le story con Playwright (Chromium) e le confronta pixel per pixel con `figma/screenshots/` (pixelmatch).
Report in `visual-report/index.html` (Figma, story, differenze in rosso; il giallo è antialiasing e non conta).

- Varianti: ritaglio dello screenshot del component set (`position` + `size` nel manifest) ↔ story della variante.
- Componenti senza varianti e schermate: screenshot intero ↔ story `visualStory` del manifest. Le schermate con viewport grande quanto il frame.
- I componenti sono fotografati sullo sfondo del canvas Figma (`#e5e5e5`), come negli screenshot.
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
npm run visual           # confronto visivo con gli screenshot Figma (Storybook acceso)
```

## Decisioni prese dove il Figma non dice nulla

Da validare con il design:

- **Stati**: in Figma non ci sono hover, pressed, disabled né errori. Ho aggiunto solo il focus visibile (bordo/contorno `brand/primary`) e la sottolineatura dei link al passaggio.
- **Oltre il mobile**: esiste solo il frame 390px. Su schermi larghi la colonna del Login resta al massimo 400px, centrata.
- **Link**: "Password dimenticata?" e "Registrati" sono testi in Figma; li ho resi link. "Registrati" ha lo stesso stile della frase, come nel design.
- **Form**: la card è un `<form>` con submit sul bottone Accedi; "Continua con Google" è un link.
- **Larghezze**: Input (326px) e Button (auto) in Figma hanno larghezza fissa; nel codice l'Input riempie il contenitore, il Button lo fa con `fullWidth`.
- **Valori non variabili**: dimensioni e pesi dei testi e l'ombra della card non sono variabili Figma, sono valori fissi nel CSS.
- **iOS**: i campi hanno testo a 15px come in Figma; Safari su iPhone zooma sugli input sotto i 16px.
