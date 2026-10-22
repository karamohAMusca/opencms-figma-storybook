import time

from .config import LOG_FILE


def log(msg, detail=None):
    """Stampa e accoda a dev.log (anche l'output completo degli errori, che nel terminale scorre via)."""
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')}  {msg}"
    print(line[11:], flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n" + (detail.rstrip() + "\n" if detail else ""))
