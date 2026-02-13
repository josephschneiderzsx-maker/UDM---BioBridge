# Script de build (Release) puis preparation des livrables SERVER et AGENT
# Genere UDM\SERVER et UDM\AGENT a partir des projets compiles

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

Write-Host "=== Build et preparation SERVER / AGENT ===" -ForegroundColor Green

# Trouver MSBuild
$msbuild = $null
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vswhere) {
    $msbuildPath = & $vswhere -latest -requires Microsoft.Component.MSBuild -find "MSBuild\**\Bin\MSBuild.exe" | Select-Object -First 1
    if ($msbuildPath) { $msbuild = $msbuildPath }
}
if (-not $msbuild) {
    $candidates = @(
        "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe",
        "C:\Program Files\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe",
        "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe",
        "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $msbuild = $c; break }
    }
}
if (-not $msbuild) {
    Write-Host "MSBuild introuvable. Installez Visual Studio avec la charge de travail .NET Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "MSBuild: $msbuild" -ForegroundColor Gray

# 1. Build du SERVER (Service) en Release
Write-Host "`n[1/3] Compilation du SERVER (Release)..." -ForegroundColor Cyan
$serverSln = "BioBridgeDoorControl\BioBridgeDoorControlService.sln"
& $msbuild $serverSln /t:Build /p:Configuration=Release /p:Platform="Any CPU" /v:minimal
if ($LASTEXITCODE -ne 0) {
    Write-Host "Echec build SERVER." -ForegroundColor Red
    exit 1
}
Write-Host "SERVER compile avec succes." -ForegroundColor Green

# 2. Build de l'AGENT en Release (depend des DLL du Service en Release)
Write-Host "`n[2/3] Compilation de l'AGENT (Release)..." -ForegroundColor Cyan
$agentSln = "BioBridgeDoorControl\BioBridgeDoorControlAgent\BioBridgeDoorControlAgent.sln"
& $msbuild $agentSln /t:Build /p:Configuration=Release /p:Platform="Any CPU" /v:minimal
if ($LASTEXITCODE -ne 0) {
    Write-Host "Echec build AGENT." -ForegroundColor Red
    exit 1
}
Write-Host "AGENT compile avec succes." -ForegroundColor Green

# 3. Preparation des livrables (UDM\SERVER, UDM\AGENT, UDM\MOBILE_APP)
Write-Host "`n[3/3] Preparation des livrables (prepare-delivery)..." -ForegroundColor Cyan
& "$scriptRoot\prepare-delivery.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Echec prepare-delivery." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Termine ===" -ForegroundColor Green
Write-Host "Dossiers prepares:" -ForegroundColor Cyan
Write-Host "  UDM\SERVER\" -ForegroundColor Yellow
Get-ChildItem "UDM\SERVER" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }
Write-Host "  UDM\AGENT\" -ForegroundColor Yellow
Get-ChildItem "UDM\AGENT" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }
