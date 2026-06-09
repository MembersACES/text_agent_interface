# Start text_agent_backend + text_agent_interface dev servers in separate terminals.
# Usage:
#   .\scripts\dev.ps1
#   .\scripts\dev.ps1 -Climate
#   npm run dev:stack

param(
    [switch]$Climate,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$InterfaceRoot = Split-Path $PSScriptRoot -Parent
$ProjectsRoot = Split-Path $InterfaceRoot -Parent
$BackendRoot = Join-Path $ProjectsRoot "text_agent_backend"
$ClimateRoot = Join-Path $ProjectsRoot "sustainability_reporting"

function Ensure-Backend {
    if (-not (Test-Path $BackendRoot)) {
        throw "Backend not found at: $BackendRoot"
    }

    $venvPython = Join-Path $BackendRoot "venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
        Push-Location $BackendRoot
        python -m venv venv
        Pop-Location
    }

    if (-not $SkipInstall) {
        Write-Host "Checking backend dependencies..." -ForegroundColor Cyan
        Push-Location $BackendRoot
        & $venvPython -m pip install -q -r requirements.txt
        Pop-Location
    }
}

function Ensure-Frontend {
    $nodeModules = Join-Path $InterfaceRoot "node_modules"
    if (-not (Test-Path $nodeModules) -and -not $SkipInstall) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
        Push-Location $InterfaceRoot
        npm install
        Pop-Location
    }
}

function Ensure-Climate {
    if (-not (Test-Path $ClimateRoot)) {
        throw "Climate platform not found at: $ClimateRoot"
    }

    $nodeModules = Join-Path $ClimateRoot "node_modules"
    if (-not (Test-Path $nodeModules) -and -not $SkipInstall) {
        Write-Host "Installing climate platform dependencies..." -ForegroundColor Cyan
        Push-Location $ClimateRoot
        npm install
        Pop-Location
    }
}

function Get-DevShell {
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwsh) {
        return $pwsh.Source
    }

    $powershell = Get-Command powershell -ErrorAction SilentlyContinue
    if ($powershell) {
        return $powershell.Source
    }

    throw "PowerShell not found. Install PowerShell 7 (pwsh) or use Windows PowerShell."
}

function Start-DevWindow {
    param(
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$Command
    )

    $shell = Get-DevShell
    $launch = @"
`$Host.UI.RawUI.WindowTitle = '$Title'
Set-Location '$WorkingDirectory'
$Command
"@

    Start-Process -FilePath $shell -ArgumentList @("-NoExit", "-Command", $launch) | Out-Null
}

Write-Host ""
Write-Host "Text Agent dev stack" -ForegroundColor Green
Write-Host "  Backend:  $BackendRoot"
Write-Host "  Frontend: $InterfaceRoot"
if ($Climate) {
    Write-Host "  Climate:  $ClimateRoot"
}
Write-Host ""

Ensure-Backend
Ensure-Frontend
if ($Climate) {
    Ensure-Climate
}

$backendCmd = ".\venv\Scripts\Activate.ps1; uvicorn main:app --reload"
$frontendCmd = "npm run dev"
$climateCmd = "npm run dev:8081"

Start-DevWindow -Title "text_agent_backend" -WorkingDirectory $BackendRoot -Command $backendCmd
Start-Sleep -Milliseconds 400
Start-DevWindow -Title "text_agent_interface" -WorkingDirectory $InterfaceRoot -Command $frontendCmd

if ($Climate) {
    Start-Sleep -Milliseconds 400
    Start-DevWindow -Title "sustainability_reporting" -WorkingDirectory $ClimateRoot -Command $climateCmd
}

Write-Host "Started dev servers in new terminal windows." -ForegroundColor Green
Write-Host "  Backend:  http://localhost:8000"
Write-Host "  Frontend: check the frontend terminal for the URL (often http://localhost:3000)"
if ($Climate) {
    Write-Host "  Climate:  http://localhost:8081"
}
Write-Host ""
