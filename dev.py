"""Tiene allineato OpenCms locale con la cartella del modulo, scegliendo da solo come aggiornarlo.

Uso, dalla cartella opencms/ con OpenCms acceso (Docker):
    python dev.py

- File modificati, e file nuovi CSS/JS/JSP/XSD/immagini  -> inviati subito via WebDAV (progetto Offline)
- File eliminati                                         -> eliminati anche in OpenCms
- Nuovo CSS in resources/css/                            -> registrato da solo (plugin + configurazione), poi aggiornamento completo
- File nuovi di tipo speciale (formatter, plugin, configurazioni, etichette, font)
  o schemi nuovi/eliminati (= content type)              -> aggiornamento completo del modulo + riavvio

Credenziali: OPENCMS_USER / OPENCMS_PASSWORD, da .env (vedi .env.example) o dall'ambiente.
"""

from devtools.watcher import main

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
