# Le fasi

Ogni fase parte dal risultato verificato della precedente, salvo F5 (indipendente, prima di F6). Dimensione: **S** poche ore, **M** una sessione, **L** più sessioni. Le regole comuni (impronta dei file generati, verifiche visive per tema) sono nel [README](README.md#regole-di-tutto-il-piano).

## F0 — Ancora di non regressione e pulizia · S

**Impronta.** Si salvano le impronte (hash) di tutti i file generati del modulo: `resources/css/*.css`, i JSP, gli `.xsd`, i `.formatter`, le etichette, `.config`, la configurazione master. `npm run golden` le confronta con quelle salvate; `npm run golden -- --update` le riscrive, solo nelle fasi che cambiano l'output e scrivendo il motivo nelle note della fase.

**Pulizia.** Si cancellano gli zip vecchi in `dist/` e `dev.log` (file locali, ignorati da git). Il content type `fx-login` per ora resta: si sposta in F6, insieme agli altri cambi del modulo, per non cambiare l'output due volte.

Verifica: `golden` passa su `develop` e fallisce se si cambia un byte di un file generato (lo si prova una volta con una modifica di prova).

## F1 — Un solo file di configurazione · M

Era P1. Si introduce `ds.config.json`, letto sia dagli script Node sia da quelli Python, e si sostituiscono con le sue voci le costanti elencate nei capitoli 1, 2, 6 e 8 di [ACCOPPIAMENTI.md](ACCOPPIAMENTI.md). Rispetto a P1, la configurazione nasce già con **più moduli e più temi**, anche se per ora c'è un modulo e un tema solo.

| Voce | Valore di oggi |
|---|---|
| `prefix` | `fx` (o quello scelto con D1) |
| `languages` | `["it", "en"]` |
| `modules.core` | `{ "name": "it.progetti.figma", "dir": "../it.progetti.figma", "typeIdStart": 20001 }` |
| `modules.themes` | `{ "default": { "name": "it.progetti.figma", "dir": "../it.progetti.figma" } }`: per ora lo stesso modulo del core |
| `mercury` | `containerTypes: ["element", "m-element"]`, `formatterRank: 1000` |
| `storybook.url` | `http://localhost:6007` |
| `fonts.imports` | letti da `src/index.css` |

Cosa si tocca: `build_module.py`, `devtools/config.py`, `sync_tokens.py`, `export-opencms.mjs`, `jsp.mjs`, `xml.mjs`, `test-opencms.mjs`, `compare-opencms.mjs`, `testpage.py`.

Verifica: `golden` identico; `test:opencms`, `check:figma`, `visual` e la skill `check-modifiche` passano; cambiando il prefisso nella configurazione cambiano i file generati (prova su una copia, poi si scarta).

Rischio: il prefisso è anche nei CSS dei componenti, scritti a mano. Qui si rende configurabile ciò che il motore genera (formatter, contenitore, chiavi). Se con D1 si cambia prefisso, la sostituzione nei CSS si fa una volta, in F6, insieme alla divisione dei moduli.

## F2 — Tutte le variabili Figma, token per tema · M

**Lettura da Figma.** Con una sola chiamata `use_figma` si leggono **tutte** le collezioni di variabili, con tutti i mode (un mode = un tema, secondo D2), e si salvano in `figma/tokens.json` in un formato nuovo:

```json
{
  "source": { "date": "…", "collections": ["…"] },
  "themes": { "default": { "brand/primary": "#4f46e5", "…": "…" }, "<secondo tema>": { "…": "…" } },
  "styles": { "font/family": "…", "font/line-height": "…", "shadow/card": "…" }
}
```

I valori che non sono variabili Figma (`styles`) restano scritti a mano, come oggi. Se un tema li cambia, possono stare anche dentro `themes`.

**Generazione in Node.** Un comando `npm run tokens` (al posto di `sync_tokens.py`) scrive un `tokens-<tema>.css` per ogni tema, con gli stessi nomi di oggi (`brand/primary` → `--brand-primary`). Il tema `default` produce lo stesso `tokens.css` di oggi, a parte l'intestazione.

**Storybook.** Un selettore del tema nella barra in alto (un "global" di Storybook) carica i token del tema scelto. La story dei token mostra tutti i temi affiancati. `visual` confronta ogni story con lo screenshot Figma del suo tema: servono gli screenshot del secondo tema, una chiamata per componente.

**Contratto dei token.** Un controllo (dentro `check:figma` o un `npm run check:tokens`) verifica che ogni tema definisca **tutte** le variabili usate dai CSS dei componenti. È la regola che terrà insieme core e temi in F6 (vedi [STRUTTURA.md](STRUTTURA.md#il-contratto-dei-token)).

Verifica: `golden` cambia solo nell'intestazione di `tokens.css`; `visual` entro il 2% per tutti i temi; togliendo una variabile da un tema il controllo del contratto fallisce.

Rischio: D2. Se il piano Figma non permette più mode, i temi arrivano da più collezioni o da pagine diverse: cambia solo la lettura, non il formato di `tokens.json`.

## F3 — Registro dei tipi di campo, componenti trovati dai loro file · M

Era P2 più P4.

**Registro.** Una voce per tipo di campo (`field`, `link`, `image`) dice in un posto solo: il tipo dello schema, l'editor, cosa scrive il JSP, come lo simula il test, come si scrive nel contenuto della pagina di prova. I quattro punti del capitolo 5 di [ACCOPPIAMENTI.md](ACCOPPIAMENTI.md) leggono dal registro. Si aggiungono i tipi che servono ai componenti del Design System: testo ricco, scelta da elenco, casella da spuntare, lista ripetibile.

**Componenti dai file.** I componenti si trovano cercando i `*.opencms.js`, non più passando dal manifest Figma; l'ordine viene dalla configurazione. Il manifest resta per `check:figma` e `visual`.

**Casi di prova dalle story.** L'elenco dei casi di `compare-opencms.mjs` (oggi scritto a mano) deriva da una voce `example` nei `*.opencms.js`: un componente nuovo entra nel confronto senza toccare gli script.

Verifica: `golden` identico; si aggiunge un tipo di prova (per esempio un numero) toccando una voce sola, e un componente di prova lo usa fino al confronto in OpenCms; poi si rimuove.

Rischio: le liste ripetibili richiedono cicli nel JSP e probabilmente un nodo nuovo nel linguaggio dei template. È il punto che può slittare: se serve, si sposta in una fase a parte.

## F4 — Il motore diventa una cartella autonoma · M

Era P3. `scripts/opencms/`, `export-opencms.mjs`, `test-opencms.mjs`, `compare-opencms.mjs`, `src/template.js`, `src/opencms.js` e le parti Python (`devtools/`, `build_module.py`) si spostano in `engine/`, con il suo `package.json` e i suoi comandi (`export`, `check`, `test`, `compare`, `tokens`, `golden`). I componenti importano `template` e `opencms` dal motore invece che con percorsi relativi.

Cosa si tocca: tutti i `*.template.js` e `*.opencms.js` (una riga di import ciascuno), gli script `npm`, `CLAUDE.md`, `README.md`, la skill `check-modifiche`.

Verifica: `golden` identico; nessun file del motore resta dentro `figma-storybook/src/` o `scripts/`.

## F5 — Indagine: temi di Mercury, plugin del sito e minificazione · S

È il "verificare per bene come fare" dell'obiettivo. Non si scrive codice del Design System: si prova su OpenCms locale e si scrive l'esito in una nota (`piano-design-system/INDAGINE-F5.md`).

Domande:

1. **Come gestisce i temi Mercury?** Il CSS del tema Mercury viene da una build SCSS: dove sta, come si sceglie per sito, e se i nostri temi devono **affiancarlo** (i nostri token sopra a Mercury) o **sostituirlo** in parte.
2. **Come si sceglie un tema per sito.** Plugin del sito aggiunti nella configurazione del sito o del sottosito (`AddPlugins`), proprietà sulla cartella, o altro. Si prova con due sottositi che usano due plugin diversi (risponde a D3).
3. **Come OpenCms serve CSS e JS.** Cache, intestazioni, se esiste già un'unione o minificazione lato server (per non farla due volte), come forzare l'aggiornamento dopo un rilascio (nome con la versione o con un hash).
4. **Strumenti.** Lightning CSS ed esbuild sui CSS e JS di oggi: dimensioni prima e dopo, e se il risultato passa `compare:opencms` (risponde a D4).
5. **Font.** Quali pesi usano davvero i componenti (oggi se ne caricano 4 × 2 sottoinsiemi), se conviene ridurre i glifi, e la licenza OFL di Inter nella distribuzione minificata.

Verifica: la nota risponde alle cinque domande con prove fatte, non con ipotesi; D3 e D4 sono decise.

## F6 — Il modulo unico si divide in core, temi ed esempi · L

La forma finale è in [STRUTTURA.md](STRUTTURA.md). In breve:

- **core**: content type, schemi, formatter, JSP, etichette, CSS **strutturale** dei componenti (usa solo variabili CSS, nessun valore di tema).
- **un modulo per tema**: token, font, eventuali immagini e icone del tema, il plugin del sito che lo attiva.
- **esempi**: la schermata Login (ex `fx-login`, ora composizione di componenti), la pagina di prova `/fx-test/`, contenuti di esempio. Non si installa in produzione.

L'export scrive in più cartelle di modulo secondo la configurazione; `dev.py` e `build_module.py` gestiscono più moduli (un aggiornamento completo per modulo, mai due insieme: la regola di `PROBLEMI.md` resta). `compare:opencms` gira **per ogni tema**: installa core e tema, attiva il tema nella pagina di prova, confronta con le story di quel tema. Se con D1 cambiano nomi o prefisso, la sostituzione si fa qui, una volta.

Cosa si tocca: export, `build_module.py`, `devtools/` (watcher, aggiornamento completo, pagina di prova, registrazione dei CSS), `compare-opencms.mjs`, configurazione master, README del modulo, `CLAUDE.md`.

Verifica: `golden -- --update` con la nota di cosa si è spostato dove; un OpenCms vuoto con core e un tema installati supera `compare:opencms`; cambiando tema la pagina di prova supera il confronto con le story dell'altro tema; il core da solo non contiene valori di colore né font (controllo automatico sul CSS del core).

Rischio: i contenuti già creati con i content type `fx-*` nell'OpenCms locale. Sono solo contenuti di prova: se cambiano i nomi dei tipi (D1) si ricreano, non si migrano.

## F7 — Build per tema, minificata · M

Con gli strumenti scelti in F5 (D4), `npm run build:themes` produce per ogni tema, dentro il modulo del tema:

```
resources/dist/<tema>.min.css   token + @font-face + CSS dei componenti, minificato
resources/dist/<tema>.min.js    solo se i componenti hanno JS (oggi no)
resources/dist/*.map            mappe dei sorgenti, per il debug
resources/fonts/                solo i pesi e i sottoinsiemi usati
```

Un solo plugin per tema al posto dei tre CSS di oggi. In sviluppo (`dev.py`) restano i file non minificati, per vedere subito le modifiche; la build minificata si usa nella pagina di prova e nei rilasci. Il modo di forzare l'aggiornamento della cache (versione o hash nel nome) è quello deciso in F5.

Verifica: `compare:opencms` entro il 2% con i file minificati, per ogni tema; un report delle dimensioni (prima/dopo) per tema; il CSS minificato del tema contiene tutte le variabili del contratto.

## F8 — Generatore Figma → Storybook · L

È lo "strumento automatico" della precondizione. Due passi separati, così il generatore funziona anche senza Figma raggiungibile:

1. **Lettura** (`figma:pull <node-id>`, secondo D5): legge da Figma metadata, design context, screenshot per ogni tema e la voce del manifest, e li salva in `figma/`. Con l'MCP la esegue Claude con le stesse chiamate della Card; con la REST API uno script.
2. **Scheletro** (`npm run figma:scaffold <componente>`): dai file salvati genera la cartella del componente con:
   - `*.template.js` con la struttura dei livelli Figma come nodi di `template.js`, e le proprietà Figma come `props`;
   - `*.css` con i valori già trasformati in variabili (un colore `#4f46e5` diventa `var(--brand-primary)` se coincide con un token, altrimenti resta e viene segnalato);
   - `*.stories.js` con una story per variante del manifest;
   - `*.opencms.js` con il content type proposto (testi → `field`, immagini → `image`, istanze di componenti annidati → i loro campi, come il Button nella Card).

Lo scheletro è un punto di partenza: lo sviluppatore rifinisce template e CSS. `check:figma`, `visual` e `test:opencms` dicono quando è pronto.

Verifica: rigenerando lo scheletro della Card dai file già salvati, `check:figma` e `test:opencms` passano senza ritocchi e `visual` resta sotto una soglia larga (da fissare, per esempio 10%); il report del generatore elenca i valori che non corrispondono a token.

Rischio: il design context di Figma è codice React/Tailwind indicativo. Il generatore deve leggere metadata e variabili più che quel codice; dove non basta, lo scheletro lascia un commento invece di indovinare.

## F9 — Prova: un componente nuovo solo con il generatore · M

Come la Card in `PIANO.md`, ma con lo strumento: un componente nuovo (per esempio Alert o Badge, con almeno due varianti e un campo di un tipo nuovo di F3) disegnato in Figma con le variabili esistenti, portato con `figma:pull` e `figma:scaffold`, rifinito, esportato, provato in OpenCms con tutti i temi.

Criteri di riuscita: nessun file del motore modificato per questo componente; nessun XML o JSP scritto a mano; `visual` e `compare:opencms` entro il 2% in ogni tema; il tempo e i ritocchi necessari sono annotati (servono per la documentazione e per migliorare il generatore).

## F10 — Documentazione nello Storybook · M

Lo Storybook diventa la fonte della documentazione, così da non mantenerla in due posti:

- **Concetto**: cos'è il Design System, come sono fatti i moduli, come si sceglie un tema (pagina MDX).
- **Standard**: prefisso e nomi delle classi, mobile first, uso dei token (mai valori fissi), altezza di riga, accessibilità, come si aggiunge un componente (il percorso di F9), come si aggiunge un tema.
- **Fondamenta**: token per tema (la story di oggi, estesa), tipografia, spaziature.
- **Per ogni componente**: varianti, proprietà, campi e impostazioni in OpenCms. Questa parte si genera dai `*.opencms.js`, così resta allineata.

Lo Storybook si pubblica (D7) con `build-storybook`.

Verifica: ogni componente ha la sua pagina con la tabella OpenCms generata; uno sviluppatore che non conosce il progetto aggiunge un componente seguendo solo lo Storybook (prova con una persona o con una sessione di Claude senza contesto).

## F11 — Versioni e rilasci dei moduli · M

Dettaglio in [VERSIONI.md](VERSIONI.md). In breve: ogni modulo (core, ogni tema) ha una versione semver decisa al rilascio e un `CHANGELOG`; il tema dichiara con quali versioni del core è compatibile; un comando `npm run release` costruisce gli zip minificati di tutti i moduli da un commit pulito; più avanti la CI fa lo stesso a ogni tag Git. L'aumento automatico della patch di `dev.py` resta solo per lo sviluppo locale, con un suffisso (per esempio `1.2.0-dev.7`), così non si confonde con un rilascio.

Prerequisito: D8 (licenza), se i moduli escono dal progetto.

Verifica: un rilascio di prova produce gli zip, che importati in un OpenCms vuoto superano `compare:opencms`; un tema con un core incompatibile viene segnalato prima dell'installazione; la skill `check-modifiche` controlla che negli zip non ci siano `.env`, chiavi o password.

## F12 — Pubblicazione su Confluence e approvazione · M

Secondo D6. Dalle pagine di F10 si ricavano le pagine Confluence (concetto, standard, esempi, un indice dei componenti con link allo Storybook pubblicato e alle versioni dei moduli). La pubblicazione si fa con un comando, non copiando a mano, così a ogni rilascio si aggiorna.

L'approvazione segue il processo dello spazio Confluence scelto; le osservazioni ricevute diventano modifiche allo Storybook (la fonte), non alle pagine Confluence.

Verifica: le pagine esistono, puntano alla versione corrente; un secondo rilascio le aggiorna senza interventi a mano; l'approvazione è registrata in Confluence.

## Dopo F12

- Il motore portabile in altri progetti (zip o `npm`, ex P6-P8): vedi [README](README.md#fuori-da-questo-piano).
- Installazione dei moduli su OpenCms diversi da Docker Alkacon.
