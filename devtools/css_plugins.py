"""Registrazione automatica dei CSS: ogni resources/css/<nome>.css ha il suo plugin e la voce in configurazione."""
import os, re

from build_module import MOD

from .config import SRC
from .log import log

CSS_DIR = os.path.join(SRC, "resources", "css")
PLUGINS_DIR = os.path.join(SRC, "plugins")
CONFIG_FILE = os.path.join(SRC, "configuration", "figma.master.additions.xml")
CSS_TARGET = f"/system/modules/{MOD}/resources/css/"
PLUGIN_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>

<SitePlugins xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="opencms://system/modules/org.opencms.ade.config/schemas/site_plugin.xsd">
  <SitePlugin language="en">
    <NiceName><![CDATA[{name} CSS]]></NiceName>
    <Description/>
    <Plugin>
      <Group><![CDATA[css]]></Group>
      <Target>
        <link internal="true" type="WEAK">
          <target><![CDATA[{css}]]></target>
        </link>
      </Target>
      <Order><![CDATA[{order}]]></Order>
    </Plugin>
  </SitePlugin>
</SitePlugins>
"""
PLUGIN_ENTRY = """      <Plugin>
        <link type="WEAK">
          <target><![CDATA[/system/modules/{mod}/plugins/{stem}.xml]]></target>
        </link>
      </Plugin>
"""


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def sync_css_plugins():
    """Ogni resources/css/<nome>.css ha plugins/<nome>.xml ed è elencato nella configurazione; se il CSS sparisce, sparisce anche il resto."""
    if not os.path.isdir(CSS_DIR):
        return
    stems = {f[:-4] for f in os.listdir(CSS_DIR) if f.endswith(".css")}
    config = read(CONFIG_FILE)
    orders = []
    existing = {}
    for f in os.listdir(PLUGINS_DIR):
        if f.endswith(".xml"):
            xml = read(os.path.join(PLUGINS_DIR, f))
            m = re.search(r"<target><!\[CDATA\[" + re.escape(CSS_TARGET) + r"([^/\]]+)\.css\]\]></target>", xml)
            if m:
                existing[f[:-4]] = m.group(1)
                o = re.search(r"<Order><!\[CDATA\[(\d+)\]\]></Order>", xml)
                orders.append(int(o.group(1)) if o else 0)
    next_order = max(orders, default=100) + 10

    for stem in sorted(stems):
        if stem in existing.values():
            continue
        write(os.path.join(PLUGINS_DIR, stem + ".xml"),
              PLUGIN_TEMPLATE.format(name=stem, css=f"{CSS_TARGET}{stem}.css", order=next_order))
        next_order += 10
        existing[stem] = stem
        log(f"CSS nuovo {stem}.css: creato plugins/{stem}.xml")

    for plugin, css in list(existing.items()):
        if css not in stems:
            os.remove(os.path.join(PLUGINS_DIR, plugin + ".xml"))
            config = re.sub(r"\s*<Plugin>\s*<link type=\"WEAK\">\s*<target><!\[CDATA\[[^\]]*/plugins/"
                            + re.escape(plugin) + r"\.xml\]\]></target>\s*</link>\s*</Plugin>", "", config)
            del existing[plugin]
            log(f"CSS {css}.css eliminato: rimosso plugins/{plugin}.xml")

    # Voci di configurazione il cui file plugin non esiste più.
    for plugin in re.findall(r"/plugins/([^/\]]+)\.xml\]\]></target>", config):
        if not os.path.exists(os.path.join(PLUGINS_DIR, plugin + ".xml")):
            config = re.sub(r"\s*<Plugin>\s*<link type=\"WEAK\">\s*<target><!\[CDATA\[[^\]]*/plugins/"
                            + re.escape(plugin) + r"\.xml\]\]></target>\s*</link>\s*</Plugin>", "", config)
            log(f"rimossa dalla configurazione la voce orfana plugins/{plugin}.xml")

    for plugin in sorted(existing):
        if f"/plugins/{plugin}.xml" not in config:
            config = config.replace("    </AddPlugins>", PLUGIN_ENTRY.format(mod=MOD, stem=plugin) + "    </AddPlugins>")
    if config != read(CONFIG_FILE):
        write(CONFIG_FILE, config)
