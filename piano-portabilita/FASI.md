# Le fasi

Ordine fisso: ogni fase parte dal risultato verificato della precedente. Dimensione: **S** poche ore, **M** una sessione, **L** più sessioni. Prima di P1 si crea l'ancora di non regressione (sotto).

## Ancora di non regressione (prima di P1)

Si salvano le impronte (hash) di tutti i file generati del modulo: `resources/css/components.css`, `fonts.css`, i JSP, gli `.xsd`, i `.formatter`, le etichette, `.config`, la configurazione master. Un comando `npm run golden` le confronta con quelle salvate. Da qui fino a P6 deve restare verde: **le fasi riorganizzano, non cambiano l'output**.

Verifica: il comando esiste, passa su `develop` oggi, e fallisce se si cambia un byte di un file generato (lo si prova una volta con una modifica di prova).

## P1 — Un solo file di configurazione · M

Si introduce `opencms-export.config.json`, letto sia dagli script Node sia da quelli Python, e si sostituiscono con le sue voci le costanti elencate nei punti 1, 2, 6 e 8 di [ACCOPPIAMENTI.md](ACCOPPIAMENTI.md).

Contenuto minimo del file:

| Voce | Esempio (questo progetto) |
|---|---|
| `module.name` | `it.progetti.figma` |
| `module.dir` | `../it.progetti.figma` |
| `module.prefix` | `fx` |
| `module.languages` | `["it", "en"]` |
| `module.typeIdStart` | `20001` |
| `mercury.containerTypes`, `formatterRank` | `["element", "m-element"]`, `1000` |
| `storybook.url` | `http://localhost:6007` |
| `fonts.imports` | letti da `src/index.css` |

Cosa si tocca: `build_module.py`, `devtools/config.py`, `sync_tokens.py`, `export-opencms.mjs`, `jsp.mjs`, `xml.mjs`, `test-opencms.mjs`, `compare-opencms.mjs`, `testpage.py`.

Verifica: `golden` verde (nessun file generato cambia); i test `test:opencms`, `check:figma`, `visual` e la skill `check-modifiche` passano; cambiando il prefisso nella configurazione, i file generati cambiano di conseguenza (prova su una copia, poi si scarta).

Rischio: il prefisso `fx-` è anche nei CSS scritti a mano dei componenti. Si rende configurabile ciò che il motore genera (formatter, contenitore, chiavi), non si riscrivono i CSS dei componenti.

## P2 — Registro dei tipi di campo · M

Si crea un registro: una voce per tipo (`field`, `link`, `image`) che dice, in un posto solo, il tipo dello schema, l'editor, cosa scrive il JSP, come lo simula il test, come si scrive nel contenuto della pagina di prova. I quattro punti del capitolo 5 di [ACCOPPIAMENTI.md](ACCOPPIAMENTI.md) leggono dal registro.

Poi si aggiungono i tipi che mancano a un secondo progetto (decisione al momento, in base ai componenti reali): testo ricco, scelta da elenco, casella da spuntare, lista ripetibile.

Verifica: `golden` verde; si aggiunge un tipo di prova (per esempio un numero) toccando una voce sola e un componente di prova lo usa fino al confronto in OpenCms; poi si rimuove.

Rischio: le liste ripetibili cambiano il modo di scrivere il JSP (cicli): possono richiedere un nodo nuovo nel linguaggio dei template. Sono l'unico punto della fase che può slittare.

## P3 — Il motore diventa una cartella autonoma · M

`figma-storybook/scripts/opencms/`, `export-opencms.mjs`, `test-opencms.mjs`, `compare-opencms.mjs`, `src/template.js`, `src/opencms.js` e le parti Python (`devtools/`, `build_module.py`) si spostano in `engine/`, con il suo `package.json` e i suoi comandi (`export`, `check`, `test`, `compare`). I componenti importano `template` e `opencms` dal motore invece che con percorsi relativi.

Decisione D1: la forma del pacchetto (cartella o `npm`) si fissa qui, perché cambiano gli import.

Cosa si tocca: tutti i `*.template.js` e `*.opencms.js` (una riga di import ciascuno), gli script `npm` del progetto, `CLAUDE.md`, `README.md`, la skill `check-modifiche`.

Verifica: `golden` verde; il progetto funziona importando il motore; nessun file del motore resta dentro `figma-storybook/src/` o `scripts/`.

## P4 — Componenti trovati dai loro file, Figma opzionale · M

Si trovano i componenti cercando i `*.opencms.js` (con l'ordine dalla configurazione), non più passando dal manifest Figma. `check-figma`, `visual-compare` e `sync_tokens.py` restano ma diventano un modulo facoltativo: attivo solo se la configurazione indica un manifest Figma.

Decisione D2 (Figma resta nello strumento, come parte opzionale).

Verifica: `golden` verde con Figma attivo; in una copia senza cartella `figma/` e senza manifest, l'esportazione, il test dei JSP e la build del modulo funzionano.

Rischio: i token. Senza Figma i `tokens.css` vanno scritti a mano o forniti da altra fonte: lo strumento non li genera, deve solo accettarli.

## P5 — Pagina di prova generica e destinazione a scelta · L

Due parti.

**Casi di prova dalle story.** Oggi `compare-opencms.mjs` ha l'elenco dei casi scritto a mano. Si fa derivare da una voce `example` nei `*.opencms.js` (props, story da confrontare, selettore, file da caricare). Un componente nuovo entra nel confronto senza toccare gli script.

**Destinazione di installazione come interfaccia.** `full_update.py` e `testpage.py` oggi assumono l'immagine Docker di Alkacon (capitolo 7 di [ACCOPPIAMENTI.md](ACCOPPIAMENTI.md)). Si isola in un "adattatore" con quattro operazioni: installa il modulo, esegui uno script nella shell di OpenCms, riavvia, leggi e scrivi file via WebDAV. Si consegna l'adattatore `alkacon-docker` (comportamento di oggi). Gli altri (per esempio OpenCms su server remoto, dove si importa lo zip a mano da Launchpad) si aggiungono solo se servono (decisione D4).

Si rendono configurabili anche sito, cartella e progetto di prova, e la pagina modello di Mercury. Se la pagina modello manca, si genera una pagina minima senza intestazione.

Verifica: `golden` verde; `compare:opencms` passa invariato su questo progetto; si aggiunge un componente di prova con un `example` e compare nel confronto senza modificare script; l'adattatore è l'unico file che nomina `docker`.

Rischio: è la fase più lunga, perché tocca il codice che parla con OpenCms e si prova solo con OpenCms acceso (riavvii inclusi).

## P6 — Pacchetto: zip, installazione, versione, controllo · M

Dettaglio in [DISTRIBUZIONE.md](DISTRIBUZIONE.md). In breve: un comando costruisce lo zip del motore con versione e checksum, uno script `install` lo monta in un progetto (prerequisiti, copia, configurazione di partenza, script `npm`), un comando `doctor` dice quale versione è installata e se i file del motore sono stati modificati.

Prerequisiti: decisioni D1, D5, D6 (la licenza, se lo zip esce dal progetto).

Verifica: si scompatta lo zip in una cartella vuota, si lancia `install`, `doctor` risponde correttamente; lo zip non contiene `.env`, chiavi Figma, password né contenuti di questo progetto (la skill `check-modifiche` lo verifica).

## P7 — Prova su un secondo progetto · M

È la fase che dimostra la portabilità. Si crea un piccolo progetto di prova in una cartella vuota (decisione D3): un Storybook con due o tre componenti, un altro nome di modulo (per esempio `it.esempio.prova`) e un altro prefisso (`ex-`). Si installa **dallo zip di P6**, si scrive la configurazione e si esegue l'intero percorso: esportazione, test dei JSP, installazione in un OpenCms vuoto, confronto con le story.

Criteri di riuscita, tutti obbligatori:

1. Nessun file del motore viene modificato nel progetto di prova.
2. Esportazione, `test`, `check` e `compare` passano.
3. Il modulo di prova e `it.progetti.figma` convivono nello stesso OpenCms senza conflitti (nomi, id dei content type, plugin).
4. Tutto ciò che si deve cambiare per far funzionare il secondo progetto è registrato: se è una cosa del motore, torna a P1-P5 come difetto.

Verifica: l'elenco dei difetti trovati e la loro correzione, e il rilancio completo da una cartella vuota.

## P8 — Automazione · M

Si porta in una pipeline ciò che si è fatto a mano. A ogni rilascio (un tag Git) una pipeline di CI esegue gli stessi controlli di P7 su un progetto di prova (senza OpenCms: esportazione, test dei JSP, `golden`, build del modulo; il confronto in OpenCms resta locale o su un runner con Docker), costruisce lo zip con lo stesso comando di P6 e lo allega al rilascio. Se D1 lo prevede, costruisce anche il pacchetto `npm`.

Verifica: un tag di prova produce un rilascio con lo zip, e lo zip scaricato supera `install` + `doctor` su una cartella vuota.

## Dopo P8

- Aggiornare la skill `check-modifiche` per i progetti che usano il motore (controlli a livello di progetto, non del motore).
- Documentare come si aggiorna la versione del motore in un progetto già installato.
