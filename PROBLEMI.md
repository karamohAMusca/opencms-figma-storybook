# Registro problemi

Memoria dei problemi incontrati e di come sono stati risolti. Claude lo legge a inizio lavoro e lo aggiorna quando un problema si ripresenta o si risolve.
Formato: data · sintomo · causa · soluzione · stato (`aperto` / `risolto`).
Il log di `dev.py` (con l'output completo degli errori) è in `dev.log`.

## Aperti

Nessuno.

## Risolti

- **2026-10-20 · `dev.py`: "aggiornamento non riuscito"** durante l'aggiornamento completo per un CSS nuovo (`prova.css`). Causa: `plugins/prova.xml` cancellato in Offline ma mai pubblicato, che impediva a `replaceModule` di togliere la cartella `plugins/` (vedi la voce del 2026-10-22). Chiusa il 2026-10-23: dopo la pubblicazione della cancellazione gli aggiornamenti completi sono riusciti tre volte (1.0.5, 1.0.6, 1.0.7) e non si è ripresentata.
- **2026-10-22 · aggiornamento completo del modulo che fallisce: `plugins/prova.xml` ancora online.** Nel progetto Offline `prova.xml` risulta cancellato, ma la cancellazione non è mai stata pubblicata: `replaceModule` non riesce a togliere la cartella `plugins/` ("The folder contains the files [.../plugins/prova.xml]") e il modulo online resta a metà (la pagina di prova `/fx-test/` non mostra più gli elementi). Soluzione: pubblicare la cancellazione di `plugins/prova.xml` (Explorer di OpenCms, progetto Offline) e rifare un aggiornamento completo. Risolto pubblicando il progetto Offline con la shell (`publishProjectAndWait`): oltre a `prova.xml` ha pubblicato tre cancellazioni già in sospeso (`.content/section-m/cs_00001.xml`, `cs_00004.xml`, `i18n/it.progetti.figma.messages_de`).
- **2026-10-22 · pagina di prova senza stili, o elementi vecchi, dopo lavori con la shell di OpenCms.** Causa: `CmsShell` è una seconda istanza di OpenCms sullo stesso database; il server non vede i cambi (cache di risorse e configurazione). Soluzione: dopo la shell si riavvia il container (lo fanno l'aggiornamento completo e `devtools/testpage.py`).
- **2026-10-22 · due aggiornamenti completi contemporanei.** `npm run compare:opencms -- --deploy` lanciava un aggiornamento completo mentre un `dev.py` in ascolto ne faceva un altro (font nuovi): uno fallisce, il modulo online resta incompleto. Soluzione: `devtools/testpage.py --deploy` si rifiuta se `dev.py` è attivo (porta 47321 occupata) e si ferma se l'aggiornamento non riesce. **Regola: con `dev.py` in ascolto il modulo lo aggiorna lui.**
- **2026-10-22 · `RemoteDisconnected` su WebDAV subito dopo il riavvio.** La pagina di login risponde prima di WebDAV. Soluzione: dopo un aggiornamento completo `testpage.py` aspetta WebDAV (`wait_until_up`).

- **2026-10-22 · cambio `OPENCMS_PASSWORD` in `.env`: `dev.py` riceve 401 e non sincronizza.** Causa: `.env` contiene la password che `dev.py` usa per accedere, non la imposta in OpenCms, che tiene quella del suo database. Soluzione: la password in `.env` deve coincidere con quella di Admin in OpenCms (si cambia dall'interfaccia di OpenCms, poi si aggiorna `.env`). Provato e scartato: uno script che la cambiava dal `.env` con `setPassword` nella shell di OpenCms; complicava l'avvio senza un vero vantaggio. **Attenzione:** OpenCms blocca l'utente per 15 minuti dopo 5 login falliti (`loginmanager` in `opencms-system.xml`), anche con la password giusta: `dev.py` che riprova di continuo con credenziali sbagliate tiene il blocco attivo. Nota: WebDAV ricorda per un po' le credenziali già accettate, quindi dopo un cambio la vecchia password può ancora dare 207.

- **2026-10-20 · file cancellato che ricompare in OpenCms** (`prova.css`). Causa: due `dev.py` in esecuzione insieme (vecchia versione del codice) che si contendevano i file e rigeneravano `plugins/prova.xml`. Soluzione: fermati i processi, tolti i file orfani in locale e via WebDAV; `dev.py` ora ammette una sola istanza (porta 47321) e rimuove le voci di configurazione senza plugin. **Regola: avviare solo `start.ps1`, mai `dev.py` a mano in altri terminali.**

- **2026-10-20 · `start.ps1`: `docker info` bloccava lo script** con Docker spento, per via di `$ErrorActionPreference = "Stop"` e dello stderr di docker. Soluzione: controllo via `cmd /c "docker info >nul 2>&1"`.
- **2026-10-20 · pagina login non carica subito dopo l'avvio.** Al primo avvio OpenCms installa DB, moduli e demo (CPU alta, minuti); il server risponde ma lentamente. Soluzione: attendere; ricaricare.
- **2026-10-20 · `RemoteDisconnected` in `dev.py`.** Capita se un salvataggio cade durante il riavvio di OpenCms. Ora `dev.py` aspetta il server e continua ad ascoltare.
- **2026-10-20 · file orfani in OpenCms** (`prova.css`, `plugins/prova.xml`) dopo cancellazione locale durante un errore. `dev.py` non cancella i file presenti solo in OpenCms: vanno tolti via WebDAV (`DELETE http://localhost:8080/webdav/system/modules/it.progetti.figma/<file>`, con le credenziali di `.env`).
- **2026-10-20 · attività pianificata Windows per `dev.py` sempre attivo** negata dal sistema (azione persistente). Non creata: `dev.py` resta attivo finché è aperto il terminale.
