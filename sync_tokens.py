"""Genera tokens.css da figma-storybook/figma/tokens.json (fonte unica) e lo scrive in tutti i punti che lo usano.

Uso, dalla cartella opencms/:
    python sync_tokens.py           # rigenera i file
    python sync_tokens.py --check   # esce con 1 se un file non è allineato al JSON

Nomi: brand/primary → --brand-primary. I numeri delle variabili Figma diventano px; gli "styles" restano come scritti.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "figma-storybook", "figma", "tokens.json")
TARGETS = [
    os.path.join(HERE, "figma-storybook", "src", "tokens.css"),
    os.path.join(HERE, "it.progetti.figma", "resources", "css", "tokens.css"),
]

# Ordine e titolo dei gruppi nel CSS; i gruppi non elencati vanno in fondo col loro nome.
GROUPS = {"brand": "Brand", "text": "Testo", "surface": "Superfici", "border": "Bordi",
          "space": "Spaziature", "radius": "Raggi", "font": "Font", "shadow": "Ombre"}
NUMBER = re.compile(r"^-?\d+(\.\d+)?$")


def css_name(name):
    return "--" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def css_value(value):
    return f"{value}px" if NUMBER.match(str(value)) and str(value) != "0" else str(value)


def sort_key(item):
    name, value = item
    group = name.split("/")[0]
    order = list(GROUPS).index(group) if group in GROUPS else len(GROUPS)
    # Nello stesso gruppo: i numeri dal più piccolo, il resto in ordine alfabetico.
    num = float(value) if NUMBER.match(str(value)) else 0
    return (order, group, num, name)


def block(tokens, px=True):
    lines, current = [], None
    for name, value in sorted(tokens.items(), key=sort_key):
        group = name.split("/")[0]
        if group != current:
            if current is not None:
                lines.append("")
            lines.append(f"  /* {GROUPS.get(group, group)} */")
            current = group
        lines.append(f"  {css_name(name)}: {css_value(value) if px else value};")
    return lines


def render(data):
    src = data["source"]
    out = [
        "/*",
        " * GENERATO da sync_tokens.py: non modificare a mano, cambia figma-storybook/figma/tokens.json.",
        f" * Variabili del file Figma (nodo {src['nodeId']}, {src['date']}).",
        " * Stessi nomi delle variabili Figma: brand/primary → --brand-primary.",
        " */",
        ":root {",
        *block(data["variables"]),
    ]
    if data.get("styles"):
        out += ["", "  /* ---- Non sono variabili in Figma: valori presi dagli stili dei nodi ---- */", "", *block(data["styles"], px=False)]
    out.append("}")
    return "\n".join(out) + "\n"


def main():
    check = "--check" in sys.argv
    with open(SOURCE, encoding="utf-8") as f:
        data = json.load(f)
    clash = set(map(css_name, data["variables"])) & set(map(css_name, data.get("styles", {})))
    if clash:
        sys.exit(f"Stesso nome in variables e styles: {', '.join(sorted(clash))}")

    css = render(data)
    stale = 0
    for path in TARGETS:
        rel = os.path.relpath(path, HERE)
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
        if old == css:
            print(f"{rel}  allineato")
        elif check:
            print(f"{rel}  NON allineato")
            stale += 1
        else:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(css)
            print(f"{rel}  aggiornato")
    sys.exit(1 if stale else 0)


if __name__ == "__main__":
    main()
