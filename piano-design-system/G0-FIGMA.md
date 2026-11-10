# G0 — Correzioni da fare in Figma

Elenco delle differenze tra il file Figma attuale e le regole del disegno di [GENERATORE.md](GENERATORE.md#le-regole-del-disegno-figma), per Button, Input e Card. Ricavato il 2026-11-10 dai dati già salvati in `figma-storybook/figma/` (letti in ottobre con l'MCP, prima della decisione di non usare AI): servono solo a preparare questa lista. La conferma definitiva la darà `figma:lint` (G2) sul primo export del plugin (G1).

Le correzioni le fa il designer, a mano, in Figma. Stato: `da fare` / `fatto` / `accettato come avviso` (con il motivo).

## Variabili da creare

| Variabile proposta | Valore | Usata da | Stato |
|---|---|---|---|
| `font/size-sm` | 13 | Input › etichetta | da fare |
| `font/size-md` | 15 | Button › testo, Input › testo del campo, Card › testo | da fare |
| `font/size-lg` | 20 | Card › titolo | da fare |
| `space/sm-plus` (o un nome scelto dal designer) | 12 | Button › padding verticale | da fare |
| `space/md-plus` (o un nome scelto dal designer) | 14 | Input › Field › padding verticale | da fare |
| `border/width` | 1 | bordi di Button Secondary, Input › Field, Card | da fare, oppure accettato come avviso (uno spessore di 1px fisso è una scelta comune) |

I nomi sono proposte: decide il designer, il tool li traduce con la regola dei nomi (`font/size-md` → `--font-size-md`).

## Per componente

### Button (`1:22`)

| # | Regola | Cosa c'è oggi | Correzione | Stato |
|---|---|---|---|---|
| B1 | R-D2 | padding verticale 12 non legato | legarlo alla variabile da 12 | da fare |
| B2 | R-D3 | dimensione del testo 15 non legata | `font/size-md` | da fare |
| B3 | R-D4 | i livelli di testo (`1:19`, `1:21`) non hanno un nome proprio | chiamarli `Label` in entrambe le varianti | da fare |
| B4 | R-D2 | bordo di Secondary spesso 1, non legato | `border/width` o avviso | da fare |
| B5 | R-D6 | gli stati non sono disegnati: oggi `:focus-visible` è scritto a mano | facoltativo: proprietà `State` con `Default`, `Hover`, `Focus`; altrimenti resta in `button.extra.css` | da decidere |

### Input (`1:23`)

| # | Regola | Cosa c'è oggi | Correzione | Stato |
|---|---|---|---|---|
| I1 | R-D3 | etichetta 13, testo del campo 15 non legati | `font/size-sm`, `font/size-md` | da fare |
| I2 | R-D2 | padding di `Field` 14/16 non legati | 16 → `space/md` (esiste già); 14 → variabile nuova | da fare |
| I3 | R-D4 | i livelli di testo (`1:24`, `1:26`) non hanno un nome proprio | `Label` e `Placeholder` | da fare |
| I4 | R-D2 | bordo di `Field` spesso 1 | `border/width` o avviso | da fare |
| I5 | R-D6 | lo stato focus non è disegnato (oggi scritto a mano) | facoltativo: `State` = `Default`, `Focus`; altrimenti `input.extra.css` | da decidere |

### Card (`44:10`)

| # | Regola | Cosa c'è oggi | Correzione | Stato |
|---|---|---|---|---|
| C1 | R-D8 | `Image` è un frame con riempimento colore `surface/background` | riempimento immagine (un'immagine di esempio) | da fare |
| C2 | R-D5 | immagine, testo e bottone sono facoltativi solo nel codice | proprietà BOOLEAN `Show image`, `Show text`, `Show button` | da fare |
| C3 | R-D3 | titolo 20, testo 15 non legati | `font/size-lg`, `font/size-md` | da fare |
| C4 | R-D4 | i livelli di testo (`44:14`, `44:15`) non hanno un nome proprio | `Title` e `Text` | da fare |
| C5 | R-D2 | ombra scritta come valore (`0 4px 16px 0 rgba(15, 23, 41, 0.06)`) | stile di effetto `shadow/card` | da fare |
| C6 | R-D2 | bordo spesso 1 | `border/width` o avviso | da fare |
| C7 | R-D7 | il Button annidato è un'istanza con `Label` esposta | nessuna: già corretto | fatto |

## Fuori da G0

- **Login (`1:27`)**: è una schermata, non un componente; nel piano diventa un esempio (modulo esempi, F6). Per ora resta scritta a mano e non passa dal generatore.
- **Tertiary**: si disegna in G5, come prova del tool.

## Fatto in G0 nel repo

- Telemetria di Storybook spenta: `core: { disableTelemetry: true }` in `figma-storybook/.storybook/main.js`.
- Tolto il controllo online delle versioni all'avvio (`--no-version-updates` nello script `storybook`): era una chiamata verso internet, trovata provando l'avvio.
- Entrambi verificati dalla skill `check-modifiche` ("telemetria Storybook"). Provato l'avvio: Storybook parte e il browser chiede file solo a `localhost`.
