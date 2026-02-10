# Script de test pour l'API UDM
# Usage: .\test-api.ps1

$baseUrl = "http://localhost:8080"
$tenant = "entreprise-1"
$email = "admin@example.com"
$password = "password123"

Write-Host "=== Test API UDM ===" -ForegroundColor Cyan
Write-Host ""

# Étape 1: Login
Write-Host "1. Test de login..." -ForegroundColor Yellow
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/$tenant/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.token
    Write-Host "   ✓ Login réussi" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ✗ Erreur de login: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Détails: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

# Étape 2: Liste des portes
Write-Host "2. Test GET /doors..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    $doorsResponse = Invoke-RestMethod -Uri "$baseUrl/$tenant/doors" `
        -Method GET `
        -Headers $headers
    
    Write-Host "   ✓ Liste des portes récupérée" -ForegroundColor Green
    Write-Host "   Nombre de portes: $($doorsResponse.doors.Count)" -ForegroundColor Gray
    foreach ($door in $doorsResponse.doors) {
        Write-Host "     - $($door.name) (ID: $($door.id), IP: $($door.terminal_ip))" -ForegroundColor Gray
    }
    Write-Host ""
    
    if ($doorsResponse.doors.Count -eq 0) {
        Write-Host "   ⚠ Aucune porte trouvée" -ForegroundColor Yellow
        Write-Host ""
    } else {
        $firstDoorId = $doorsResponse.doors[0].id
        
        # Étape 3: Ouvrir une porte
        Write-Host "3. Test POST /doors/$firstDoorId/open..." -ForegroundColor Yellow
        try {
            $openBody = @{
                delay = 3000
            } | ConvertTo-Json
            
            $openResponse = Invoke-RestMethod -Uri "$baseUrl/$tenant/doors/$firstDoorId/open" `
                -Method POST `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $openBody
            
            Write-Host "   ✓ Commande d'ouverture envoyée" -ForegroundColor Green
            Write-Host "   Command ID: $($openResponse.command_id)" -ForegroundColor Gray
            Write-Host ""
            
            # Étape 4: Vérifier le statut
            Write-Host "4. Test GET /doors/$firstDoorId/status..." -ForegroundColor Yellow
            try {
                $statusResponse = Invoke-RestMethod -Uri "$baseUrl/$tenant/doors/$firstDoorId/status" `
                    -Method GET `
                    -Headers $headers
                
                Write-Host "   ✓ Statut récupéré" -ForegroundColor Green
                Write-Host "   Message: $($statusResponse.message)" -ForegroundColor Gray
                Write-Host ""
            } catch {
                Write-Host "   ⚠ Erreur lors de la récupération du statut: $($_.Exception.Message)" -ForegroundColor Yellow
                Write-Host ""
            }
            
        } catch {
            Write-Host "   ✗ Erreur lors de l'ouverture: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.ErrorDetails.Message) {
                Write-Host "   Détails: $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
            Write-Host ""
        }
    }
    
} catch {
    Write-Host "   ✗ Erreur lors de la récupération des portes: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Détails: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   ⚠ Token expiré ou invalide" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "=== Tests terminés ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour vérifier la file d'attente en base:" -ForegroundColor Gray
Write-Host "  SELECT * FROM command_queue ORDER BY created_at DESC LIMIT 5;" -ForegroundColor DarkGray
