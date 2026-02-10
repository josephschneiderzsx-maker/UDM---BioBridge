# Script de test pour vérifier l'agent
# Usage: .\test-agent.ps1

Write-Host "=== Vérification Agent UDM ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le service est démarré
Write-Host "1. Vérification du service..." -ForegroundColor Yellow
$service = Get-Service -Name "UDM-Agent" -ErrorAction SilentlyContinue

if ($service) {
    if ($service.Status -eq "Running") {
        Write-Host "   ✓ Service UDM-Agent est démarré" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Service UDM-Agent n'est pas démarré (Status: $($service.Status))" -ForegroundColor Red
        Write-Host "   Pour démarrer: net start UDM-Agent" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ Service UDM-Agent n'est pas installé" -ForegroundColor Red
    Write-Host "   Pour installer: InstallUtil.exe UDM-Agent.exe" -ForegroundColor Yellow
}
Write-Host ""

# Vérifier les logs récents
Write-Host "2. Derniers logs de l'agent..." -ForegroundColor Yellow
try {
    $logs = Get-EventLog -LogName Application -Source "UDM-Agent" -Newest 5 -ErrorAction SilentlyContinue
    if ($logs) {
        foreach ($log in $logs) {
            $color = if ($log.EntryType -eq "Error") { "Red" } else { "Gray" }
            Write-Host "   [$($log.TimeGenerated)] $($log.Message)" -ForegroundColor $color
        }
    } else {
        Write-Host "   ⚠ Aucun log trouvé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠ Impossible de lire les logs: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Instructions pour vérifier en base
Write-Host "3. Vérification en base de données:" -ForegroundColor Yellow
Write-Host "   Exécuter dans MySQL:" -ForegroundColor Gray
Write-Host "   SELECT id, name, agent_key, is_online, last_heartbeat FROM agents;" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   Vérifier les commandes en attente:" -ForegroundColor Gray
Write-Host "   SELECT * FROM command_queue WHERE status = 'pending' ORDER BY created_at DESC;" -ForegroundColor DarkGray
Write-Host ""

Write-Host "=== Vérification terminée ===" -ForegroundColor Cyan
