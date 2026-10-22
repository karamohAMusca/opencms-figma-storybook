"""Crea lo zip importabile di it.progetti.figma (manifest.xml + file sotto system/modules/...).

Uso: python build_module.py <cartella modulo> <zip di uscita> [versione]
I content type si ricavano da schemas/*.xsd; gli id restano fissi in module-types.json.
"""
import sys, os, json, uuid, zipfile, email.utils

HERE = os.path.dirname(os.path.abspath(__file__))
MOD = "it.progetti.figma"
BASE = f"system/modules/{MOD}"
SKIP = {"README.md"}
TYPES_FILE = os.path.join(HERE, "module-types.json")
FIRST_TYPE_ID = 20001
NS = uuid.UUID("6f1c3a52-6d1b-4b8e-9a43-1f0e2a7d9c11")  # UUID stabili tra build

IMAGES = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")
FONTS = (".woff", ".woff2", ".ttf", ".otf", ".eot")


def uid(path, kind):
    return str(uuid.uuid5(NS, kind + ":" + path))


def ftype(rel):
    """Tipo di risorsa OpenCms di un file del modulo (percorso relativo alla cartella del modulo)."""
    if rel == ".config": return "module_config"
    if rel.endswith(".jsp"): return "jsp"
    if rel.endswith(".formatter"): return "formatter_config"
    if rel.startswith("configuration/") and ".master." in rel: return "sitemap_master_config"
    if rel.startswith("plugins/") and rel.endswith(".xml"): return "site_plugin"
    if rel.startswith("i18n/"): return "propertyvfsbundle"
    if rel.lower().endswith(IMAGES): return "image"
    if rel.lower().endswith(FONTS): return "binary"
    return "plain"


def list_files(src):
    folders, files = [""], []
    for root, dirs, names in os.walk(src):
        dirs.sort()
        r = os.path.relpath(root, src).replace("\\", "/")
        r = "" if r == "." else r
        if r: folders.append(r)
        for n in sorted(names):
            rel = f"{r}/{n}" if r else n
            if rel not in SKIP:
                files.append(rel)
    return folders, files


def content_types(src):
    """Un content type per ogni schemas/<nome>.xsd, con id stabile salvato in module-types.json."""
    ids = json.load(open(TYPES_FILE)) if os.path.exists(TYPES_FILE) else {}
    names = sorted(f[:-4] for f in os.listdir(os.path.join(src, "schemas")) if f.endswith(".xsd"))
    for n in names:
        if n not in ids:
            ids[n] = max(ids.values(), default=FIRST_TYPE_ID - 1) + 1
    json.dump(ids, open(TYPES_FILE, "w"), indent=2)
    return [(n, ids[n]) for n in names]


def build(src, out, version):
    now = email.utils.formatdate(usegmt=True)
    folders, files = list_files(src)

    entries = ["<file><destination>system</destination><type>folder</type><properties/></file>",
               "<file><destination>system/modules</destination><type>folder</type><properties/></file>"]
    for f in folders:
        dest = f"{BASE}/{f}".rstrip("/")
        entries.append(f"<file><destination>{dest}</destination><type>folder</type>"
                       f"<uuidstructure>{uid(dest,'s')}</uuidstructure><datecreated>{now}</datecreated>"
                       f"<flags>0</flags><properties/><relations/><accesscontrol/></file>")
    for f in files:
        dest = f"{BASE}/{f}"
        props = ""
        if ftype(f) == "propertyvfsbundle":
            props = ("<property><name>content-encoding</name><value><![CDATA[UTF-8]]></value></property>"
                     "<property type=\"shared\"><name>content-encoding</name><value><![CDATA[UTF-8]]></value></property>")
        entries.append(f"<file><source>{dest}</source><destination>{dest}</destination><type>{ftype(f)}</type>"
                       f"<uuidstructure>{uid(dest,'s')}</uuidstructure><uuidresource>{uid(dest,'r')}</uuidresource>"
                       f"<datecreated>{now}</datecreated><flags>0</flags><properties>{props}</properties>"
                       f"<relations/><accesscontrol/></file>")

    types = content_types(src)
    rt = "".join(f'<type class="org.opencms.file.types.CmsResourceTypeXmlContent" name="{n}" id="{i}">'
                 f'<param name="schema">/{BASE}/schemas/{n}.xsd</param></type>' for n, i in types)
    et = "".join(f'<explorertype name="{n}" key="type.{n}.name" smalliconstyle="oc-icon-16-default" '
                 f'bigiconstyle="oc-icon-24-default" reference="xmlcontent">'
                 f'<newresource creatable="true" order="{900+k}" autosetnavigation="false" autosettitle="false" '
                 f'info="type.{n}.description" key="type.{n}.title"/></explorertype>' for k, (n, _) in enumerate(types))

    manifest = f"""<?xml version="1.0" encoding="UTF-8"?>
<export>
<info><infoproject>Offline</infoproject><export_version>10</export_version></info>
<module>
<name>{MOD}</name>
<nicename><![CDATA[Componenti Figma]]></nicename>
<group>Figma</group>
<class/>
<import-site>/</import-site>
<export-mode name="reduced"/>
<description><![CDATA[Componenti dal file Figma "Esempio Claude × Figma".]]></description>
<version>{version}</version>
<autoincrement>true</autoincrement>
<authorname><![CDATA[Gaetano]]></authorname>
<authoremail/><datecreated/><userinstalled/><dateinstalled/>
<dependencies/>
<exportpoints/>
<resources><resource uri="/{BASE}/"/></resources>
<excluderesources/>
<parameters/>
<resourcetypes>{rt}</resourcetypes>
<explorertypes>{et}</explorertypes>
</module>
<files>
{chr(10).join(entries)}
</files>
</export>
"""

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.xml", manifest.encode("utf-8"))
        for f in files:
            z.write(os.path.join(src, f), f"{BASE}/{f}")
    print(f"{os.path.basename(out)}: {len(files)} file, {len(folders)} cartelle, tipi {', '.join(n for n, _ in types)}")


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "1.0.0")
