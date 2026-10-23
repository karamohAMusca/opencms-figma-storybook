"""Aggiornamento completo: zip del modulo, import nel container con CmsShell, riavvio di OpenCms."""
import os, subprocess, time, urllib.request

from build_module import MOD, build

from .config import CONTAINER, DOCKER_ENV, HERE, PASSWORD, PKG, SERVER, SRC, USER, VERSION_FILE
from .log import log


def docker(*args, **kw):
    return subprocess.run(["docker", *args], env=DOCKER_ENV, **kw)


def wait_for_server(timeout=300):
    end = time.time() + timeout
    while time.time() < end:
        try:
            urllib.request.urlopen(f"{SERVER}/system/login", timeout=5)
            return True
        except Exception:
            time.sleep(3)
    return False


def full_update(reason):
    log(f"aggiornamento completo ({reason})...")
    current = open(VERSION_FILE).read().strip() if os.path.exists(VERSION_FILE) else "1.0.0"
    major, minor, patch = current.split(".")
    version = f"{major}.{minor}.{int(patch) + 1}"
    zip_name = f"{MOD}_{version}.zip"
    zip_path = os.path.join(HERE, "dist", zip_name)
    os.makedirs(os.path.dirname(zip_path), exist_ok=True)
    build(SRC, zip_path, version)

    docker("cp", zip_path, f"{CONTAINER}:{PKG}/", check=True, capture_output=True)
    docker("exec", CONTAINER, "chown", "opencms:opencms", f"{PKG}/{zip_name}", check=True)
    script = (f'login "{USER}" "{PASSWORD}"\nsetCurrentProject "Offline"\n'
              f'replaceModuleFromDefault "{MOD}" "{zip_name}"\nexit\n')
    out = docker("exec", "-u", "opencms", CONTAINER, "bash", "-c",
                 f"printf '{script}' > /tmp/dev.ocsh && source /root/common.sh && "
                 'java -classpath "$(shell_classpath)" org.opencms.main.CmsShell '
                 '-script=/tmp/dev.ocsh -base=$OPENCMS_HOME/WEB-INF',
                 capture_output=True, text=True).stdout
    if "the module has been imported" not in out:
        print(out[-3000:])
        log("ERRORE: aggiornamento non riuscito, output completo in dev.log", detail=out)
        return False
    open(VERSION_FILE, "w").write(version + "\n")

    log("riavvio OpenCms...")
    docker("restart", CONTAINER, check=True, capture_output=True)
    up = wait_for_server()
    log(f"{MOD} {version} installato" if up else "ERRORE: OpenCms non risponde dopo il riavvio")
    return up
