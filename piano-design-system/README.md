# Piano: Design System

Obiettivo: un insieme di **moduli "design system"** per OpenCms in cui CSS, JS e asset sono ben organizzati, modulari, divisi per tema e versionati. In particolare:

1. **Storybook preparato da Figma con uno strumento automatico** (è la precondizione del resto).
2. **Moduli generali del Design System**: un modulo base con i componenti, un modulo per ogni tema.
3. **Documentazione su Confluence** (concetto, standard, esempi), da far approvare e condividere.
4. **Minificazione per tema** di CSS, JS e font, dopo aver verificato bene come farla con Mercury.

Questo piano segue `PIANO.md` (fasi 1-5, fatte il 2026-10-22: la pipeline Figma → Storybook → OpenCms funziona su un modulo e un tema). Sostituisce il piano di portabilità del 2026-10-23, che non era iniziato. Le sue fasi utili (P1-P4, parte di P5 e P6) sono riprese qui come fasi di base. Le fasi si chiamano **F0…F12** per non confonderle con quelle di `PIANO.md`.

Stato: `da fare` / `in corso` / `fatto`. Definito il 2026-11-10. Fatta F0 (2026-11-10).

## Cosa c'è in questa cartella

| File | Contenuto |
|---|---|
| [GENERATORE.md](GENERATORE.md) | **Priorità.** Il tool deterministico Figma → Storybook: estrazione, regole del disegno, generazione, fasi G0-G6 |
| [STRUTTURA.md](STRUTTURA.md) | Come saranno fatti i moduli alla fine: core, temi, esempi, file per modulo, contratto dei token, scelta del tema |
| [FASI.md](FASI.md) | Le tredici fasi, ciascuna con cosa si fa, cosa si tocca, come si verifica e i rischi |
| [VERSIONI.md](VERSIONI.md) | Versioni dei moduli, compatibilità fra core e temi, rilasci (prima manuali, poi da CI) |
| [ACCOPPIAMENTI.md](ACCOPPIAMENTI.md) | Ciò che oggi lega il motore a questo progetto, con file e riga, e in quale fase si risolve |

## Punto di partenza (2026-11-10)

| Tema dell'obiettivo | Com'è oggi |
|---|---|
| Figma → Storybook | **Assistito, non automatico**: i dati Figma (manifest, design context, screenshot) si scaricano con l'MCP e si salvano in `figma-storybook/figma/`. Template, CSS e story si scrivono a mano partendo da quei dati; `check:figma` e `visual` verificano il risultato |
| Token | 13 variabili lette con `get_variable_defs` da **un solo nodo** (`1:27`), più 3 valori scritti a mano (`styles`). Un solo insieme di valori: **nessun tema** |
| Moduli | **Un solo modulo**, `it.progetti.figma`, con dentro tutto: token, font, CSS, content type, e anche la schermata Login (`fx-login`), che non è un componente |
| CSS, JS, font in OpenCms | Tre CSS separati e **non minificati** (`tokens.css`, `fonts.css`, `components.css`), ognuno registrato come plugin del sito. Nessun JS. Otto file di font Inter (4 pesi × 2 sottoinsiemi) |
| Versioni | `dev.py` aumenta la patch a ogni aggiornamento completo (`devtools/full_update.py:29`): la versione segue l'installazione locale, non i rilasci. Nessun changelog |
| Documentazione | README in italiano, la story dei token, le pagine automatiche di addon-docs. Niente su Confluence |
| Verifiche | Solide: `check:figma`, `visual` (2%), `test:opencms` (25 casi), `compare:opencms` (2%), skill `check-modifiche` |

## Cosa si tiene, si toglie, si modifica

| | Cosa |
|---|---|
| **Si tiene** | I due file per componente (`*.template.js` e `*.opencms.js`); i generatori di JSP e XML; le quattro verifiche; Button, Input, Card; Docker, `start.ps1`, `dev.py`, `devtools/`; `build_module.py`; la skill `check-modifiche`; `PIANO.md` e `PROBLEMI.md` come storia |
| **Si toglie** | Il content type `fx-login` dal modulo del Design System: diventa un esempio di composizione nel modulo esempi (F6). Gli zip vecchi in `dist/` e `dev.log` (file locali, F0) |
| **Si sostituisce** | `sync_tokens.py` (Python) con la generazione dei token per tema in Node (F2); l'aumento automatico della versione, che resta solo per lo sviluppo locale (F11) |
| **Si modifica** | Il motore diventa configurabile e autonomo (F1, F3, F4); i token diventano multi-tema (F2); il modulo unico si divide (F6); si aggiungono la build minificata (F7), il generatore Figma → Storybook senza AI (G0-G6), la documentazione (F10, F12) e i rilasci (F11) |

## Priorità (2026-11-10)

Si parte dal **generatore Figma → Storybook**, un tool deterministico e **senza AI** (nessun MCP, nessun modello, nessuna rete): [GENERATORE.md](GENERATORE.md), fasi **G0-G6**. Prende il posto di F8 e F9 e si fa **prima** di F1-F12. Le altre fasi restano valide e ripartono dopo G6, con un'eccezione: F2 (token per tema) userà l'estrattore di G1 per leggere le variabili.

Ordine: F0 (fatta) → **G0 → G1 → G2 → G3 → G4 → G5 → G6** → F1 → F2 → … → F12. Stato (2026-11-10): G2, G3, G4 fatte; G0 e G1 quasi (decisioni sui bordi e sugli stati, prova di ripetibilità dell'export).

## Le fasi in una riga

| # | Filone | Fase | Dim. | Stato |
|---|---|---|---|---|
| F0 | Base | Ancora di non regressione e pulizia | S | fatto |
| F1 | Base | Un solo file di configurazione, pronto per più moduli e temi | M | da fare |
| F2 | Temi | Tutte le variabili Figma, token per tema, tema scelto in Storybook | M | da fare |
| F3 | Base | Registro dei tipi di campo, componenti trovati dai loro file | M | da fare |
| F4 | Base | Il motore diventa una cartella autonoma | M | da fare |
| F5 | Temi | Indagine: temi di Mercury, plugin del sito e minificazione | S | da fare |
| F6 | Moduli | Il modulo unico si divide in core, temi ed esempi | L | da fare |
| F7 | Moduli | Build per tema, minificata | M | da fare |
| F8 | Figma | Generatore Figma → Storybook: **sostituita da G0-G4** ([GENERATORE.md](GENERATORE.md)) | L | vedi G |
| F9 | Figma | Prova: un componente nuovo solo con il generatore: **sostituita da G5** | M | vedi G |
| F10 | Doc | Documentazione nello Storybook (concetto, standard, esempi) | M | da fare |
| F11 | Moduli | Versioni e rilasci dei moduli | M | da fare |
| F12 | Doc | Pubblicazione su Confluence e approvazione | M | da fare |

Dimensione: **S** poche ore, **M** una sessione, **L** più sessioni.

L'ordine delle F è pensato perché ogni fase parta da un risultato verificato. Nella prima versione il generatore stava dopo la divisione in moduli; dal 2026-11-10 viene prima (sezione Priorità): scrive nei percorsi di oggi, e in F6 si cambiano solo i percorsi di uscita. **F5 non dipende da niente**: si può fare in qualsiasi momento prima di F6.

## Regole di tutto il piano

1. **I file generati cambiano solo quando la fase lo dice.** Prima di F1 si salva l'impronta dei file generati (F0). Le fasi F1, F3 e F4 sono riorganizzazioni: l'impronta resta identica. Le fasi che cambiano l'output (F2, F6, F7) aggiornano l'impronta con un comando esplicito e scrivono nelle note della fase cosa è cambiato e perché.
2. **Le verifiche visive restano verdi a ogni fase**: `visual` (story ↔ Figma) e `compare:opencms` (OpenCms ↔ story) entro il 2%, **per ogni tema** da F2 in poi.
3. **I file generati non si modificano a mano**, come oggi. Lo stesso vale per i file prodotti dal generatore (G3): si cambia Figma o `rules.json` e si rigenera.
4. **Niente AI e dati sensibili** (dal 2026-11-10): i dati Figma si leggono con il plugin di estrazione, senza MCP né AI, e si salvano in `figma-storybook/figma/` (vedi [GENERATORE.md](GENERATORE.md#requisiti-niente-ai-dati-sensibili)). I dati già salvati con l'MCP restano come storia fino a G4, poi si eliminano.

## Decisioni da prendere

| # | Domanda | Consiglio | Quando serve |
|---|---|---|---|
| D1 | Nomi definitivi dei moduli e prefisso delle classi | **Nomi decisi il 2026-11-10**: `nz.organizzazione.module.ds` (tutti i componenti), `nz.organizzazione.module.theme.<nome>`, `nz.organizzazione.module.examples`; `organizzazione` è un segnaposto, si cambia nella configurazione di F1. Cartelle: quelle standard di OpenCms (`schemas/`, `formatters/`, `i18n/`, `.config`) più `resources/jsp`, `resources/css`, `resources/js` (vedi [STRUTTURA.md](STRUTTURA.md#cartelle-di-un-modulo)). **Prefisso delle classi: resta `fx-`** (da Figma; deciso il 2026-11-10, dopo aver valutato le classi senza prefisso, scartate per il rischio di collisioni con Mercury e Bootstrap). Le varianti si chiamano `primary`, `secondary`, `tertiary` (`fx-button--tertiary`; Tertiary va prima disegnata in Figma) | fatto |
| D2 | Quali temi e dove nascono in Figma | Un mode per tema nella collezione delle variabili, che è il modo standard di Figma. **Da verificare**: sul piano Starter le collezioni hanno un solo mode, quindi o si passa a un piano superiore o si usa una collezione (o una pagina) per tema. Serve almeno un secondo tema reale, anche piccolo, per provare tutto | prima di F2 |
| D3 | Come si sceglie il tema in OpenCms | Lo dice F5. Ipotesi di partenza: un plugin per tema, aggiunto nella configurazione del sito o del sottosito, così siti diversi usano temi diversi con lo stesso core | esito di F5, prima di F6 |
| D4 | Strumento di build e minificazione | Lo dice F5. Ipotesi: Lightning CSS per i CSS e esbuild per i JS (già nell'ecosistema Vite, che il progetto usa), senza strumenti nuovi se bastano | esito di F5, prima di F7 |
| D5 | Da dove legge Figma il generatore | **Superata da [GENERATORE.md](GENERATORE.md)**: uno script fisso sulla Plugin API, eseguito solo come plugin in sviluppo, senza AI né rete (decisione GD2) | prima di G1 |
| D6 | Confluence: spazio, chi approva, come si pubblica | Pagine Confluence con concetto, standard ed esempi, più il collegamento a uno Storybook pubblicato per gli esempi vivi. Servono: lo spazio, chi approva, un accesso (connettore o token API) | prima di F12 |
| D7 | Dove si pubblica lo Storybook | Un sito statico interno (`build-storybook`), aggiornato a ogni rilascio. Serve per la documentazione e per l'approvazione | prima di F10 |
| D8 | Licenza | **Serve prima di condividere fuori dal progetto** (oggi non c'è). Il repo è pubblico: senza licenza il codice è visibile ma non riutilizzabile | prima di F11 |

## Fuori da questo piano

- Altri CMS oltre a OpenCms, e un altro template al posto di Mercury.
- Installazioni di OpenCms diverse dall'immagine Docker di Alkacon (era la seconda parte di P5 nel piano di portabilità): si aggiungono quando serve installare i moduli altrove. Fino ad allora gli zip dei moduli si importano a mano (Launchpad).
- Portare il **motore** (non i moduli) in un altro progetto da uno zip o da `npm` (erano P6-P8): dopo F11, quando i moduli del Design System sono stabili. Le decisioni del vecchio piano (zip o `npm`, accesso al repo) restano valide per allora.
- Pubblicare pacchetti su un registro pubblico.
