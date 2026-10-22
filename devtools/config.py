"""Percorsi, indirizzi e credenziali condivisi dagli altri moduli."""
import base64, os, sys

from build_module import MOD

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env(path):
    """Legge le righe CHIAVE=valore di .env nell'ambiente, senza sovrascrivere ciò che è già impostato."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())


load_env(os.path.join(HERE, ".env"))
SRC = os.path.join(HERE, MOD)
SERVER = os.environ.get("OPENCMS_URL", "http://localhost:8080")
DAV = f"{SERVER}/webdav/system/modules/{MOD}/"
VERSION_FILE = os.path.join(HERE, "module-version.txt")
LOG_FILE = os.path.join(HERE, "dev.log")
LOCK_PORT = 47321
CONTAINER = os.environ.get("OPENCMS_CONTAINER", "opencms")
PKG = "/container/webapps/ROOT/WEB-INF/packages/modules"
USER = os.environ.get("OPENCMS_USER", "Admin")
PASSWORD = os.environ.get("OPENCMS_PASSWORD")
if not PASSWORD:
    sys.exit("OPENCMS_PASSWORD mancante: copia .env.example in .env e imposta le credenziali.")
AUTH = "Basic " + base64.b64encode(f"{USER}:{PASSWORD}".encode()).decode()
DOCKER_ENV = dict(os.environ, MSYS_NO_PATHCONV="1")

# Tipi che WebDAV assegna correttamente ai file nuovi (verificato su OpenCms 22).
WEBDAV_TYPES = {"jsp", "plain", "image"}
