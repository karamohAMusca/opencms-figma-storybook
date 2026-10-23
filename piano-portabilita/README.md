# Piano: portabilità dell'esportazione Storybook → OpenCms

Obiettivo: poter portare l'esportazione (oggi in `figma-storybook/` e `devtools/`) in **un altro progetto OpenCms** e usarla cambiando solo una configurazione e i propri componenti, senza modificare il motore.

Questo piano segue `PIANO.md` (fasi 1-5, fatte il 2026-10-22: la pipeline funziona su questo progetto). Qui le fasi si chiamano **P1…P8** per non confonderle con quelle.

Stato: `da fare` / `in corso` / `fatto`. Definito il 2026-10-23, nessuna fase iniziata.

## Cosa c'è in questa cartella

| File | Contenuto |
|---|---|
| [ACCOPPIAMENTI.md](ACCOPPIAMENTI.md) | Tutto ciò che oggi lega il motore a questo progetto, con file e riga (verificato con una ricerca nel codice il 2026-10-23) |
| [FASI.md](FASI.md) | Le otto fasi, ciascuna con cosa si fa, cosa si tocca e come si verifica |
| [DISTRIBUZIONE.md](DISTRIBUZIONE.md) | Lo zip da passare a mano, e come diventa una pipeline automatica senza rifare il lavoro |

## Le fasi in una riga

| # | Fase | Stato |
|---|---|---|
| P1 | Un solo file di configurazione al posto delle costanti sparse | da fare |
| P2 | I tipi di campo in un registro (si aggiunge un tipo in un posto solo) | da fare |
| P3 | Il motore diventa una cartella autonoma, il progetto lo importa | da fare |
| P4 | Componenti trovati dai loro file, Figma diventa opzionale | da fare |
| P5 | Pagina di prova generica e destinazione di installazione a scelta (Docker Alkacon, o altro) | da fare |
| P6 | Pacchetto: zip, script di installazione, versione, controllo | da fare |
| P7 | Prova su un secondo progetto, da uno zip, in una cartella vuota | da fare |
| P8 | Automazione: lo stesso zip costruito e pubblicato da CI a ogni rilascio | da fare |

## Regola di tutto il piano

Finché non si arriva a P7, **i file generati di questo progetto non devono cambiare di un byte**. È l'ancora contro le regressioni: prima di P1 si salva l'impronta dei file generati (JSP, XSD, formatter, CSS, etichette, configurazione), e ogni fase la deve riprodurre uguale. Le fasi sono riorganizzazioni, non cambiamenti di comportamento.

## Decisioni da prendere

| # | Domanda | Consiglio | Quando serve |
|---|---|---|---|
| D1 | Il motore si distribuisce come cartella/zip o come pacchetto `npm`? | Zip prima (P6), poi un pacchetto `npm` costruito dalla stessa cartella: stesso contenuto, due formati | prima di P3 |
| D2 | Figma resta nello strumento? | Sì, come parte opzionale: confronto con Figma e manifest restano, ma il motore non ne dipende | prima di P4 |
| D3 | Il secondo progetto di P7 è reale o di prova? | Di prova (un piccolo Storybook con altro nome di modulo e altro prefisso), poi uno reale | prima di P7 |
| D4 | Quali installazioni di OpenCms si supportano oltre a Docker Alkacon? | Per ora solo Docker Alkacon, con l'interfaccia pronta per altre; il resto su richiesta | prima di P5 |
| D5 | Chi riceve lo zip ha accesso a questo repo? | Se sì, un'installazione da Git evita lo zip; lo zip resta per chi non vede il repo | prima di P6 |
| D6 | Licenza | **Serve prima di condividere fuori dal progetto**: senza licenza il codice non è riutilizzabile da altri (oggi non c'è: proposta e tolta il 2026-10-22) | prima di P6 |

## Fuori da questo piano

- Altri CMS oltre a OpenCms.
- Un altro template al posto di Mercury (le ipotesi su Mercury sono isolate in configurazione in P1, ma non si prova un altro template).
- Pubblicare il pacchetto su un registro pubblico.
