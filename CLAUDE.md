# Progetti

## Figma

- File: «Esempio Claude × Figma». Chiave e link **non stanno nel repo**: sono in `CLAUDE.local.md` e in `.env` (`FIGMA_FILE_KEY`), entrambi ignorati da git.

### Pagina "🎨 Design" (node `0:1`)

| Elemento | Tipo | node-id | Note |
|---|---|---|---|
| Login – Mobile | frame | `1:27` | 390×844, schermata principale |
| Button | component set | `1:22` | varianti Primary (`1:18`), Secondary (`1:20`) |
| Input | component | `1:23` | 326×72 |

### Token

Fonte unica: `figma-storybook/figma/tokens.json` (`variables` = output di `get_variable_defs` sul nodo `1:27`, `styles` = valori non variabili).
`python sync_tokens.py` genera `tokens.css` con gli stessi nomi (`brand/primary` → `--brand-primary`) in `figma-storybook/src/` e `it.progetti.figma/resources/css/`.
Quando cambiano in Figma si aggiorna il JSON e si rilancia lo script: i `tokens.css` sono generati, non vanno modificati a mano.

### Pipeline Figma → Storybook → OpenCms

Piano e stato delle fasi: `PIANO.md`. Storybook (`figma-storybook/`) è la fonte dei componenti: `npm run export:opencms` genera i file del modulo (`resources/css/components.css` e i JSP), `-- --check` verifica che siano allineati, `npm run test:opencms` che i JSP producano lo stesso HTML dei template. I file generati non si modificano a mano. Le classi sono `fx-` anche in Storybook. Il markup sta nei `*.template.js` (solo nodi di `figma-storybook/src/template.js`), i collegamenti a OpenCms nei `*.opencms.js`.

Uscita: `figma-storybook/`. Inventario della pagina in `figma-storybook/figma/` (`metadata.xml` grezzo, `manifest.json` con componenti, varianti e node-id).
Il piano Figma è Starter: limitare le chiamate MCP e riusare i file salvati.
Verifiche in `figma-storybook/`: `npm run check:figma` (story ↔ manifest) e, con Storybook acceso, `npm run visual` (story ↔ screenshot Figma, tolleranza 2%; al primo uso `npx playwright install chromium`).
Altezza di riga dei testi: `var(--font-line-height)`, non `line-height: normal` (in Chromium su Windows dà 1px in più rispetto a Figma).

## OpenCms

- Template: **Mercury**. Modulo: `opencms/it.progetti.figma/` (vedi il suo README).
- Componenti Figma → OpenCms: Button → content type `fx-cta-button`, Input → include `elements/fx-input.jsp`, Login → content type `fx-login`.
- Classi CSS con prefisso `fx-`, mobile first.
- Avvio locale: `start.ps1` (Docker + container + login + `dev.py`). Un CSS nuovo in `resources/css/` viene registrato da solo da `dev.py`.
- **Registro problemi:** a inizio lavoro leggi `PROBLEMI.md`; quando incontri o risolvi un problema, aggiornalo. L'output completo degli errori di `dev.py` è in `dev.log`.
