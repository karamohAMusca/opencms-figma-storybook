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
| [docker/](docker/), [start.ps1](start.ps1), [start.bat](start.bat) | OpenCms 22 e MariaDB in locale con Docker |

## Come funziona

1. **Token.** Le variabili Figma sono salvate in `figma-storybook/figma/tokens.json`. `python sync_tokens.py` ne ricava `tokens.css` (`brand/primary` → `--brand-primary`) sia per Storybook sia per il modulo OpenCms. I `tokens.css` sono generati: non si modificano a mano.
2. **Componenti.** `figma/manifest.json` elenca componenti, varianti, proprietà e node-id. Le story leggono il manifest, quindi varianti e proprietà arrivano da Figma. `npm run check:figma` fallisce se una variante non ha la story.
3. **Verifica.** Con Storybook acceso, `npm run visual` confronta ogni story con lo screenshot Figma e produce un report con le differenze.
4. **OpenCms.** Button → content type `fx-cta-button`, Login → `fx-login`, Input → include `elements/fx-input.jsp`. `dev.py` invia le modifiche all'OpenCms locale: via WebDAV per i file semplici, con un aggiornamento completo del modulo (build, import, riavvio) quando cambiano schemi, formatter o configurazione.

## Requisiti

- Docker Desktop
- Python 3
- Node.js (per Storybook)
- Windows per gli script di avvio `start.ps1` / `start.bat`; il resto è portabile

## Avvio rapido

```
copy .env.example .env      # poi imposta le password
start.bat                   # Docker + OpenCms + sincronizzazione (dev.py)
```

OpenCms risponde su http://localhost:8080/system/login. Il primo avvio installa database, moduli e demo e richiede alcuni minuti.

Storybook del design Figma:

```
cd figma-storybook
npm install
npm run storybook           # http://localhost:6007
npm run check:figma         # story ↔ manifest
npm run visual              # story ↔ screenshot Figma (con Storybook acceso)
```

## Configurazione

Le credenziali e la chiave del file Figma stanno in `.env`, che non è nel repo (modello in [.env.example](.env.example)):

| Variabile | Uso |
|---|---|
| `OPENCMS_USER`, `OPENCMS_PASSWORD` | account amministratore di OpenCms usato da `dev.py` |
| `DB_PASSWORD` | password root di MariaDB |
| `FIGMA_FILE_KEY` | facoltativa: abilita nel pannello Design di Storybook l'embed Figma live. Senza, restano gli screenshot salvati |

## Stato del progetto

Il design di esempio contiene Button, Input e la schermata Login. Le modifiche inviate da `dev.py` arrivano nel progetto *Offline* di OpenCms: per il sito pubblico vanno pubblicate.
