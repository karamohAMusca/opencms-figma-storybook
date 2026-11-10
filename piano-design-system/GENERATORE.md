# Il generatore Figma → Storybook (priorità)

Deciso il 2026-11-10: è la **prima parte** del Design System su cui concentrarsi, prima delle fasi F1-F12. Le fasi si chiamano **G0…G6** e sostituiscono F8 e F9 di [FASI.md](FASI.md).

## Obiettivo

Uno strumento che da un componente Figma genera i suoi file in Storybook (`*.template.js`, `*.css`, `*.stories.js`, voce del manifest, token), **senza AI e in modo deterministico**:

1. **Nessuna AI, in nessun passo.** Né l'estrazione né la generazione usano Claude, l'MCP di Figma o un altro modello. Solo codice scritto nel repo, che esegue regole scritte nel repo.
2. **Deterministico.** Stesso file Figma → stessi file generati, **byte per byte**, a ogni esecuzione e su ogni macchina. Nessuna scelta presa al momento, né da un programma né da una persona: ogni decisione viene da una regola di questo documento.
3. **Si ferma invece di indovinare.** Tutto ciò che le regole non prevedono è un errore, con il livello Figma e la regola da rispettare. Il tool sa fare un elenco chiuso di cose; il resto lo rifiuta.
4. **Adatto a dati sensibili.** Nessun dato esce verso servizi nuovi: il tool non ha accesso alla rete, non ha dipendenze esterne, si può leggere per intero in una revisione di sicurezza e far girare su una macchina senza internet.

Nota sullo sviluppo: il codice del tool si può scrivere con qualsiasi strumento (anche con Claude, come questo piano). Ciò che conta è il risultato: una volta nel repo, il tool gira da solo, senza AI, e il suo comportamento si verifica con i test di questo piano, non fidandosi di chi l'ha scritto.

## Requisiti: niente AI, dati sensibili

| Requisito | Come si rispetta | Come si verifica |
|---|---|---|
| Nessuna AI | Non si usa l'MCP di Figma (`use_figma`, `get_design_context`, `get_screenshot`, `get_variable_defs`) né altri servizi AI. I dati salvati in passato con l'MCP (`figma/design-context/`, `metadata.xml`, gli screenshot) non sono usati dal tool e si eliminano in G4 | nessun riferimento all'MCP nel codice del tool; un componente si genera su una macchina senza Claude installato |
| Nessuna rete | Il plugin dichiara `"networkAccess": { "allowedDomains": ["none"] }`; i comandi Node non aprono connessioni | controllo automatico: il codice del tool non contiene `fetch`, `XMLHttpRequest`, `http`, `https`, `net`, `dns`, `child_process` |
| Nessuna dipendenza | Plugin in JavaScript semplice, senza build; comandi Node con la sola libreria standard | il `package.json` del tool non ha dipendenze; il controllo sopra lo verifica |
| Niente dati che escono da Storybook | Telemetria di Storybook spenta (`core: { disableTelemetry: true }`; **oggi è attiva**). Embed live di Figma solo se si configura `FIGMA_FILE_KEY`: in un sistema sensibile non si configura | `.storybook/main.js` controllato dalla skill `check-modifiche` |
| Nessun dato inutile negli export | Il JSON contiene solo ciò che serve a generare: niente chiave del file Figma, niente utenti, niente commenti, niente date | schema del JSON (G1) senza quei campi |

L'unico servizio esterno resta Figma, dove il disegno sta già. `visual` e `compare:opencms` girano in locale; Playwright scarica Chromium una volta, al primo uso, senza inviare dati.

## Com'è oggi (2026-11-10)

Il percorso è **assistito**: Claude legge Figma con l'MCP e salva l'output in `figma-storybook/figma/`; template, CSS e story si scrivono a mano guardando quei file; `check:figma` e `visual` dicono se il risultato è giusto. Va cambiato perché:

1. **Usa l'AI** per leggere Figma (MCP) e una persona o Claude per scrivere il codice.
2. **La fonte non è stabile**: `get_design_context` restituisce codice React + Tailwind "di riferimento", la cui forma può cambiare tra versioni del server. Non si può costruire una conversione byte per byte sopra un testo che non controlliamo.
3. **Metà delle decisioni non sta in Figma.** Confrontando i dati salvati con il codice di Button, Input e Card:

| Deciso a mano oggi | Esempio | Da dove verrà |
|---|---|---|
| Tag HTML | `article`, `h3`, `p`, `img`, `label`, `input` | `rules.json` |
| Parti facoltative | testo e bottone della Card | proprietà BOOLEAN in Figma |
| Proprietà che Figma non ha | `image`, `imageAlt`, `buttonHref`, `type`, `name`, `required` | `rules.json` |
| Comportamento | il Button diventa `<a>` se c'è `href` | `rules.json` |
| Larghezza nella pagina | la Card è `100%` invece di `342px` | regola fissa sulla radice (R-L5) |
| Correzioni per Mercury | `margin: 0`, `font-family: inherit`, colori ripetuti su `:hover`, `box-shadow: none`, `max-width: none` | tabella dei tag del tool |
| Stati non disegnati | `:focus-visible` del Button, `:focus` dell'Input | variante `State` in Figma, o `extra.css` |
| Valori non legati a variabili | `font-size` 13/15/20, `padding` 12 e 14/16 | variabili in Figma (G0) |

## Come funziona

```
 Figma (app desktop)                     repo, offline, solo Node
┌───────────────────────┐   file    ┌───────────┐   ┌──────────────┐   ┌──────────────────────────┐
│ plugin "fx-export"    │ ────────► │ figma/    │──►│ figma:lint   │──►│ figma:generate           │
│ (codice nel repo,     │  JSON +   │ export/   │   │ regole R-*   │   │ tabelle di mappatura     │
│  senza rete)          │  PNG      │           │   │ errore = stop│   │ → src/components/<nome>/ │
└───────────────────────┘           └───────────┘   └──────────────┘   │ → manifest, tokens.json  │
                                         ▲                             └──────────────────────────┘
                     src/components/<nome>/<nome>.rules.json (semantica, scritto a mano)
```

### Passo 1 — Estrazione: il plugin `fx-export`

Un plugin Figma **in sviluppo**: una cartella del repo (`figma-storybook/figma-export/`) che si collega una volta all'app desktop di Figma con *Plugins → Development → Import plugin from manifest…*. Non si pubblica, funziona su ogni piano (Starter compreso), legge i file dalla cartella a ogni esecuzione (un `git pull` lo aggiorna).

| File | Contenuto |
|---|---|
| `manifest.json` | nome, `code.js`, `ui.html`, nessun accesso alla rete |
| `code.js` | legge il componente selezionato e le variabili con la Plugin API, normalizza, prepara JSON e PNG |
| `ui.html` | una finestra con "Esporta": salva i file sul computer (download dal browser interno di Figma) |
| `VERSION` | versione del plugin, scritta in ogni export |

Uso: si seleziona un componente o un set di varianti, si clicca "Esporta", si salvano i file in `figma-storybook/figma/export/`.

Cosa produce, per un componente `card`:

| File | Contenuto |
|---|---|
| `card.json` | il componente (sotto) |
| `card.<variante>.png` | screenshot 1x di ogni variante (o del componente), con `exportAsync`: sostituisce `get_screenshot` |
| `variables.json` | tutte le variabili locali, per collezione e mode (un file per tutto il file Figma) |

Struttura di `card.json` (esempio ridotto e indicativo; il formato esatto è `figma-storybook/figma-export/schema.json`, dove ogni valore che può essere legato a una variabile è `{ "value": …, "var": "…" }`):

```json
{
  "exporter": "1.0.0",
  "schema": 1,
  "component": { "name": "Card", "nodeId": "44:10", "kind": "COMPONENT" },
  "properties": {
    "Title": { "type": "TEXT", "default": "Scopri le novità" },
    "Show button": { "type": "BOOLEAN", "default": true }
  },
  "variants": [],
  "render": { "width": 342, "height": 368, "bounds": [-16, -12, 374, 400] },
  "tree": {
    "name": "Card", "type": "FRAME",
    "layout": { "mode": "VERTICAL", "gap": 0, "padding": [0, 0, 0, 0], "main": "MIN", "cross": "MIN", "clip": true },
    "size": { "w": "FIXED", "h": "HUG", "width": 342 },
    "fill": { "var": "surface/card", "value": "#ffffff" },
    "stroke": { "var": "border/default", "value": "#e2e8f0", "weight": 1, "align": "INSIDE" },
    "radius": { "var": "radius/lg", "value": 16 },
    "effects": [{ "type": "DROP_SHADOW", "style": "shadow/card", "value": "0 4px 16px 0 rgba(15, 23, 41, 0.06)" }],
    "children": [ "…" ]
  }
}
```

Regole di normalizzazione (perché due esportazioni diano gli stessi byte):

- chiavi in ordine alfabetico, figli nell'ordine dei livelli di Figma, indentazione di 2 spazi, fine riga LF, un a capo finale;
- numeri arrotondati a 2 decimali, senza zeri finali; colori in `#rrggbb` minuscolo, o `rgba(r, g, b, a)` se c'è trasparenza;
- ogni valore legato a una variabile porta il **nome** della variabile (`brand/primary`) e il valore risolto nel mode predefinito;
- nomi delle proprietà senza il suffisso che Figma aggiunge (`Label#1:5` → `Label`);
- solo i campi dell'elenco chiuso dello schema: un campo nuovo richiede una versione nuova dello schema;
- **nessuna data, nessun utente, nessuna chiave del file**.

### Passo 2 — Controllo: `npm run figma:lint`

Legge i JSON in `figma/export/` e i `rules.json`, e applica le regole del disegno (sotto). Un errore ferma tutto e dice dove: `Card › Body › Texts: auto layout mancante (R-D1)`. Gli avvisi non fermano la generazione e finiscono nel report.

### Passo 3 — Generazione: `npm run figma:generate [componente]`

Legge i JSON, i `rules.json` e le tabelle di mappatura (sotto), e scrive:

| File | Contenuto |
|---|---|
| `src/components/<nome>/<nome>.template.js` | albero dei livelli → nodi di `src/template.js` |
| `src/components/<nome>/<nome>.css` | stili dei livelli, più le correzioni della tabella dei tag |
| `src/components/<nome>/<Nome>.stories.js` | una story per variante, più quelle di `rules.json` |
| `src/components/<nome>/<nome>.js` | il collegamento a Storybook (`render(template, props)`), come oggi |
| `figma/manifest.json` | voce del componente: nome, node-id, varianti, proprietà, default, screenshot |
| `figma/tokens.json` (parte `variables`) | dalle variabili di `variables.json` |

Ogni file generato comincia con un'intestazione fissa: `GENERATO da figma/export/<nome>.json (sha256 <impronta>) con figma:generate <versione>: non modificare a mano`. L'impronta lega il file al suo export. Con `--check` il comando non scrive niente ed esce con 1 se un file non coincide con quello che genererebbe.

Restano **scritti a mano**, di proposito:

| File | Perché |
|---|---|
| `<nome>.rules.json` | la semantica che Figma non sa esprimere (tag, link, proprietà in più) |
| `<nome>.opencms.js` | il collegamento a OpenCms (content type, campi): il generatore lo crea solo se manca, poi non lo tocca |
| `<nome>.extra.css` (facoltativo) | ciò che non si può disegnare in Figma (per esempio la larghezza piena del Button nel Login); viene accodato al CSS generato, e `figma:lint` controlla che usi solo variabili |

## Le regole del disegno (Figma)

Sono il contratto con chi disegna. Vanno nella documentazione per i designer (F10, F12).

| # | Regola | Se non rispettata |
|---|---|---|
| R-D1 | Ogni frame del componente usa l'**auto layout**: niente posizioni assolute, rotazioni, vincoli | errore |
| R-D2 | Colori, spaziature, raggi e spessori dei bordi sono **legati a variabili** | avviso fino a G5, poi errore |
| R-D3 | La tipografia usa **variabili** (dimensione, peso) e la famiglia dei token | avviso fino a G5, poi errore |
| R-D4 | I **nomi dei livelli** sono univoci in tutto il componente: diventano le classi (`Body` → `fx-card__body`) | errore |
| R-D5 | Il testo modificabile è una **proprietà TEXT**; ciò che può sparire è una **proprietà BOOLEAN** | il livello resta fisso, avviso |
| R-D6 | Le varianti sono **proprietà VARIANT**. La proprietà `State` (valori `Default`, `Hover`, `Focus`, `Disabled`) è speciale: diventa pseudo-classi, non classi | errore se un valore non è ammesso |
| R-D7 | Un componente dentro un altro è un'**istanza** di un componente che ha già i suoi file generati, con le proprietà esposte | errore |
| R-D8 | Un'immagine è un livello con **riempimento immagine** | errore se il livello ha `tag: img` in `rules.json` e non ha riempimento immagine |
| R-D9 | Solo ciò che le tabelle sotto sanno tradurre: un riempimento solido o immagine per livello, un bordo uniforme interno, ombre esterne, nessuna maschera, nessun gradiente, nessuna modalità di fusione | errore, con la caratteristica non ammessa |

## Le tabelle di mappatura

Sono la "conoscenza" del tool: stanno nel codice come dati, ognuna con i suoi test. Una caratteristica Figma che non compare qui è un errore (R-D9).

### Nomi

| Da Figma | Diventa | Esempio |
|---|---|---|
| nome del componente | cartella e file in minuscolo con trattini; classe radice con prefisso `fx-` | `Card` → `card/`, `fx-card` |
| nome di un livello | classe BEM piatta: `fx-<componente>__<livello>` | `Texts` → `fx-card__texts` |
| valore di variante | modificatore in minuscolo: `fx-<componente>--<valore>` | `Primary` → `fx-button--primary` |
| nome di proprietà | camelCase | `Button label` → `buttonLabel` |
| nome di variabile | variabile CSS | `brand/primary` → `--brand-primary` |

Trasformazione dei nomi: minuscole, lettere accentate senza accento, spazi e `/` → `-`, tolto tutto il resto. Due nomi che danno lo stesso risultato sono un errore (R-D4).

### Auto layout e dimensioni

| Figma | CSS |
|---|---|
| auto layout orizzontale / verticale | `display: flex; flex-direction: row` / `column` |
| spaziatura fra elementi | `gap` |
| padding | `padding` (1, 2 o 4 valori, la forma più corta) |
| allineamento sull'asse principale `MIN/CENTER/MAX/SPACE_BETWEEN` | `justify-content: flex-start/center/flex-end/space-between` |
| allineamento sull'asse trasversale `MIN/CENTER/MAX/BASELINE` | `align-items: flex-start/center/flex-end/baseline` |
| figlio *fixed* | `width`/`height` in px |
| figlio *hug* | nessuna dimensione |
| figlio *fill*, nella direzione del genitore | `flex: 1 1 0` |
| figlio *fill*, nella direzione trasversale | `align-self: stretch` |
| ritaglia il contenuto | `overflow: hidden` |
| **radice** *fixed* in larghezza (R-L5) | `width: 100%`: il componente prende la larghezza del contenitore; la misura Figma diventa la larghezza della story |
| **radice** *hug* | `display: inline-flex` |

Ogni regola CSS ha `box-sizing: border-box` quando il livello ha bordo o padding (come Figma, dove il bordo interno conta nella misura).

### Aspetto

| Figma | CSS |
|---|---|
| riempimento solido | `background: var(--…)` (o il valore, con avviso R-D2) |
| riempimento immagine | il livello diventa `<img>` (R-D8); `object-fit` dalla modalità di riempimento (`FILL` → `cover`, `FIT` → `contain`) |
| bordo uniforme, interno | `border: <spessore>px solid var(--…)` |
| raggio | `border-radius` (1 o 4 valori) |
| ombra esterna (o stile di effetto) | `box-shadow: var(--<stile>)` se lo stile è un token, altrimenti il valore con avviso |
| opacità del livello | `opacity` |

### Testo

| Figma | CSS / template |
|---|---|
| famiglia | `font-family: var(--font-family)`; una famiglia diversa da quella dei token è un errore |
| dimensione | `font-size: var(--…)` (o px con avviso R-D3) |
| peso (`Regular`, `Medium`, `Semi Bold`, `Bold`) | `font-weight: 400/500/600/700` |
| altezza di riga *auto* | `line-height: var(--font-line-height)` (regola di `CLAUDE.md`) |
| altezza di riga in px | `line-height` in px |
| colore | `color: var(--…)` |
| allineamento | `text-align` (solo se non è a sinistra) |
| testo legato a una proprietà TEXT | `prop('<nome>')` |
| testo fisso | il testo così com'è |

### Proprietà e componenti

| Figma | Template |
|---|---|
| VARIANT | `mod('fx-<componente>--', prop('<nome>'))`, opzioni in minuscolo, default di Figma |
| VARIANT `State` | regole CSS con `:hover`, `:focus-visible`, `:disabled` invece di classi |
| TEXT | `prop`, default di Figma |
| BOOLEAN che mostra/nasconde un livello | `when(prop('<nome>'), …)` |
| istanza di un altro componente | `use(<componente>, { … })` con le proprietà esposte e le varianti fissate dall'istanza |
| CSS delle varianti | quello della variante predefinita va sulla classe base; per le altre varianti solo le dichiarazioni **diverse**, sotto il modificatore |

### Tabella dei tag (correzioni per Mercury)

Elenco chiuso dei tag ammessi in `rules.json`, ognuno con le dichiarazioni aggiunte sempre, nello stesso ordine. Raccoglie le correzioni che oggi sono ripetute a mano nei CSS dei componenti.

| Tag | Aggiunte fisse |
|---|---|
| `div`, `section`, `article`, `header`, `footer` | nessuna |
| `h1`…`h6`, `p`, `span` | `margin: 0; font-family: inherit; letter-spacing: normal` |
| `a` | colori ripetuti su `:hover` e `:focus`, `text-decoration: none` |
| `button` | `margin: 0; border: 0; cursor: pointer; font-family: inherit` |
| `img` | `display: block; max-width: none; margin: 0` |
| `label` | `margin: 0` |
| `input` | `margin: 0; font-family: inherit; box-shadow: none` |

Ordine delle dichiarazioni in ogni regola: un elenco fisso (posizione, display e flex, dimensioni, spaziature, sfondo e bordi, testo, effetti, altro), così due generazioni non possono mai differire per ordine.

## `rules.json`: la semantica, scritta a mano

Piccolo, uno per componente, accanto agli altri file. Dice solo ciò che Figma non può dire. `figma:lint` controlla che ogni livello e proprietà citati esistano nel JSON di Figma: se un designer rinomina un livello, il tool si ferma.

Card:

```json
{
  "root": { "tag": "article" },
  "layers": {
    "Image": { "tag": "img", "props": { "src": "image", "alt": "imageAlt" }, "optional": "image" },
    "Title": { "tag": "h3" },
    "Text": { "tag": "p" }
  },
  "props": {
    "image": { "default": "" },
    "imageAlt": { "default": "" },
    "buttonHref": { "default": "#", "to": "Button.href" }
  },
  "stories": { "SenzaImmagine": { "name": "Senza immagine", "args": { "image": "" } } }
}
```

Button: `{ "root": { "tag": "button", "linkWhen": "href" }, "props": { "href": {}, "type": { "default": "button" } } }`.

Input: il livello `Field` diventa `input` e il suo testo diventa l'attributo `placeholder` (con il colore del testo su `::placeholder`): `{ "layers": { "Label": { "tag": "label", "for": "Field" }, "Field": { "tag": "input", "textAs": "placeholder" } }, "props": { "type": { "default": "text" }, "name": {}, "required": { "default": false } } }`.

Le chiavi ammesse in `rules.json` sono un elenco chiuso, con uno schema: una chiave sconosciuta è un errore.

## Come si verifica

| Cosa | Come |
|---|---|
| Nessuna AI, nessuna rete, nessuna dipendenza | controllo sul codice del tool (vedi Requisiti), dentro `check-modifiche` |
| Determinismo dell'estrazione | due esportazioni dello stesso componente, anche da due computer, danno file identici |
| Determinismo della generazione | `figma:generate` lanciato due volte dà gli stessi byte; `npm run golden` copre anche i file generati in `src/components/` |
| Il tool fa ciò che dicono le tabelle | `npm run test:generator`: piccoli JSON di prova in `figma-export/test/fixtures/` con il risultato atteso accanto; una prova per ogni riga delle tabelle |
| Il tool rifiuta ciò che non sa fare | una prova che fallisce per ogni regola R-D* |
| Il risultato è giusto | i controlli di sempre: `check:figma`, `visual` (2%, sugli screenshot del plugin), `test:opencms`, `compare:opencms` (2%) |

## Le fasi

| # | Fase | Dim. | Stato |
|---|---|---|---|
| G0 | Preparazione: telemetria spenta, regole fissate, file Figma sistemato | S | in corso: repo fatto, correzioni in Figma da fare ([G0-FIGMA.md](G0-FIGMA.md)) |
| G1 | Plugin di estrazione `fx-export` e formato del JSON | M | in corso: primo export vero fatto, manca la prova di ripetibilità |
| G2 | `figma:lint`: le regole del disegno | S | fatto (codice e test); sugli export veri 1 errore da correggere in Figma |
| G3 | `figma:generate`: Button, poi Input, poi Card | L | da fare |
| G4 | I componenti attuali diventano generati, via i dati dell'MCP | M | da fare |
| G5 | Prova: variante Tertiary e un componente nuovo, solo con il tool | M | da fare |
| G6 | Un comando solo e i controlli nella skill | S | da fare |

### G0 — Preparazione · S

- Telemetria di Storybook spenta (`core: { disableTelemetry: true }` in `.storybook/main.js`).
- Regole R-D1…R-D9 e tabelle di questo documento confermate.
- Elenco delle correzioni da fare in Figma, ricavato dai dati già salvati (sezione "Com'è oggi"): variabili per `font-size` 13/15/20 e per i padding 12, 14, 16; proprietà BOOLEAN per immagine, testo e bottone della Card; riempimento immagine sul livello `Image`; eventualmente la variante `State` del Button e dell'Input. Le correzioni le fa il designer in Figma.

Verifica: telemetria spenta (controllo nella skill); l'elenco delle correzioni esiste e ogni voce è fatta o accettata come avviso, per scritto.

Stato (2026-11-10): telemetria e controllo delle versioni di Storybook spenti e verificati; elenco delle correzioni in [G0-FIGMA.md](G0-FIGMA.md), da fare in Figma.

### G1 — Plugin di estrazione · M

Si scrivono `figma-export/` (manifest, `code.js`, `ui.html`, `VERSION`) e lo schema del JSON (`figma-export/schema.json`). Si esportano Button, Input, Card e le variabili in `figma/export/`.

Verifica: due esportazioni identiche, anche da due computer diversi; i JSON rispettano lo schema; il manifest del plugin non ha accesso alla rete; il controllo "niente rete, niente dipendenze" passa su `figma-export/`.

Rischio: arrotondamenti diversi tra due esecuzioni (si risolvono nella normalizzazione); lo scaricamento dei file dal plugin, da provare subito con un JSON finto.

Stato (2026-11-10):
- Fatto: `figma-storybook/figma-export/` (manifest senza rete, `code.js`, `ui.html`, `schema.json`, `VERSION`, README); un solo zip per esportazione (senza compressione, data fissa) invece di più download; `npm run figma:import -- <zip>` (CRC, nomi ammessi, schema, forma canonica); `npm run test:export`, 43 controlli su un Figma simulato: stessi byte con chiavi in ordine diverso, schema, zip in andata e ritorno, errori attesi, niente rete né dipendenze. Il test fallisce se si toglie l'ordinamento delle chiavi, se si aggiunge un campo, se compare `fetch` nel plugin (provato).
- Fatto sul file vero (2026-11-10): plugin installato, Button, Input e Card esportati e importati in `figma-storybook/figma/export/` senza errori e senza correzioni al codice. I JSON rispettano lo schema e contengono ciò che serve al generatore: variabili legate per nome, proprietà, istanza annidata esposta (Button nella Card), margini dell'ombra (`render` della Card: -16, -12, 374, 400, come nel vecchio manifest). `test:export` (55 controlli) ora verifica anche gli export salvati: schema, forma canonica, LF, screenshot presenti. Quello che l'export ha mostrato sul file Figma è in [G0-FIGMA.md](G0-FIGMA.md).
- Da fare: la prova di ripetibilità. Con gli export committati, si esportano di nuovo Button, Input e Card (meglio da un secondo computer) e si importano: `git status` deve restare pulito. Se un file cambia, `git diff` mostra cosa: si corregge la normalizzazione e si aggiunge il caso al test.

### G2 — `figma:lint` · S

Si scrive `scripts/figma/lint.mjs` con lo schema di `rules.json`. Per ogni regola R-D* c'è un JSON di prova che la viola.

Verifica: gli export di G1 passano (con gli avvisi accettati in G0); ogni prova di violazione dà l'errore atteso, con livello e regola.

Stato (2026-11-10):
- Fatto: `scripts/figma/lint.mjs` (`npm run figma:lint [componente] [-- --strict]`) con R-D1…R-D9, il controllo delle variabili sconosciute e di `rules.json`; schema di `rules.json` in `scripts/figma/rules.schema.json` (elenco chiuso di chiavi e di tag). `npm run test:lint`: 52 controlli, almeno uno per regola, partendo dagli export veri modificati in memoria. Il test ha trovato un difetto del controllo della famiglia del font (cercava il nome anche tra i font di riserva, dove compare "Roboto"), corretto; togliendo una regola dal codice il test fallisce (provato).
- Sugli export veri: **1 errore, 18 avvisi**, gli stessi di [G0-FIGMA.md](G0-FIGMA.md). L'errore è il testo della Card con il nome automatico (C4): finché non si rinomina in Figma, `figma:lint` esce con 1. Gli avvisi sono i valori non legati a variabili (R-D2, R-D3), accettati fino a G5.
- `test:lint` è nella skill `check-modifiche`; `figma:lint` ci entra in G6, quando il file Figma sarà sistemato.

### G3 — `figma:generate` · L

Si scrive `scripts/figma/generate.mjs` con le tabelle come dati, un componente alla volta, in ordine di difficoltà:

1. **Button**: varianti, testo, `linkWhen`, CSS delle varianti per differenza;
2. **Input**: `label` e `input`, `textAs: placeholder`, proprietà in più;
3. **Card**: immagine facoltativa, BOOLEAN, istanza annidata del Button con proprietà esposta.

Il generatore scrive in una cartella di prova; i file di oggi restano dove sono.

Verifica: `test:generator` passa; per ogni componente l'HTML generato coincide con quello di oggi per tutti i casi di `test:opencms`, salvo differenze elencate e accettate; `visual` entro il 2%.

### G4 — I componenti diventano generati · M

- I file scritti a mano di Button, Input, Card sono sostituiti da quelli generati; le poche cose non disegnabili vanno in `extra.css`.
- `figma/manifest.json` e la parte `variables` di `figma/tokens.json` diventano generati dagli export (la parte `styles` resta scritta a mano finché non diventa variabili).
- `visual` usa gli screenshot del plugin.
- Si eliminano i dati dell'MCP: `figma/design-context/`, `figma/metadata.xml`, i vecchi screenshot, e in `CLAUDE.md` le istruzioni sulle chiamate MCP.
- `export:opencms` come sempre.

Verifica: `check:figma`, `visual`, `test:opencms`, `compare:opencms` entro il 2%; `npm run golden -- --update` con l'elenco delle differenze nei file del modulo e il motivo; nessun file del repo usato dal tool viene dall'MCP.

### G5 — Prova solo con il tool · M

1. **Tertiary**: il designer aggiunge la variante al Button in Figma; esporta; `figma:lint`, `figma:generate`. Nessun file scritto a mano cambia.
2. **Un componente nuovo** (per esempio Alert o Badge), disegnato secondo le regole: si scrivono solo `rules.json` e `opencms.js`.

Da qui gli avvisi R-D2 e R-D3 diventano errori.

Verifica: entrambi passano tutte le verifiche; ogni intervento a mano non previsto diventa una regola nuova (nelle tabelle, con la sua prova) o un difetto del tool.

### G6 — Un comando solo · S

`npm run figma:sync [componente]` = `figma:lint` + `figma:generate` + `check:figma` + `test:opencms`. Nella skill `check-modifiche` entrano `figma:generate --check`, `figma:lint`, `test:generator` e il controllo "niente AI, niente rete, niente dipendenze". L'estrazione resta un passo a parte, nell'app di Figma.

Verifica: su una macchina senza internet e senza Claude, da un export già salvato, `figma:sync` rigenera i componenti identici.

## Decisioni

| # | Domanda | Scelta |
|---|---|---|
| GD1 | Dove sta la semantica (tag, link, proprietà in più)? | In `rules.json` nel repo: il file Figma resta pulito, `figma:lint` tiene allineati i due. Si può rivedere in G0 |
| GD2 | Come si legge Figma? | **Deciso**: solo il plugin in sviluppo `fx-export`, senza rete. Niente MCP, niente REST API, niente AI |
| GD3 | Valori non legati a variabili? | Avviso fino a G5, poi errore. Si può rivedere in G0 |
| GD4 | I file generati si ritoccano a mano? | No: si cambia Figma, `rules.json` o `extra.css` e si rigenera. Si può rivedere in G0 |

## Cosa non fa

- Non genera i JSP: quelli li genera già `export:opencms` dal template, senza cambiamenti.
- Non decide la semantica né l'accessibilità: le prende da `rules.json`.
- Non interpreta disegni liberi: un componente che non rispetta le regole non si genera finché non viene sistemato in Figma.
