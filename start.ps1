# Avvia tutto il necessario per lavorare su OpenCms in locale:
# Docker Desktop -> container (DB + OpenCms) -> attesa del server -> dev.py (sincronizzazione del modulo).
# Uso: .\start.ps1   (oppure doppio clic su start.bat)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$compose = Join-Path $here "docker\docker-compose.yml"
$envFile = Join-Path $here ".env"
$server = "http://localhost:8080"

function Test-Docker {
    # cmd evita che lo stderr di docker diventi un errore bloccante di PowerShell
    cmd /c "docker info >nul 2>&1"
    return $LASTEXITCODE -eq 0
}

if (-not (Test-Path $envFile)) { throw "Manca .env: copia .env.example in .env e imposta le password" }

if (-not (Test-Docker)) {
    $exe = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $exe)) { throw "Docker Desktop non trovato in $exe" }
    Write-Host "Avvio Docker Desktop..."
    Start-Process $exe
    $end = (Get-Date).AddMinutes(3)
    while (-not (Test-Docker)) {
        if ((Get-Date) -gt $end) { throw "Docker non e' partito entro 3 minuti" }
        Start-Sleep -Seconds 3
    }
}

Write-Host "Avvio i container..."
docker compose --env-file $envFile -f $compose up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up non riuscito" }

Write-Host "Attendo OpenCms su $server (il primo avvio puo' richiedere diversi minuti)..."
$end = (Get-Date).AddMinutes(10)
while ($true) {
    try {
        Invoke-WebRequest "$server/system/login" -UseBasicParsing -TimeoutSec 5 | Out-Null
        break
    } catch {
        if ((Get-Date) -gt $end) { throw "OpenCms non risponde dopo 10 minuti" }
        Start-Sleep -Seconds 3
    }
}
Write-Host "OpenCms pronto: $server/system/login  (credenziali in .env)"
Start-Process "$server/system/login"

Set-Location $here
python dev.py
