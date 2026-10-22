# Registro problemi

Memoria dei problemi incontrati e di come sono stati risolti. Claude lo legge a inizio lavoro e lo aggiorna quando un problema si ripresenta o si risolve.
Formato: data · sintomo · causa · soluzione · stato (`aperto` / `risolto`).
Il log di `dev.py` (con l'output completo degli errori) è in `dev.log`.

## Aperti

- **2026-10-20 · `dev.py`: "aggiornamento non riuscito"** durante l'aggiornamento completo per un CSS nuovo (`prova.css`). Causa non nota: l'output dell'errore non era stato salvato. Se si ripresenta, leggere `dev.log`. Stato: aperto.

## Risolti

- **2026-10-20 · file cancellato che ricompare in OpenCms** (`prova.css`). Causa: due `dev.py` in esecuzione insieme (vecchia versione del codice) che si contendevano i file e rigeneravano `plugins/prova.xml`. Soluzione: fermati i processi, tolti i file orfani in locale e via WebDAV; `dev.py` ora ammette una sola istanza (porta 47321) e rimuove le voci di configurazione senza plugin. **Regola: avviare solo "OpenCms: avvia tutto" (o `start.ps1`), mai `dev.py` a mano in altri terminali.**

- **2026-10-20 · `start.ps1`: `docker info` bloccava lo script** con Docker spento, per via di `$ErrorActionPreference = "Stop"` e dello stderr di docker. Soluzione: controllo via `cmd /c "docker info >nul 2>&1"`.
- **2026-10-20 · pagina login non carica subito dopo l'avvio.** Al primo avvio OpenCms installa DB, moduli e demo (CPU alta, minuti); il server risponde ma lentamente. Soluzione: attendere; ricaricare.
- **2026-10-20 · `RemoteDisconnected` in `dev.py`.** Capita se un salvataggio cade durante il riavvio di OpenCms. Ora `dev.py` aspetta il server e continua ad ascoltare.
- **2026-10-20 · file orfani in OpenCms** (`prova.css`, `plugins/prova.xml`) dopo cancellazione locale durante un errore. `dev.py` non cancella i file presenti solo in OpenCms: vanno tolti via WebDAV (`DELETE http://localhost:8080/webdav/system/modules/it.progetti.figma/<file>`, con le credenziali di `.env`).
- **2026-10-20 · attività pianificata Windows per `dev.py` sempre attivo** negata dal sistema (azione persistente). Non creata: `dev.py` resta attivo finché è aperto il terminale.
