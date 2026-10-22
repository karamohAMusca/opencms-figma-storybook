"""Invio e cancellazione dei singoli file via WebDAV (progetto Offline)."""
import os, time, urllib.error, urllib.request
from urllib.parse import quote

from .config import AUTH, DAV, SERVER, SRC
from .log import log


def dav(method, rel, data=None, depth=None, base=DAV):
    headers = {"Authorization": AUTH}
    if depth is not None:
        headers["Depth"] = depth
    req = urllib.request.Request(base + quote(rel), data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except urllib.error.URLError:
        return 0


def remote_exists(rel):
    return dav("PROPFIND", rel, depth="0") == 207


def put(rel):
    parts = rel.split("/")[:-1]
    for i in range(len(parts)):
        folder = "/".join(parts[: i + 1]) + "/"
        if not remote_exists(folder):
            dav("MKCOL", folder)
    with open(os.path.join(SRC, rel), "rb") as f:
        status = dav("PUT", rel, f.read())
    log(f"{rel}  {'ok' if status in (200, 201, 204) else f'ERRORE HTTP {status}'}")


def delete(rel):
    status = dav("DELETE", rel)
    log(f"{rel}  {'eliminato' if status in (200, 204, 404) else f'ERRORE HTTP {status}'}")


def wait_until_up():
    """Resta in attesa finché OpenCms risponde (Docker spento, riavvio in corso): dev.py non deve mai uscire per questo."""
    warned = False
    # Si sonda la cartella dei moduli, non quella del nostro: su un'installazione nuova il modulo non esiste ancora (404).
    while dav("PROPFIND", "", depth="0", base=f"{SERVER}/webdav/system/modules/") != 207:
        if not warned:
            log("OpenCms non risponde su localhost:8080 (Docker spento, in avvio o credenziali sbagliate), attendo...")
            warned = True
        time.sleep(5)
