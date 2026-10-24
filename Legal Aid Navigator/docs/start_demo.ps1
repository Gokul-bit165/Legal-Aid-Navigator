# Starts a clean demo of Legal Aid Navigator on a separate database.
#
#   powershell -ExecutionPolicy Bypass -File docs\start_demo.ps1            (default ports 8000 / 5174)
#   powershell -ExecutionPolicy Bypass -File docs\start_demo.ps1 -Force     (stop whatever uses those ports)
#   ... -BackendPort 8010 -FrontendPort 5175                                 (run beside your own servers)
#
# - Uses backend\legal_aid_demo.db (recreated every run), so your main database is untouched.
# - Seeds the admin account and the sample applications with dates relative to TODAY, so the
#   "court deadline in 3 days" record is correct on the day you record.
# - Registers the demo applicant, then starts the backend and frontend.
# - Frontend ports must be 5173-5175: the backend only allows those origins.

param(
  [int]$BackendPort  = 8000,
  [int]$FrontendPort = 5174,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$front   = Join-Path $root 'frontend'
$demoDb  = Join-Path $backend 'legal_aid_demo.db'

$busy = Get-NetTCPConnection -LocalPort $BackendPort, $FrontendPort -ErrorAction SilentlyContinue |
        Where-Object { $_.State -in 'Listen', 'Bound' }
if ($busy) {
  if (-not $Force) {
    Write-Host "Port $($busy.LocalPort -join ', ') is already in use (process $($busy.OwningProcess -join ', '))."
    Write-Host 'Close that window first, pick other ports, or re-run with -Force to stop it.'
    exit 1
  }
  $busy | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  for ($i = 0; $i -lt 20; $i++) {
    if (-not (Get-NetTCPConnection -LocalPort $BackendPort, $FrontendPort -ErrorAction SilentlyContinue |
              Where-Object { $_.State -in 'Listen', 'Bound' })) { break }
    Start-Sleep -Milliseconds 500
  }
}

if (Test-Path $demoDb) { Remove-Item $demoDb -Force }   # only the demo database, never legal_aid.db

$env:DATABASE_URL = "sqlite:///./legal_aid_demo.db"
Start-Process -FilePath python -ArgumentList '-m','uvicorn','app.main:app','--port',"$BackendPort" `
  -WorkingDirectory $backend -WindowStyle Minimized `
  -RedirectStandardOutput (Join-Path $root 'demo_backend.log') -RedirectStandardError (Join-Path $root 'demo_backend.err.log')

Write-Host 'Waiting for the backend...'
$api   = "http://localhost:$BackendPort"          # what the browser uses
$probe = "http://127.0.0.1:$BackendPort"          # the backend listens on IPv4; PowerShell tries IPv6 for "localhost" first
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  try { Invoke-RestMethod "$probe/" -TimeoutSec 3 | Out-Null; $ready = $true; break } catch { Start-Sleep -Seconds 1 }
}
if (-not $ready) { Write-Host 'Backend did not start. See demo_backend.err.log'; exit 1 }

# Demo applicant (the admin and sample applications are created by the backend on first start)
$body = @{ username = 'demo_user'; email = 'demo.user@example.com'; password = 'Demo@12345' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$probe/api/v1/auth/register" -ContentType 'application/json' -Body $body | Out-Null

$env:VITE_API_URL = $api
Start-Process -FilePath npm.cmd -ArgumentList 'run','dev','--','--port',"$FrontendPort" `
  -WorkingDirectory $front -WindowStyle Minimized `
  -RedirectStandardOutput (Join-Path $root 'demo_frontend.log') -RedirectStandardError (Join-Path $root 'demo_frontend.err.log')

Start-Sleep -Seconds 6
Write-Host ''
Write-Host 'Ready.'
Write-Host "  App:        http://localhost:$FrontendPort"
Write-Host '  Applicant:  demo_user / Demo@12345'
Write-Host '  Admin:      admin / Admin@12345'
