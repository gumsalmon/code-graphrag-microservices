Write-Host "--- Testing Mutated P01 Runtime ---"

$directNoParam = Invoke-WebRequest -Uri "http://localhost:18082/pets/visits?petId=7,8" -ErrorAction SilentlyContinue
if ($null -eq $directNoParam) {
    Write-Host "Direct GET missing includeDetails -> HTTP Error (likely 400 or 500, check logs)"
} else {
    Write-Host "Direct GET missing includeDetails -> HTTP $($directNoParam.StatusCode)"
}
# Actually in powershell, Invoke-WebRequest throws on 400. To catch status code on error:
try {
    $r = Invoke-WebRequest -Uri "http://localhost:18082/pets/visits?petId=7,8" -ErrorAction Stop
    Write-Host "Direct GET missing includeDetails -> HTTP $($r.StatusCode)"
} catch {
    Write-Host "Direct GET missing includeDetails -> HTTP $($_.Exception.Response.StatusCode.value__)"
}

try {
    $r = Invoke-WebRequest -Uri "http://localhost:18082/pets/visits?petId=7,8&includeDetails=true" -ErrorAction Stop
    Write-Host "Direct GET with includeDetails -> HTTP $($r.StatusCode)"
    Write-Host "Direct Response: $($r.Content)"
} catch {
    Write-Host "Direct GET with includeDetails -> HTTP $($_.Exception.Response.StatusCode.value__)"
}

try {
    $r = Invoke-WebRequest -Uri "http://localhost:18080/api/gateway/owners/6" -ErrorAction Stop
    Write-Host "Gateway GET /api/gateway/owners/6 -> HTTP $($r.StatusCode)"
    Write-Host "Gateway Response: $($r.Content)"
} catch {
    Write-Host "Gateway GET /api/gateway/owners/6 -> HTTP $($_.Exception.Response.StatusCode.value__)"
}
