# Distribuzione: dallo zip passato a mano alla pipeline automatica

Idea: lo zip non è una scorciatoia a parte, è il **primo formato** di ciò che poi costruirà la pipeline. Si fa una volta il comando che lo produce e lo script che lo installa; la pipeline li esegue al posto di una persona.

| | Oggi (manuale) | Domani (P8) |
|---|---|---|
| Costruzione | Una persona lancia `pack` | La CI lancia lo stesso `pack` a ogni tag |
| Consegna | Lo zip passato a mano | Lo stesso zip come allegato di un rilascio (e, se D1 lo prevede, un pacchetto `npm`) |
| Installazione | Una persona scompatta e lancia `install` | Lo stesso `install`, da script o da un comando |
| Controllo | `doctor` lanciato a mano | `doctor` nella CI del progetto che riceve il motore |

## Cosa contiene lo zip

```
opencms-storybook-export-<versione>/
  engine/               linguaggio dei template, registro dei campi, generatori JSP e XML,
                        esportazione, test dei JSP, confronto in OpenCms
  python/               parti che parlano con OpenCms: adattatore di installazione, pagina di prova,
                        build del modulo
  opencms-export.config.example.json
  INSTALL.md            una pagina
  VERSION
  CHANGELOG.md
  checksums.txt         impronta di ogni file del motore
```

Non contiene: `.env`, password, chiave Figma, `node_modules`, `dist/`, contenuti o componenti di questo progetto. La skill `check-modifiche` verifica queste esclusioni.

## I quattro comandi

| Comando | Cosa fa |
|---|---|
| `pack` | Costruisce lo zip da `engine/` e `python/`: versione da `VERSION`, checksum, changelog. Deterministico: due costruzioni dello stesso commit danno lo stesso zip |
| `install` | Nel progetto che riceve: controlla i prerequisiti (Node, Python, Playwright, versione di OpenCms), copia il motore in una cartella fissa, crea la configurazione di partenza, aggiunge gli script `npm` |
| `doctor` | Dice quale versione del motore è installata, se i file coincidono con i checksum (cioè se qualcuno li ha modificati), e se la configurazione è valida |
| `verify-pack` | Scompatta lo zip in una cartella vuota, lo installa in un progetto di prova e lancia esportazione e test. È la stessa verifica di P7 e quella che farà la CI in P8 |

## Regole che evitano che le copie divergano

1. **I file del motore non si modificano nei progetti che lo ricevono.** Se serve un cambiamento, si fa qui e si rilascia una versione nuova. `doctor` segnala ogni file modificato.
2. **Ogni zip ha una versione**, che cresce a ogni cambiamento del motore, e un `CHANGELOG`.
3. **Il progetto dichiara la versione del motore che usa** nella configurazione; se non coincide con quella installata, `doctor` lo dice.
4. **Lo zip si costruisce sempre da un commit pulito**: `pack` si rifiuta se ci sono modifiche non committate o se la skill `check-modifiche` dà errori.

## Come si passa dal manuale all'automatico

1. **P6**: si scrivono `pack`, `install`, `doctor`, `verify-pack`. Si passa lo zip a mano.
2. **P7**: lo zip si prova su un secondo progetto, in una cartella vuota.
3. **P8**: una pipeline (un tag) lancia `verify-pack`, poi `pack`, poi pubblica lo zip come allegato del rilascio. Niente di nuovo da scrivere sul motore: cambia solo chi esegue i comandi.

## Alternative

- **Installare da Git** (`npm install` da un tag di questo repo): evita lo zip, ma richiede che chi riceve veda il repo (decisione D5). È il percorso più semplice se il repo resta pubblico.
- **Pacchetto `npm`** costruito dalla stessa cartella `engine/`: stesso contenuto, aggiornamento più comodo (`npm update`). Si può aggiungere in P8 senza cambiare il resto.
- **Licenza** (decisione D6): senza licenza il codice è visibile ma non riutilizzabile da altri. Prima di mandare lo zip a un'altra persona o a un altro progetto va scelta (per esempio MIT, che avevamo già proposto il 2026-10-22).

## Cosa non è risolto

- **Compatibilità con altre versioni di OpenCms**: si è provato solo su OpenCms 22 con Mercury. Il motore dichiara quella come versione supportata; altre si provano in P7 o dopo.
- **Aggiornare il motore in un progetto già avviato**: l'`install` deve poterlo fare senza toccare configurazione e componenti. Si definisce in P6 e si prova in P7 con un aggiornamento di versione.
