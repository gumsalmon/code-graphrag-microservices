Write-Host "--- Testing Baseline P01 Runtime ---"

$directResponse = Invoke-WebRequest -Uri "http://localhost:18082/pets/visits?petId=7,8" -ErrorAction SilentlyContinue
if ($null -eq $directResponse) {
    Write-Host "Direct GET /pets/visits?petId=7,8 -> HTTP Error"
} else {
    Write-Host "Direct GET /pets/visits?petId=7,8 -> HTTP $($directResponse.StatusCode)"
    Write-Host "Direct Response: $($directResponse.Content)"
}

$gatewayResponse = Invoke-WebRequest -Uri "http://localhost:18080/api/gateway/owners/6" -ErrorAction SilentlyContinue
if ($null -eq $gatewayResponse) {
    Write-Host "Gateway GET /api/gateway/owners/6 -> HTTP Error"
} else {
    Write-Host "Gateway GET /api/gateway/owners/6 -> HTTP $($gatewayResponse.StatusCode)"
    Write-Host "Gateway Response: $($gatewayResponse.Content)"
}
