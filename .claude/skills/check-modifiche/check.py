"""Controlli ripetibili sulle modifiche del progetto, da lanciare prima di un commit o di un push.

Uso, dalla radice del repo:
    python .claude/skills/check-modifiche/check.py

Solo libreria standard. Non stampa mai i valori di .env. Esce con 1 se c'è almeno un FAIL.
"""
import os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE = "it.progetti.figma"
results = []  # (stato, nome, dettaglio)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def add(status, name, detail=""):
    results.append((status, name, detail))


def run(cmd, **kw):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)


def tracked_files():
    out = run(["git", "ls-files", "-z"]).stdout
    return [f for f in out.split("\0") if f]


def read_text(path):
    try:
        data = (ROOT / path).read_bytes()
    except OSError:
        return None
    if b"\0" in data:
        return None
    return data.decode("utf-8", errors="replace")


def env_values():
    values = {}
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.partition("=")
            if sep and not key.startswith("#"):
                values[key.strip()] = value.strip()
    return values


# ---------- controlli ----------

FORBIDDEN = [r"^dist/", r"(^|/)dev\.log$", r"^module-version\.txt$", r"(^|/)__pycache__/", r"\.pyc$", r"^\.env$",
             r"^CLAUDE\.local\.md$", r"(^|/)node_modules/", r"(^|/)storybook-static/", r"(^|/)visual-report/",
             r"\.zip$", r"^\.claude/settings\.local\.json$"]


def check_git(files):
    bad = [f for f in files if any(re.search(p, f) for p in FORBIDDEN)]
    if bad:
        add("FAIL", "file da non versionare", ", ".join(bad[:8]) + ("..." if len(bad) > 8 else ""))
    else:
        add("OK", "file da non versionare", f"{len(files)} file tracciati, nessun generato o locale")

    status = run(["git", "status", "--porcelain"]).stdout.splitlines()
    if status:
        add("WARN", "albero di lavoro", f"{len(status)} modifiche non committate (il controllo vale per i file nell'albero)")
    ahead = run(["git", "rev-list", "--count", "@{u}..HEAD"]).stdout.strip()
    if ahead.isdigit() and int(ahead) > 0:
        add("INFO", "commit da pushare", f"{ahead} rispetto al remoto")


PATTERNS = {
    "token GitHub": r"gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}",
    "token Figma": r"figd_[A-Za-z0-9_-]{20,}",
    "chiave API": r"sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[bp]-[A-Za-z0-9-]{10,}",
    "chiave privata": r"-----BEGIN [A-Z ]*PRIVATE KEY",
    "JWT": r"eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.",
}
PERSONAL = r"[A-Za-z]:[\\/]Users[\\/]|/Users/[A-Za-z0-9_.-]+/|/home/[A-Za-z0-9_.-]+/"


def check_secrets(files):
    texts = {f: read_text(f) for f in files if f != "figma-storybook/package-lock.json" and not f.endswith("package-lock.json")}
    hits = []
    for name, pat in PATTERNS.items():
        for f, t in texts.items():
            if t and re.search(pat, t):
                hits.append(f"{name} in {f}")
    values = {k: v for k, v in env_values().items()
              if k in ("OPENCMS_PASSWORD", "DB_PASSWORD", "FIGMA_FILE_KEY") and len(v) >= 4 and v != "admin"}
    for key, value in values.items():
        for f, t in texts.items():
            if t and value in t:
                hits.append(f"valore di {key} in {f}")
        if run(["git", "log", "--all", "--oneline", "-S" + value]).stdout.strip():
            hits.append(f"valore di {key} nella cronologia")
    if hits:
        add("FAIL", "segreti", "; ".join(hits[:6]))
    else:
        add("OK", "segreti", f"nessun token noto; {len(values)} valori di .env assenti da file e cronologia")

    personal = [f for f, t in texts.items() if t and re.search(PERSONAL, t)]
    if personal:
        add("WARN", "percorsi personali", "possibili percorsi con nome utente in: " + ", ".join(personal[:5]))


def check_tokens():
    if not (ROOT / "sync_tokens.py").exists():
        return
    r = run([sys.executable, "sync_tokens.py", "--check"])
    if r.returncode == 0:
        add("OK", "token generati", "tokens.css allineati a tokens.json")
    else:
        add("FAIL", "token generati", "tokens.css non allineati: lancia python sync_tokens.py")


def check_export():
    """I file del modulo generati da Storybook (export:opencms) devono essere allineati ai sorgenti."""
    script = ROOT / "figma-storybook" / "scripts" / "export-opencms.mjs"
    node = shutil.which("node")
    if not script.exists() or not node:
        return
    r = run([node, str(script), "--check"])
    if r.returncode == 0:
        add("OK", "export OpenCms", "file del modulo allineati a Storybook")
    else:
        add("FAIL", "export OpenCms", "modulo non allineato: lancia npm run export:opencms in figma-storybook")


def check_python(files):
    errors = []
    py = [f for f in files if f.endswith(".py")]
    for f in py:
        try:
            compile((ROOT / f).read_text(encoding="utf-8"), f, "exec")
        except SyntaxError as e:
            errors.append(f"{f}:{e.lineno}")
    add("FAIL" if errors else "OK", "sintassi Python", ", ".join(errors) if errors else f"{len(py)} file")


def check_powershell(files):
    ps = [f for f in files if f.endswith(".ps1")]
    exe = shutil.which("powershell") or shutil.which("pwsh")
    if not ps or not exe:
        return
    for f in ps:
        path = str(ROOT / f).replace("'", "''")
        cmd = ("$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('" + path +
               "',[ref]$null,[ref]$e); if($e){$e|ForEach-Object{$_.Message};exit 1}")
        r = run([exe, "-NoProfile", "-Command", cmd])
        add("OK" if r.returncode == 0 else "FAIL", f"sintassi PowerShell ({f})", r.stdout.strip()[:200])
        # Windows PowerShell 5.1 legge UTF-8 senza BOM come ANSI: i caratteri non ASCII nelle stringhe si rovinano.
        text = read_text(f) or ""
        bad = [i for i, l in enumerate(text.splitlines(), 1) if not l.lstrip().startswith("#") and any(ord(c) > 127 for c in l)]
        if bad:
            add("WARN", f"non ASCII in {f}", "righe " + ", ".join(map(str, bad[:6])) + " (PowerShell 5.1 senza BOM)")


def check_compose():
    compose = ROOT / "docker" / "docker-compose.yml"
    if not compose.exists() or not shutil.which("docker"):
        return
    if not (ROOT / ".env").exists():
        add("WARN", "docker compose", "manca .env, configurazione non verificata")
        return
    r = run(["docker", "compose", "--env-file", ".env", "-f", "docker/docker-compose.yml", "config", "-q"])
    add("OK" if r.returncode == 0 else "FAIL", "docker compose", "" if r.returncode == 0 else r.stderr.strip()[:200])


def check_module():
    if not (ROOT / "build_module.py").exists() or not (ROOT / MODULE).is_dir():
        return
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "prova.zip")
        r = run([sys.executable, "build_module.py", MODULE, out, "0.0.0"])
        ok = r.returncode == 0 and os.path.exists(out)
    add("OK" if ok else "FAIL", "build del modulo", r.stdout.strip().splitlines()[-1] if ok and r.stdout.strip() else r.stderr.strip()[-200:])
    if run(["git", "diff", "--quiet", "--", "module-types.json"]).returncode != 0:
        add("WARN", "module-types.json", "modificato: gli id dei content type devono restare stabili, controlla il diff")


def check_storybook():
    sb = ROOT / "figma-storybook"
    npm = shutil.which("npm")
    if not (sb / "node_modules").exists() or not npm:
        add("SKIP", "check:figma", "node_modules assente o npm non trovato (npm install in figma-storybook)")
        return
    r = subprocess.run([npm, "run", "-s", "check:figma"], cwd=sb, capture_output=True, text=True, encoding="utf-8", errors="replace")
    add("OK" if r.returncode == 0 else "FAIL", "check:figma", (r.stdout.strip() or r.stderr.strip()).splitlines()[-1][:200] if (r.stdout or r.stderr).strip() else "")


def check_docs(files):
    names = set(files)
    missing = []
    for doc in ("README.md", "CLAUDE.md"):
        text = read_text(doc)
        if text is None:
            continue
        for target in re.findall(r"\]\(([^)\s]+)\)", text):
            if re.match(r"(https?:|mailto:|#)", target):
                continue
            if not (ROOT / target.split("#")[0]).exists():
                missing.append(f"{doc}: link {target}")
        for token in set(re.findall(r"`([\w./-]+\.(?:py|ps1|bat|json|md|yml|xml|xsd|js|css|html))`", text)):
            exists = (ROOT / token).exists() or any(n == token or n.endswith("/" + token) for n in names)
            if not exists:
                missing.append(f"{doc}: `{token}`")
    if missing:
        add("WARN", "riferimenti nei documenti", "non trovati: " + "; ".join(missing[:8]))
    else:
        add("OK", "riferimenti nei documenti", "link e file citati in README.md e CLAUDE.md esistono")


def main():
    files = tracked_files()
    check_git(files)
    check_secrets(files)
    check_tokens()
    check_export()
    check_python(files)
    check_powershell(files)
    check_compose()
    check_module()
    check_storybook()
    check_docs(files)

    for status, name, detail in results:
        print(f"[{status}] {name}" + (f" - {detail}" if detail else ""))
    fails = sum(1 for s, _, _ in results if s == "FAIL")
    warns = sum(1 for s, _, _ in results if s == "WARN")
    print(f"\nRISULTATO: {fails} FAIL, {warns} WARN")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
