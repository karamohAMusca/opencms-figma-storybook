---
name: check-modifiche
description: Controlla le modifiche del progetto prima di un commit o di un push - file generati o locali tracciati per errore, segreti (valori di .env, chiave Figma, token), token e sintassi, docker compose, build del modulo OpenCms, check:figma, documenti allineati. Usala quando l'utente chiede di verificare, controllare o rivedere le modifiche, o prima di committare o pushare.
---

# Check delle modifiche

Il repo è pubblico (GitHub): un segreto o un file locale pushato per errore resta visibile. Questa skill ha due parti: uno script per i controlli ripetibili e una revisione del diff per quelli di giudizio.

## 1. Lo script

Dalla radice del repo:

```
python .claude/skills/check-modifiche/check.py
```

Solo libreria standard, non stampa mai i valori di `.env`. Stampa una riga per controllo (`OK`, `WARN`, `FAIL`, `SKIP`, `INFO`) e esce con 1 se c'è un `FAIL`.

| Controllo | Cosa verifica |
|---|---|
| file da non versionare | niente `dist/`, `dev.log`, `module-version.txt`, `.env`, `CLAUDE.local.md`, `node_modules`, `__pycache__`, zip tra i file tracciati |
| segreti | token noti (GitHub, Figma, chiavi API, chiavi private), valori di `OPENCMS_PASSWORD`, `DB_PASSWORD`, `FIGMA_FILE_KEY` assenti da file e cronologia; percorsi con nome utente (WARN) |
| token generati | `python sync_tokens.py --check`: i `tokens.css` sono allineati a `tokens.json` |
| export OpenCms | `export-opencms.mjs --check`: i file del modulo generati da Storybook (oggi `components.css`) sono allineati ai sorgenti |
| sintassi | Python (tutti i `.py` tracciati) e PowerShell (`start.ps1`, con avviso per caratteri non ASCII: PowerShell 5.1 legge UTF-8 senza BOM come ANSI) |
| docker compose | `docker compose config -q` con il `.env` locale |
| build del modulo | `build_module.py` in una cartella temporanea (non tocca `dist/`) e `module-types.json` invariato: gli id dei content type devono restare stabili |
| check:figma | `npm run check:figma` in `figma-storybook/` (se `node_modules` c'è) |
| documenti | link e file citati in `README.md` e `CLAUDE.md` esistono |

Un `FAIL` blocca commit e push finché non è risolto. Un `WARN` va guardato e spiegato, non ignorato.

## 2. Revisione del diff (quello che lo script non può fare)

Leggi il diff che sta per andare fuori: `git diff --cached` se si sta per committare, oppure `git log -p @{u}..HEAD` per ciò che è da pushare. Poi controlla:

- **Coerenza dei documenti**: se una modifica cambia un comando, un file o un comportamento, `README.md`, `CLAUDE.md`, `PROBLEMI.md` e i commenti in testa agli script devono dirlo. Cerca con `git grep` i nomi di file o comandi rimossi o rinominati.
- **Registro problemi**: `CLAUDE.md` chiede di aggiornare `PROBLEMI.md` quando si incontra o risolve un problema. Controlla che lo sia.
- **File generati**: `tokens.css` non si modifica a mano; se `tokens.json` cambia, devono essere rigenerati.
- **Residui**: codice di prova, valori di debug, percorsi assoluti, commenti che non descrivono più il codice.
- **Stile**: stesso tono dei file vicini (commenti in italiano, nomi, densità dei commenti).

I messaggi `LF will be replaced by CRLF` di git sono innocui (`core.autocrlf=true`).

## 3. Regole

- Non stampare mai valori di `.env` né password, nemmeno parziali.
- Non lanciare `dev.py` né `start.ps1` per controllare: `dev.py` ammette una sola istanza (porta 47321) e OpenCms blocca l'utente Admin per 15 minuti dopo 5 login falliti, quindi credenziali sbagliate in un ciclo di tentativi creano un blocco.
- Non correggere in silenzio: riporta prima cosa hai trovato, poi correggi se l'utente lo chiede o se è un errore tuo.
- Non pushare senza che l'utente lo abbia chiesto. Se lo ha chiesto, pusha solo con zero `FAIL`.

## 4. Come riferire

Una tabella breve con i controlli e l'esito, poi il verdetto in una riga: pronto per commit/push oppure cosa blocca. I `WARN` con una frase sul perché sono accettabili o no.
