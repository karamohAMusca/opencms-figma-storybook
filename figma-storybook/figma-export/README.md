# fx-export: il plugin che legge Figma

Primo passo del generatore Figma → Storybook ([piano-design-system/GENERATORE.md](../../piano-design-system/GENERATORE.md), fase G1). Legge un componente dal file Figma aperto e consegna uno zip con i dati che servono al generatore. **Niente AI, niente rete, niente dipendenze**: stesso file Figma, stesso zip, byte per byte.

## Installazione (una volta per computer)

1. Apri l'**app desktop** di Figma (dal browser i plugin in sviluppo non si caricano).
2. Menu **Plugins → Development → Import plugin from manifest…**
3. Scegli `figma-storybook/figma-export/manifest.json` di questo repo.

Il plugin compare in **Plugins → Development → fx-export**. Lo vedi solo tu, non si pubblica. Figma legge i file da questa cartella a ogni avvio: dopo un `git pull` usa la versione nuova.

## Permessi sul file Figma

Figma esegue i plugin solo per chi ha **accesso in modifica** al file (anche se questo plugin legge e basta). Con la sola lettura:

1. **Il designer del cliente esporta e consegna lo zip** (consigliato con dati sensibili): installa il plugin da questo repo, ne controlla il codice (quattro file, senza rete), esporta e manda solo gli zip. Chi riceve non accede al file.
2. **Copia del file nelle proprie bozze**, dove si ha la modifica: solo se il proprietario permette ai lettori di copiare, e con il suo consenso, perché la copia resta nell'account Figma di chi la fa.
3. **Accesso in modifica** (posto Full), anche solo per il tempo dell'esportazione.

Non si usa la REST API: con la sola lettura funzionerebbe, ma i nomi delle variabili si leggono solo sul piano Enterprise e servirebbe un token di accesso al file.

Gli export contengono testi e descrizioni del disegno: con il file di un cliente **non vanno committati in un repo pubblico**.

## Uso

1. Nel file Figma seleziona **un componente** o **un set di varianti** (non una singola variante, non un'istanza).
2. Avvia **fx-export** e clicca **Esporta**: Figma salva `fx-export-<componente>.zip`.
3. In `figma-storybook/`:
   ```
   npm run figma:import -- <percorso dello zip>
   ```
   I file finiscono in `figma/export/`, dopo i controlli (CRC, nomi, schema, forma canonica).

## Cosa c'è nello zip

| File | Contenuto |
|---|---|
| `<componente>.json` | proprietà, varianti, albero dei livelli: auto layout, dimensionamento, riempimenti, bordi, raggi, effetti, testi, istanze, con il **nome** delle variabili legate. Formato: [schema.json](schema.json) |
| `<componente>.<variante>.png` (o `<componente>.png`) | screenshot 1x di ogni variante |
| `variables.json` | tutte le variabili locali del file, per collezione e mode, alias risolti per nome |

Non contiene: chiave del file, utenti, commenti, date. Le istanze di altri componenti non si aprono: rimandano al loro componente per nome.

## Perché è deterministico

- chiavi in ordine alfabetico, figli nell'ordine dei livelli, 2 spazi, fine riga LF, a capo finale;
- numeri arrotondati a 2 decimali; colori `#rrggbb` o `rgba(r, g, b, a)`;
- zip senza compressione, file in ordine di nome, data fissa (1980-01-01);
- nessun accesso a data, ora, rete o ambiente: nei test `code.js` gira in un contesto che non li ha.

## File

| File | |
|---|---|
| `manifest.json` | plugin con `networkAccess.allowedDomains: ["none"]` |
| `code.js` | estrazione, normalizzazione, zip (JavaScript semplice, nessuna build) |
| `ui.html` | la finestra con "Esporta"; nessuna risorsa esterna |
| `schema.json` | formato dei JSON (schema 1) |
| `VERSION` | versione del plugin, scritta in ogni export (`exporter`) |

## Test

`npm run test:export` prova `code.js` in Node su un Figma simulato: stessi byte a ogni esecuzione e con un ordine diverso delle chiavi in Figma, conformità allo schema, zip in andata e ritorno con `figma:import`, errori attesi, e che plugin e comandi non contengano rete né dipendenze.

La prova sul file Figma vero si fa a mano: due esportazioni dello stesso componente, anche da due computer, devono dare zip identici.
