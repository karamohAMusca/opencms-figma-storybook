# Struttura finale dei moduli

Come saranno i moduli del Design System alla fine del piano (F6, F7, F11). Nomi dei moduli decisi il 2026-11-10 (D1; `organizzazione` è un segnaposto). Le classi CSS mantengono il prefisso `fx-` (D1). I punti che dipendono dall'indagine F5 sono segnati.

## I tre tipi di modulo

| Modulo | Contiene | Dipende da | In produzione |
|---|---|---|---|
| **core** (`nz.organizzazione.module.ds`) | Content type, schemi, formatter, JSP, include, etichette `it`/`en`, configurazione master, CSS **strutturale** dei componenti (solo variabili CSS, nessun valore di colore o font), eventuale JS dei componenti | Mercury | sì |
| **tema** (`nz.organizzazione.module.theme.<nome>`), uno per tema | Token del tema, font, immagini e icone del tema, CSS e JS minificati del tema (F7), il plugin del sito che lo attiva | core, in un intervallo di versioni (vedi [VERSIONI.md](VERSIONI.md)) | sì, uno o più |
| **esempi** (`nz.organizzazione.module.examples`) | La schermata Login come composizione di componenti, la pagina di prova `/fx-test/`, contenuti di esempio | core e almeno un tema | no |

Perché così: il core cambia quando cambiano i componenti, un tema quando cambiano colori e font. Separati, un sito può cambiare tema senza toccare i contenuti, e un tema nuovo non richiede di rilasciare il core.

## Dove nasce ogni file

Tutto si genera da `figma-storybook/` (o dal motore in `engine/`, da F4). Nei moduli non si scrive niente a mano, come oggi.

```
figma-storybook/
  figma/                  dati Figma salvati: manifest, metadata, design context, screenshot per tema, tokens.json (temi)
  src/components/<nome>/  <nome>.template.js, <nome>.css, <nome>.opencms.js, <Nome>.stories.js   →  core
  src/patterns/<nome>/    composizioni (Login): template e story                                 →  esempi
  src/docs/               pagine MDX: concetto, standard, guide (F10)
ds.config.json            prefisso, lingue, moduli, temi (F1)

moduli generati:
  nz.organizzazione.module.ds/             componenti (vedi "Cartelle di un modulo")
  nz.organizzazione.module.theme.<nome>/   resources/css/tokens.css  resources/fonts/  resources/dist/<nome>.min.css (.js, .map)  plugins/<nome>.xml
  nz.organizzazione.module.examples/       formatters/ e resources/jsp/ del Login, contenuti della pagina di prova
```

## Cartelle di un modulo

Deciso il 2026-11-10 (D1): le cartelle standard di OpenCms per ciò che OpenCms cerca per tipo, `resources/` per i file serviti. Esempio del modulo dei componenti:

```
nz.organizzazione.module.ds/
  .config                         configurazione del modulo (content type)
  configuration/                  configurazione master del sito
  schemas/card.xsd                uno schema per content type
  formatters/card.formatter       configurazione del formatter, punta al JSP in resources/jsp/
  i18n/…messages_it, …messages_en etichette
  resources/
    jsp/card.jsp                  formatter ed elementi inclusi (oggi in formatters/ ed elements/)
    css/components.css            CSS strutturale dei componenti
    js/                           JS dei componenti, se servono
```

Rispetto a oggi cambia la posizione dei JSP: da `formatters/*.jsp` ed `elements/fx-input.jsp` a `resources/jsp/`. Si fa in F6, insieme alla divisione dei moduli.

## Il contratto dei token

È la regola che permette di separare core e temi: **il CSS del core usa solo variabili, ogni tema le definisce tutte**.

- L'elenco delle variabili richieste si ricava dai CSS dei componenti (ogni `var(--…)` usata).
- Un controllo automatico (F2) fallisce se un tema non ne definisce una, o se il CSS del core contiene un colore o un font scritto direttamente.
- Un tema può definire variabili in più (per i suoi asset), non in meno.
- Aggiungere una variabile al contratto è un cambiamento del core: richiede una versione nuova del core e l'aggiornamento di tutti i temi (vedi [VERSIONI.md](VERSIONI.md)).

## Come si sceglie il tema in un sito

**Da confermare con F5 (decisione D3).** Ipotesi di partenza, coerente con come `dev.py` registra oggi i CSS:

- il modulo del tema contiene un **plugin del sito** che punta al suo CSS (e JS) minificato;
- la configurazione del sito o del sottosito aggiunge il plugin del tema scelto;
- due sottositi possono usare due temi diversi con lo stesso core e gli stessi contenuti.

Resta da decidere in F5 il rapporto con il tema di Mercury: i nostri token si aggiungono sopra il tema Mercury del sito (come oggi, con classi `fx-` che non collidono) oppure lo sostituiscono in parte.

## Cosa cambia per chi sviluppa

| Oggi | Dopo il piano |
|---|---|
| `python sync_tokens.py` | `npm run tokens` (tutti i temi) |
| Un modulo, `dev.py` lo sincronizza | Più moduli, `dev.py` li sincronizza tutti, un aggiornamento completo alla volta |
| Componente nuovo: dati Figma con l'MCP, template e CSS scritti a mano | plugin `fx-export` in Figma, poi `figma:sync`: nessuna AI, file generati ([GENERATORE.md](GENERATORE.md)) |
| Tre CSS non minificati in OpenCms | Un CSS (e un JS) minificato per tema; in sviluppo i file non minificati |
| Versione che cresce a ogni installazione locale | Versione semver al rilascio, `-dev.N` in locale |
| `compare:opencms` su un tema | `compare:opencms` su ogni tema |
