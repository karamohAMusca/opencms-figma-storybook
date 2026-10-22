# opencms-figma-storybook

Una pipeline per portare un design **da Figma a Storybook a OpenCms**: i componenti si disegnano una volta in Figma, si verificano in Storybook contro il design, e arrivano in OpenCms (template Mercury) come content type e include pronti all'uso.

## Obiettivo

Creare una pipeline efficace di **Figma → Storybook → OpenCms**, in cui:

- **Figma è la fonte unica**: token, componenti, varianti e proprietà vengono letti dal file Figma, non riscritti a mano.
- **Storybook è il punto di controllo**: ogni variante Figma ha la sua story, e un confronto visivo automatico (pixel per pixel, tolleranza 2%) segnala le differenze dal design.
- **OpenCms è la destinazione**: gli stessi token e le stesse classi CSS finiscono in un modulo OpenCms installabile, con un ciclo di sviluppo locale veloce.

```
   Figma                    Storybook                      OpenCms
┌──────────┐  tokens.json  ┌───────────────┐  tokens.css  ┌────────────────────┐
│ variabili│ ────────────► │ figma-        │ ───────────► │ it.progetti.figma  │
│ componenti│  manifest    │ storybook/    │  components  │ (modulo Mercury)   │
│ varianti │ ────────────► │  story per    │  .css, JSP   │  content type      │
└──────────┘  screenshot   │  ogni variante│ ───────────► │  fx-cta-button,    │
                           │  + confronto  │              │  fx-login, include │
                           │  visivo       │              │  fx-input          │
                           └───────────────┘              └────────────────────┘
                                                              ▲ dev.py (WebDAV)
```

## Cosa c'è nella repo

| Cartella / file | Contenuto |
|---|---|
| [figma-storybook/](figma-storybook/) | Storybook con i componenti ricavati dal Figma (HTML + CSS + JS, senza framework), dati Figma salvati in `figma/`, verifiche `check:figma` e `visual`. [README](figma-storybook/README.md) |
| [it.progetti.figma/](it.progetti.figma/) | Modulo OpenCms (Mercury): content type, formatter, include, CSS. [README](it.progetti.figma/README.md) |
| [storybook/](storybook/) | Anteprima Storybook con il markup copiato dai JSP del modulo |
| [sync_tokens.py](sync_tokens.py) | Genera i `tokens.css` (Storybook e modulo) da `figma-storybook/figma/tokens.json` |
| [dev.py](dev.py), [devtools/](devtools/) | Sincronizza il modulo con l'OpenCms locale mentre lavori |
| [build_module.py](build_module.py) | Crea lo zip importabile del modulo |
| [docker/](docker/), [start.ps1](start.ps1) | OpenCms 22 e MariaDB in locale con Docker |

## Come funziona

1. **Token.** Le variabili Figma sono salvate in `figma-storybook/figma/tokens.json`. `python sync_tokens.py` ne ricava `tokens.css` (`brand/primary` → `--brand-primary`) sia per Storybook sia per il modulo OpenCms. I `tokens.css` sono generati: non si modificano a mano.
2. **Componenti.** `figma/manifest.json` elenca componenti, varianti, proprietà e node-id. Le story leggono il manifest, quindi varianti e proprietà arrivano da Figma. `npm run check:figma` fallisce se una variante non ha la story.
3. **Verifica.** Con Storybook acceso, `npm run visual` confronta ogni story con lo screenshot Figma e produce un report con le differenze.
4. **OpenCms.** Button → content type `fx-cta-button`, Login → `fx-login`, Input → include `elements/fx-input.jsp`. `dev.py` invia le modifiche all'OpenCms locale: via WebDAV per i file semplici, con un aggiornamento completo del modulo (build, import, riavvio) quando cambiano schemi, formatter o configurazione.

## Requisiti

- Docker Desktop
- Python 3 (provato con 3.12), senza librerie esterne: [requirements.txt](requirements.txt) è vuoto di proposito
- Node.js (per Storybook)
- Windows (PowerShell) per lo script di avvio `start.ps1`; il resto è portabile

## Avvio rapido

Da una macchina nuova, in questo ordine:

1. Installa **Docker Desktop** e **Python 3** (Node.js solo per Storybook).
2. Clona la repo e crea il file `.env`:
   ```
   copy .env.example .env
   ```
   Compila `DB_PASSWORD` (a piacere al primo avvio, poi deve restare uguale: il volume Docker la conserva) e `OPENCMS_PASSWORD`. Su un'installazione nuova quest'ultima è la password predefinita di Admin dell'immagine [alkacon/opencms-docker](https://hub.docker.com/r/alkacon/opencms-docker), cioè `admin` (con utente `Admin`: verificato su una prova da zero); se la cambi in OpenCms, aggiorna anche `.env`.
3. Avvia tutto, da PowerShell nella cartella della repo:
   ```
   powershell -ExecutionPolicy Bypass -File start.ps1
   ```
   (Con la policy predefinita di Windows `.\start.ps1` da solo può essere bloccato.)
   Avvia Docker Desktop se è spento, crea i container, aspetta OpenCms, apre il login e lancia `dev.py`. Il primo avvio installa database, moduli e demo (qualche minuto, anche più di 10 con CPU alta: lo script aspetta al massimo 10 minuti, se scade rilancialo, l'installazione prosegue nel container); `dev.py` poi installa da solo il modulo `it.progetti.figma` (build, import, riavvio, circa un minuto).
4. OpenCms risponde su http://localhost:8080/system/login. `dev.py` resta in ascolto: ogni file che salvi nel modulo viene inviato a OpenCms. Non lanciarlo a mano in altri terminali, ne ammette una sola istanza.

Se `dev.py` mostra "OpenCms non risponde...", attende e riprova da solo: non serve riavviarlo.

### Storybook

Del design Figma (porta 6007):

```
cd figma-storybook
npm install
npm run storybook
npm run check:figma         # story ↔ manifest
npm run visual              # story ↔ screenshot Figma, con Storybook acceso
```

`npm run visual` usa Playwright: al primo uso installa Chromium con `npx playwright install chromium`.

Del markup dei JSP del modulo (porta 6006): `cd storybook`, `npm install`, `npm run storybook`.

## Configurazione

Le credenziali e la chiave del file Figma stanno in `.env`, che non è nel repo (modello in [.env.example](.env.example)):

| Variabile | Uso |
|---|---|
| `OPENCMS_USER`, `OPENCMS_PASSWORD` | account amministratore di OpenCms usato da `dev.py` |
| `DB_PASSWORD` | password root di MariaDB |
| `FIGMA_FILE_KEY` | facoltativa: abilita nel pannello Design di Storybook l'embed Figma live. Senza, restano gli screenshot salvati |

## Stato del progetto

Il design di esempio contiene Button, Input e la schermata Login. Le modifiche inviate da `dev.py` arrivano nel progetto *Offline* di OpenCms: per il sito pubblico vanno pubblicate.
