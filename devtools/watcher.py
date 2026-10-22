"""Rilevamento delle modifiche, scelta del tipo di aggiornamento e ciclo di ascolto."""
import os, socket, sys, time

from build_module import SKIP, ftype

from .config import LOCK_PORT, SRC, WEBDAV_TYPES
from .css_plugins import sync_css_plugins
from .full_update import full_update
from .log import log
from .webdav import delete, put, remote_exists, wait_until_up


def needs_full_update(added, deleted):
    for rel in added:
        if ftype(rel) not in WEBDAV_TYPES:
            return f"nuovo {ftype(rel)}: {rel}"
        if rel.startswith("schemas/") and rel.endswith(".xsd"):
            return f"nuovo content type: {rel}"
    for rel in deleted:
        if rel.startswith("schemas/") and rel.endswith(".xsd"):
            return f"content type rimosso: {rel}"
    return None


def apply(changed, added, deleted):
    reason = needs_full_update(added, deleted)
    if reason:
        full_update(reason)
        return
    for rel in sorted(changed | added):
        put(rel)
    for rel in sorted(deleted):
        delete(rel)


def scan():
    files = {}
    for root, _, names in os.walk(SRC):
        for n in names:
            rel = os.path.relpath(os.path.join(root, n), SRC).replace("\\", "/")
            if rel not in SKIP:
                st = os.stat(os.path.join(SRC, rel))
                files[rel] = (st.st_mtime_ns, st.st_size)
    return files


def single_instance():
    """Due dev.py insieme si contendono i file (aggiunte e cancellazioni duplicate): ne ammette uno solo."""
    global _lock
    _lock = socket.socket()
    try:
        _lock.bind(("127.0.0.1", LOCK_PORT))
    except OSError:
        sys.exit("dev.py è già in esecuzione (un'altra finestra o un altro terminale): chiudi quella prima.")


def main():
    single_instance()
    wait_until_up()
    sync_css_plugins()
    # Allineamento iniziale: invia tutto, e se manca qualcosa di speciale fa l'aggiornamento completo.
    state = scan()
    missing = {rel for rel in state if not remote_exists(rel)}
    apply(set(state) - missing, missing, set())

    print(f"In ascolto su {SRC}  (Ctrl+C per uscire)", flush=True)
    while True:
        time.sleep(0.3)
        now = scan()
        if now == state:
            continue
        # Aspetta che i salvataggi finiscano (editor che scrivono più file di fila).
        while True:
            time.sleep(0.3)
            again = scan()
            if again == now:
                break
            now = again
        sync_css_plugins()
        now = scan()
        added = set(now) - set(state)
        deleted = set(state) - set(now)
        changed = {rel for rel in set(now) & set(state) if now[rel] != state[rel]}
        try:
            wait_until_up()
            apply(changed, added, deleted)
        except Exception as e:
            log(f"ERRORE: {e!r}, continuo ad ascoltare")
        # Si riparte da ciò che è stato applicato, non da una nuova scansione: i file toccati
        # mentre apply() era al lavoro (un aggiornamento completo dura ~1 minuto) vanno visti al giro dopo.
        state = now
