"""Pagina di prova in OpenCms: /sites/default/fx-test/ con un elemento per ogni caso, pubblicata da un progetto temporaneo.

Uso, dalla radice del repo con OpenCms acceso:
    python -m devtools.testpage casi.json [--deploy]

casi.json (lo scrive figma-storybook/scripts/compare-opencms.mjs) è una lista di
{ "id", "type", "formatterKey", "fields": [[nome, "field"|"link", valore], ...], "settings": {nome: valore} }.
--deploy prima carica il modulo com'è nella cartella (aggiornamento completo, ~1 minuto con riavvio).

Si lavora in un progetto "fx-test" creato apposta e cancellato alla fine: la pubblicazione riguarda solo la pagina
di prova, non le modifiche in sospeso nel progetto Offline. La password passa da stdin, non dalla riga di comando.
La shell è una seconda istanza di OpenCms sullo stesso database: alla fine OpenCms si riavvia (~40 secondi) perché
il server veda la pagina nuova.
"""
import json, os, re, socket, subprocess, sys, tempfile, urllib.request, uuid
from xml.sax.saxutils import escape

from .config import AUTH, CONTAINER, DOCKER_ENV, PASSWORD, SERVER, USER
from .log import log

SITE = "/sites/default/"
FOLDER = "fx-test"
PROJECT = "fx-test"
MODEL_PAGE = SITE + "login/index.html"  # pagina del demo da cui si prendono intestazione, piè di pagina e layout
REMOTE_DIR = "/tmp/fx-test"
SCRIPT = "/tmp/fx-test.ocsh"
LANG = "en"


def cdata(s):
    return "<![CDATA[" + str(s).replace("]]>", "]]]]><![CDATA[>") + "]]>"


def content_xml(case):
    """XML di un contenuto: elementi nell'ordine dello schema, link esterni come OpenCmsVarLink."""
    root = "".join(w.capitalize() for w in case["type"].split("-"))
    xsd = f"opencms://system/modules/it.progetti.figma/schemas/{case['type']}.xsd"
    lines = []
    for name, kind, value in case["fields"]:
        if value in (None, ""):
            continue
        if kind == "link":
            lines.append(f'    <{name}>\n      <link type="A" internal="false">\n        <target>{cdata(value)}</target>\n'
                         f"      </link>\n    </{name}>")
        else:
            lines.append(f"    <{name}>{cdata(value)}</{name}>")
    return "\n".join([
        '<?xml version="1.0" encoding="UTF-8"?>', "",
        f'<{root}s xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="{xsd}">',
        f'  <{root} language="{LANG}">', *lines, f"  </{root}>", f"</{root}s>", ""])


def webdav_get(path):
    req = urllib.request.Request(SERVER + "/webdav" + path, headers={"Authorization": AUTH})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def element(case, path):
    props = "".join(f"\n        <Properties>\n          <Name>{cdata(k)}</Name>\n          <Value>\n"
                    f"            <String>{cdata(v)}</String>\n          </Value>\n        </Properties>"
                    for k, v in case["settings"].items())
    return (f"      <Elements>\n        <ElementInstanceId>{uuid.uuid4()}</ElementInstanceId>\n"
            f"        <FormatterKey>{case['formatterKey']}</FormatterKey>\n        <Uri>\n          <link type=\"STRONG\">\n"
            f"            <target>{cdata(path)}</target>\n          </link>\n        </Uri>{props}\n      </Elements>")


def page_xml(cases, paths):
    """Pagina con la stessa struttura Mercury di MODEL_PAGE (intestazione, area, piè di pagina) e una riga con i nostri elementi."""
    model = webdav_get(MODEL_PAGE)
    root = re.search(r"<Containers>\s*<Name><!\[CDATA\[mercury-page\]\]></Name>[\s\S]*?</Containers>", model).group(0)
    blocks = re.findall(r"      <Elements>[\s\S]*?</Elements>", root)
    area = next(b for b in blocks if "m/layout/area" in b)
    area_id = re.search(r"<ElementInstanceId>([^<]+)</ElementInstanceId>", area).group(1)
    row = re.search(r"      <Elements>\s*<ElementInstanceId>[^<]+</ElementInstanceId>\s*<FormatterKey>m/layout/row-simple</FormatterKey>"
                    r"[\s\S]*?lr_00001\.xml[\s\S]*?</Elements>", model).group(0)
    row_id = str(uuid.uuid4())
    row = re.sub(r"<ElementInstanceId>[^<]+</ElementInstanceId>", f"<ElementInstanceId>{row_id}</ElementInstanceId>", row)
    elements = "\n".join(element(c, paths[c["id"]]) for c in cases)
    return "\n".join([
        '<?xml version="1.0" encoding="UTF-8"?>', "",
        '<AlkaconContainerPages xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="opencms://system/modules/org.opencms.ade.containerpage/schemas/container_page.xsd">',
        f'  <AlkaconContainerPage language="{LANG}">',
        "    " + root,
        f"    <Containers>\n      <Name>{cdata(area_id + '-main')}</Name>\n      <Type>{cdata('row')}</Type>\n"
        f"      <ParentInstanceId>{cdata(area_id)}</ParentInstanceId>\n{row}\n    </Containers>",
        f"    <Containers>\n      <Name>{cdata(row_id + '-maincol')}</Name>\n      <Type>{cdata('element')}</Type>\n"
        f"      <ParentInstanceId>{cdata(row_id)}</ParentInstanceId>\n{elements}\n    </Containers>",
        "  </AlkaconContainerPage>", "</AlkaconContainerPages>", ""])


def shell(script):
    """Script nella shell di OpenCms nel container, passato da stdin (la password non compare nella riga di comando)."""
    cmd = (f"cat > {SCRIPT} && source /root/common.sh && "
           'java -classpath "$(shell_classpath)" org.opencms.main.CmsShell '
           f"-script={SCRIPT} -base=$OPENCMS_HOME/WEB-INF; rm -f {SCRIPT}")
    r = subprocess.run(["docker", "exec", "-i", "-u", "opencms", CONTAINER, "bash", "-c", cmd],
                       input=script, env=DOCKER_ENV, capture_output=True, text=True)
    return r.stdout + r.stderr


def in_project(commands):
    """Comandi eseguiti nel progetto temporaneo, che alla fine si pubblica e si cancella."""
    return "\n".join([
        f'login "{USER}" "{PASSWORD}"',
        f'createProject "{PROJECT}" "Pagina di prova della pipeline Figma" "Users" "Administrators"',
        f'setCurrentProject "{PROJECT}"',
        f'copyResourceToProject "{SITE}"',
        *commands,
        "publishProjectAndWait",
        'setCurrentProject "Offline"',
        f'deleteProject "{PROJECT}"',
        "exit", ""])


def _port_free(port):
    """dev.py tiene occupata la porta con bind (senza listen): se non si riesce a fare bind, dev.py è attivo."""
    with socket.socket() as s:
        try:
            s.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def run(cases_file, deploy=False):
    if any(c in PASSWORD for c in '"\r\n'):
        sys.exit("ERRORE: la password contiene caratteri non ammessi nello script della shell di OpenCms.")
    if deploy:
        from .css_plugins import sync_css_plugins
        from .full_update import full_update
        from .config import LOCK_PORT
        from .webdav import wait_until_up
        # Con dev.py in ascolto il modulo lo aggiorna lui: due aggiornamenti completi insieme si rompono a vicenda.
        if not _port_free(LOCK_PORT):
            sys.exit("ERRORE: dev.py è in ascolto e aggiorna già il modulo: aspetta che finisca e rilancia senza --deploy.")
        sync_css_plugins()
        if not full_update("pagina di prova"):
            sys.exit("ERRORE: aggiornamento del modulo non riuscito (dettagli in dev.log): pagina di prova non creata.")
        wait_until_up()  # dopo il riavvio il login risponde prima di WebDAV

    cases = json.load(open(cases_file, encoding="utf-8"))
    paths = {c["id"]: f"{SITE}{FOLDER}/{c['id']}.xml" for c in cases}
    with tempfile.TemporaryDirectory() as tmp:
        for c in cases:
            with open(os.path.join(tmp, c["id"] + ".xml"), "w", encoding="utf-8", newline="\n") as f:
                f.write(content_xml(c))
        with open(os.path.join(tmp, "index.html"), "w", encoding="utf-8", newline="\n") as f:
            f.write(page_xml(cases, paths))
        subprocess.run(["docker", "exec", CONTAINER, "rm", "-rf", REMOTE_DIR], env=DOCKER_ENV, check=True)
        subprocess.run(["docker", "cp", tmp, f"{CONTAINER}:{REMOTE_DIR}"], env=DOCKER_ENV, check=True, capture_output=True)
        subprocess.run(["docker", "exec", CONTAINER, "chmod", "-R", "a+rX", REMOTE_DIR], env=DOCKER_ENV, check=True)

    # 1) via la pagina della prova precedente e pubblicazione della cancellazione (alla prima prova non c'è: errori ignorati)
    shell(in_project([f'lockResource "{SITE}{FOLDER}/"', f'deleteResource "{SITE}{FOLDER}/"']))
    # 2) contenuti e pagina nuovi
    uploads = [f'uploadFile "{REMOTE_DIR}/{c["id"]}.xml" "{SITE}{FOLDER}/" "{c["id"]}.xml" "{c["type"]}"' for c in cases]
    uploads.append(f'uploadFile "{REMOTE_DIR}/index.html" "{SITE}{FOLDER}/" "index.html" "containerpage"')
    out = shell(in_project([f'createFolder "{SITE}" "{FOLDER}"', *uploads]))
    subprocess.run(["docker", "exec", CONTAINER, "rm", "-rf", REMOTE_DIR], env=DOCKER_ENV)

    # La shell è un'altra istanza di OpenCms sullo stesso database: il server non vede i cambi finché non riparte
    # (cache di risorse e configurazione). Lo stesso fa l'aggiornamento completo dopo l'import.
    from .full_update import docker, wait_for_server
    from .webdav import wait_until_up
    log("riavvio OpenCms per rendere visibile la pagina di prova...")
    docker("restart", CONTAINER, check=True, capture_output=True)
    if not wait_for_server():
        sys.exit("ERRORE: OpenCms non risponde dopo il riavvio.")
    wait_until_up()

    errors = [l for l in out.splitlines() if re.search(r"Exception|Error|error", l) and "does not exist" not in l]
    log(f"pagina di prova pubblicata: {SERVER}/{FOLDER}/" + (f" ({len(errors)} righe di errore, vedi dev.log)" if errors else ""),
        detail=out if errors else None)
    return errors


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    sys.exit(1 if run(args[0], deploy="--deploy" in sys.argv) else 0)
