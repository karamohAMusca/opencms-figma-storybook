# Versioni e rilasci dei moduli

Dettaglio di F11. Riprende l'idea del vecchio piano di portabilità: **il rilascio manuale e quello automatico usano gli stessi comandi**. Prima li lancia una persona, poi la CI.

## Oggi

`dev.py`, a ogni aggiornamento completo, aumenta la patch (`devtools/full_update.py:29`) e la scrive in `module-version.txt`. Gli zip si accumulano in `dist/` (1.0.0 … 1.0.7). La versione dice quante volte si è installato in locale, non cosa è cambiato. Non c'è changelog.

## Le regole

1. **Semver per modulo.** Core e ogni tema hanno la propria versione `MAGGIORE.MINORE.PATCH`:
   - **maggiore**: qualcosa che si rompe per chi usa il modulo (un campo tolto da un content type, una classe rinominata, una variabile aggiunta al contratto dei token);
   - **minore**: qualcosa di nuovo che non rompe (un componente nuovo, una variante, un tema che aggiunge asset);
   - **patch**: correzioni (un colore, un margine, un errore nel JSP).
2. **Il tema dichiara il core che supporta**, per esempio `core: ">=1.2.0 <2.0.0"`. L'installazione (o il rilascio) si rifiuta se le versioni non sono compatibili.
3. **Un `CHANGELOG.md` per modulo**, scritto al rilascio: cosa è cambiato, e per le versioni maggiori cosa deve fare chi aggiorna (per esempio rimettere un campo nei contenuti).
4. **In locale** la versione è quella del prossimo rilascio con un suffisso: `1.3.0-dev.7`. `dev.py` aumenta solo il numero dopo `dev`, così un'installazione locale non si confonde mai con un rilascio.
5. **Un rilascio parte solo da un commit pulito**: niente modifiche non committate, `golden`, `check:figma`, `test:opencms` e la skill `check-modifiche` verdi.

## Cosa dice il cambiamento di versione

| Cambiamento | Modulo | Versione |
|---|---|---|
| Componente nuovo | core | minore |
| Campo tolto o rinominato in un content type | core | maggiore |
| Variabile nuova nel contratto dei token | core e **tutti** i temi | maggiore del core; i temi la aggiungono e dichiarano il nuovo core |
| Colore di un tema cambiato | quel tema | patch (o minore se è un ritocco visibile del tema) |
| Tema nuovo | nuovo modulo | parte da `1.0.0` |
| Correzione di un JSP o di un CSS | core | patch |

## I comandi

| Comando | Cosa fa |
|---|---|
| `npm run release -- <modulo> <maggiore\|minore\|patch>` | Controlla le regole sopra, aggiorna la versione e il changelog (chiedendo il testo), costruisce lo zip minificato del modulo, crea il tag Git `<modulo>@<versione>` |
| `npm run release:check` | Solo i controlli: versioni coerenti, compatibilità core ↔ temi, contratto dei token, zip senza `.env`, chiavi o password |
| `python build_module.py …` | Resta il costruttore dello zip; riceve la versione invece di calcolarla |

## Dal manuale all'automatico

1. **F11**: i comandi sopra, lanciati a mano. Gli zip si passano a mano o si allegano a un rilascio GitHub.
2. **Dopo F11**: a ogni tag `<modulo>@<versione>` una pipeline di CI lancia `release:check`, costruisce lo zip con lo stesso comando e lo allega al rilascio. Il confronto in OpenCms (`compare:opencms`) resta locale, o su un runner con Docker se servirà. Niente di nuovo da scrivere nel motore: cambia solo chi esegue i comandi.
3. Lo stesso tag aggiorna lo Storybook pubblicato (D7) e le pagine Confluence (F12) con la versione nuova.

## Cosa non è risolto

- **Compatibilità con altre versioni di OpenCms**: si è provato solo su OpenCms 22 con Mercury. I moduli la dichiarano come versione supportata.
- **Aggiornare un sito con contenuti esistenti a una versione maggiore del core**: si documenta caso per caso nel changelog; una migrazione automatica dei contenuti è fuori piano.
- **Licenza (D8)**: senza licenza i moduli si possono installare nei propri progetti, ma non darli ad altri da riusare.
