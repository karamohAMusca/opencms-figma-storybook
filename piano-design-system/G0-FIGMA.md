# G0 — Correzioni da fare in Figma

Elenco delle differenze tra il file Figma attuale e le regole del disegno di [GENERATORE.md](GENERATORE.md#le-regole-del-disegno-figma), per Button, Input e Card. Ricavato il 2026-11-10 dai dati già salvati in `figma-storybook/figma/` (letti in ottobre con l'MCP, prima della decisione di non usare AI): servono solo a preparare questa lista. La conferma definitiva la darà `figma:lint` (G2).

**Aggiornato il 2026-11-10 con il primo export vero del plugin** (`figma-storybook/figma/export/`): dove i dati dell'MCP erano incompleti (per esempio non riportavano i nomi dei livelli di testo), fa fede l'export.

Le correzioni le fa il designer, a mano, in Figma. **Sul file di prova** le ha applicate Claude il 2026-11-10 con l'MCP di Figma, su richiesta: è una modifica al disegno, a monte del tool; estrazione e generazione restano senza AI, e la verifica la fanno il plugin e `figma:lint`. Ogni valore è uguale a prima (variabili con gli stessi numeri, immagine dello stesso colore), quindi l'aspetto non cambia. Stato: `da fare` / `fatto` / `accettato come avviso` (con il motivo).

## Variabili da creare

| Variabile proposta | Valore | Usata da | Stato |
|---|---|---|---|
| `font/size-sm` | 13 | Input › etichetta | fatto (collezione nuova `Tipografia`) |
| `font/size-md` | 15 | Button › testo, Input › testo del campo, Card › testo | fatto |
| `font/size-lg` | 20 | Card › titolo | fatto |
| `space/sm-plus` | 12 | Button › padding verticale | fatto (collezione `Spaziature`) |
| `space/md-minus` | 14 | Input › Field › padding verticale | fatto (nome cambiato: 14 è sotto `space/md` = 16) |
| `border/width` | 1 | bordi di Button Secondary, Input › Field, Card | da fare, oppure accettato come avviso (uno spessore di 1px fisso è una scelta comune) |

I nomi sono proposte: decide il designer, il tool li traduce con la regola dei nomi (`font/size-md` → `--font-size-md`).

## Per componente

### Button (`1:22`)

| # | Regola | Cosa c'è oggi | Correzione | Stato |
|---|---|---|---|---|
| B1 | R-D2 | padding verticale 12 non legato | legato a `space/sm-plus` | fatto |
| B2 | R-D3 | dimensione del testo 15 non legata | legata a `font/size-md` | fatto |
| B3 | R-D4 | i livelli di testo (`1:19`, `1:21`) | si chiamano già `Label` (lo mostra l'export) | fatto |
| B4 | R-D2 | bordo di Secondary spesso 1, non legato | `border/width` o avviso | da fare |
| B5 | R-D6 | gli stati non sono disegnati: oggi `:focus-visible` è scritto a mano | facoltativo: proprietà `State` con `Default`, `Hover`, `Focus`; altrimenti resta in `button.extra.css` | da decidere |

### Input (`1:23`)

| # | Regola | Cosa c'è oggi | Correzione | Stato |
|---|---|---|---|---|
| I1 | R-D3 | etichetta 13, testo del campo 15 non legati | legati a `font/size-sm`, `font/size-md` | fatto |
| I2 | R-D2 | padding di `Field` 14/16 non legati | 16 → `space/md`, 14 → `space/md-minus` | fatto |
| I3 | R-D4 | i livelli di testo (`1:24`, `1:26`) | si chiamano già `Label` e `Placeholder` (export) | fatto |
| I4 | R-D2 | bordo di `Field` spesso 1 | `border/width` o avviso | da fare |
| I5 | R-D6 | lo stato focus non è disegnato (oggi scritto a mano) | facoltativo: `State` = `Default`, `Focus`; altrimenti `input.extra.css` | da decidere |

### Card (`44:10`)

| # | Regola | Cosa c'è oggi | Correzione | Stato |
|---|---|---|---|---|
| C1 | R-D8 | `Image` è un rettangolo con riempimento colore `surface/background` (export) | riempimento immagine: PNG 1×1 del colore `surface/background`, quindi aspetto invariato | fatto |
| C2 | R-D5 | immagine, testo e bottone sono facoltativi solo nel codice | proprietà BOOLEAN `Show image`, `Show text`, `Show button` (predefinite: vero) legate alla visibilità dei tre livelli | fatto |
| C3 | R-D3 | titolo 20, testo 15 non legati | legati a `font/size-lg`, `font/size-md` | fatto |
| C4 | R-D4 | `44:14` si chiama già `Title`; `44:15` ha come nome tutto il testo ("Accedi alla nuova area…") | rinominato `Text` | fatto |
| C5 | R-D2 | ombra scritta come valore (`0 4px 16px 0 rgba(15, 23, 41, 0.06)`) | stile di effetto `shadow/card` creato e applicato | fatto |
| C6 | R-D2 | bordo spesso 1 | `border/width` o avviso | da fare |
| C7 | R-D7 | il Button annidato è un'istanza con `Label` esposta | nessuna: già corretto | fatto |

## Verifica dopo le correzioni (2026-11-10)

Nuovo export di Button, Input e Card con il plugin, importato con `figma:import`: `figma:lint` dà **0 errori e 3 avvisi** (B4, I4, C6: bordi da 1px). Nei JSON cambiano solo i legami alle variabili, il nome `Text`, le proprietà `Show …` e il riempimento di `Image`; gli screenshot di Button e Input sono identici byte per byte a quelli di prima.

## Altro emerso dall'export

- **Variabili non usate finora**: `brand/primary-hover` (`#4338ca`) esiste in Figma ma non in `tokens.json`, che oggi contiene solo le variabili usate dal Login (`get_variable_defs` sul nodo `1:27`). Con F2/G4 `tokens.json` verrà da `variables.json` e le comprenderà tutte.
- **Mode**: la collezione `Colori` ha il mode `Light`, `Spaziature` il mode predefinito `Mode 1`. Rinominare `Mode 1` (per esempio `Default`) è facoltativo, ma i nomi dei mode diventeranno nomi di temi (F2).
- **Card › Button**: l'istanza annidata ha `Label` = "Scopri di più" e `Variant` = Primary, ed è esposta: è ciò che serve al generatore (C7).

## Fuori da G0

- **Login (`1:27`)**: è una schermata, non un componente; nel piano diventa un esempio (modulo esempi, F6). Per ora resta scritta a mano e non passa dal generatore.
- **Tertiary**: si disegna in G5, come prova del tool.

## Fatto in G0 nel repo

- Telemetria di Storybook spenta: `core: { disableTelemetry: true }` in `figma-storybook/.storybook/main.js`.
- Tolto il controllo online delle versioni all'avvio (`--no-version-updates` nello script `storybook`): era una chiamata verso internet, trovata provando l'avvio.
- Entrambi verificati dalla skill `check-modifiche` ("telemetria Storybook"). Provato l'avvio: Storybook parte e il browser chiede file solo a `localhost`.
