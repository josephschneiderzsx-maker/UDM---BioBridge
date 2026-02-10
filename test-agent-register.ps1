$body = @{
    agent_key = "CHANGE_ME_AGENT_KEY_1"
    enterprise_id = 1
    name = "Agent"
    version = "1.0.0"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/agents/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "Success:" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
