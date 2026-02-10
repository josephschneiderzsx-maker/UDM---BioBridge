# Script de préparation des livrables client
# Ce script organise les fichiers dans la structure UDM/

Write-Host "Preparation des livrables client..." -ForegroundColor Green

# Créer les dossiers si nécessaire
$folders = @("UDM\SERVER", "UDM\AGENT", "UDM\MOBILE_APP")
foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Force -Path $folder | Out-Null
        Write-Host "Cree: $folder" -ForegroundColor Yellow
    }
}

# Copier les fichiers du serveur
Write-Host "`nCopie des fichiers SERVER..." -ForegroundColor Cyan
$serverFiles = @(
    "BioBridgeDoorControl\BioBridgeDoorControlService\bin\Release\UDM.exe",
    "BioBridgeDoorControl\BioBridgeDoorControlService\bin\Release\UDM.exe.config",
    "BioBridgeDoorControl\BioBridgeDoorControlService\bin\Release\*.dll"
)

foreach ($pattern in $serverFiles) {
    if (Test-Path $pattern) {
        Copy-Item -Path $pattern -Destination "UDM\SERVER\" -Force -ErrorAction SilentlyContinue
        Write-Host "  Copie: $pattern" -ForegroundColor Gray
    }
}

# Copier les fichiers de l'agent
Write-Host "`nCopie des fichiers AGENT..." -ForegroundColor Cyan
$agentFiles = @(
    "BioBridgeDoorControl\BioBridgeDoorControlAgent\bin\Release\UDM-Agent.exe",
    "BioBridgeDoorControl\BioBridgeDoorControlAgent\bin\Release\UDM-Agent.exe.config",
    "BioBridgeDoorControl\BioBridgeDoorControlAgent\bin\Release\*.dll"
)

foreach ($pattern in $agentFiles) {
    if (Test-Path $pattern) {
        Copy-Item -Path $pattern -Destination "UDM\AGENT\" -Force -ErrorAction SilentlyContinue
        Write-Host "  Copie: $pattern" -ForegroundColor Gray
    }
}

# Copier l'application mobile
Write-Host "`nCopie des fichiers MOBILE_APP..." -ForegroundColor Cyan
$mobileFiles = @(
    "mobile-app\App.js",
    "mobile-app\app.json",
    "mobile-app\package.json",
    "mobile-app\babel.config.js",
    "mobile-app\screens\*",
    "mobile-app\services\*"
)

foreach ($pattern in $mobileFiles) {
    if (Test-Path $pattern) {
        if ($pattern -like "*\*") {
            # C'est un pattern avec wildcard
            $dir = Split-Path $pattern -Parent
            $file = Split-Path $pattern -Leaf
            $destDir = "UDM\MOBILE_APP\$dir" -replace "mobile-app\\", ""
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Force -Path $destDir | Out-Null
            }
            Copy-Item -Path $pattern -Destination $destDir -Force -Recurse -ErrorAction SilentlyContinue
        } else {
            Copy-Item -Path $pattern -Destination "UDM\MOBILE_APP\" -Force -Recurse -ErrorAction SilentlyContinue
        }
        Write-Host "  Copie: $pattern" -ForegroundColor Gray
    }
}

# Copier InstallUtil si disponible
$installUtil32 = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe"
$installUtil64 = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe"

if (Test-Path $installUtil32) {
    Copy-Item -Path $installUtil32 -Destination "UDM\SERVER\InstallUtil32.exe" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path $installUtil32 -Destination "UDM\AGENT\InstallUtil32.exe" -Force -ErrorAction SilentlyContinue
}

if (Test-Path $installUtil64) {
    Copy-Item -Path $installUtil64 -Destination "UDM\SERVER\InstallUtil64.exe" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path $installUtil64 -Destination "UDM\AGENT\InstallUtil64.exe" -Force -ErrorAction SilentlyContinue
}

Write-Host "`nPreparation terminee!" -ForegroundColor Green
Write-Host "`nStructure creee:" -ForegroundColor Cyan
Write-Host "  UDM\SERVER\" -ForegroundColor Yellow
Write-Host "  UDM\AGENT\" -ForegroundColor Yellow
Write-Host "  UDM\MOBILE_APP\" -ForegroundColor Yellow
Write-Host "`nDocumentation disponible dans UDM\" -ForegroundColor Cyan
