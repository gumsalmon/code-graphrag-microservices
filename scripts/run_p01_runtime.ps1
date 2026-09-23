param(
    [string]$OutputRoot = "",
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $repositoryRoot "benchmark/p01/derived/docker-compose-rerun.yml"
$projectName = "p01-independent-rerun"
$baselineVisitsImage = "p01/visits:baseline-3858f9c"
$mutatedVisitsImage = "p01/visits:mutated-42394ca3"
$expectedConfigRevision = "323993ce2519c6d02df63e08bf4458d123d3b611"

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputRoot = Join-Path $repositoryRoot "benchmark/p01/raw/rerun-$timestamp"
}

$null = New-Item -ItemType Directory -Force -Path $OutputRoot
$null = New-Item -ItemType Directory -Force -Path (Join-Path $OutputRoot "logs")
$requestsPath = Join-Path $OutputRoot "requests.jsonl"
$commandsPath = Join-Path $OutputRoot "commands.log"

function Write-CommandRecord {
    param([string]$Command, [int]$ExitCode)
    $record = "{0}`texit={1}`t{2}" -f (Get-Date -Format "o"), $ExitCode, $Command
    Add-Content -LiteralPath $commandsPath -Value $record -Encoding utf8
}

function Invoke-DockerCompose {
    param([string[]]$Arguments)
    & docker compose -p $projectName -f $composeFile @Arguments
    $exitCode = $LASTEXITCODE
    Write-CommandRecord -Command ("docker compose -p {0} -f {1} {2}" -f $projectName, $composeFile, ($Arguments -join " ")) -ExitCode $exitCode
    if ($exitCode -ne 0) {
        throw "Docker Compose failed with exit code ${exitCode}: $($Arguments -join ' ')"
    }
}

function Wait-Http {
    param(
        [string]$Uri,
        [int[]]$AcceptedStatus = @(200),
        [int]$Attempts = 80,
        [int]$DelaySeconds = 3
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Uri -SkipHttpErrorCheck -TimeoutSec 10
            if ($AcceptedStatus -contains [int]$response.StatusCode) {
                return $response
            }
        }
        catch {
            # Startup connection failures are expected while the service is becoming ready.
        }
        Start-Sleep -Seconds $DelaySeconds
    }

    throw "Timed out waiting for $Uri with status in $($AcceptedStatus -join ',')"
}

function Get-ComposeServiceIp {
    param([string]$Service)

    $containerId = (& docker compose -p $projectName -f $composeFile ps -q $Service).Trim()
    Write-CommandRecord -Command "docker compose ps -q $Service" -ExitCode $LASTEXITCODE
    if ([string]::IsNullOrWhiteSpace($containerId)) {
        throw "No running container found for Compose service: $Service"
    }

    $ipAddress = (& docker inspect --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" $containerId).Trim()
    Write-CommandRecord -Command "docker inspect service IP $Service" -ExitCode $LASTEXITCODE
    if ([string]::IsNullOrWhiteSpace($ipAddress)) {
        throw "No container IP found for Compose service: $Service"
    }

    return $ipAddress
}

function Wait-EurekaInstance {
    param(
        [string]$Application,
        [string]$ExpectedIp,
        [long]$MinimumUpdatedTimestamp = 0,
        [int]$Attempts = 100,
        [int]$DelaySeconds = 3
    )

    $uri = "http://localhost:28761/eureka/apps/$Application"
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $uri -Headers @{ Accept = "application/json" } -SkipHttpErrorCheck -TimeoutSec 10
            if ([int]$response.StatusCode -eq 200) {
                $payload = $response.Content | ConvertFrom-Json
                foreach ($instance in @($payload.application.instance)) {
                    $isExpectedInstance =
                        ([string]$instance.status -eq "UP") -and
                        ([string]$instance.ipAddr -eq $ExpectedIp) -and
                        ([long]$instance.lastUpdatedTimestamp -ge $MinimumUpdatedTimestamp)
                    if ($isExpectedInstance) {
                        return $response
                    }
                }
            }
        }
        catch {
            # A missing registration is expected while a recreated service is starting.
        }
        Start-Sleep -Seconds $DelaySeconds
    }

    throw "Timed out waiting for Eureka $Application at IP $ExpectedIp with lastUpdatedTimestamp >= $MinimumUpdatedTimestamp"
}

function Get-ComposeLogMatchCount {
    param(
        [string]$Service,
        [string]$Pattern
    )

    $logLines = @(& docker compose -p $projectName -f $composeFile logs --no-color $Service 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Could not read Compose logs for service: $Service"
    }
    return @($logLines | Select-String -SimpleMatch $Pattern).Count
}

function Wait-GatewayRoutesToMutatedVisits {
    param(
        [int]$Attempts = 30,
        [int]$DelaySeconds = 3
    )

    $missingParameterSignal = "MissingServletRequestParameterException: Required request parameter 'includeDetails'"
    $uri = "http://localhost:28080/api/gateway/owners/6"
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        $beforeCount = Get-ComposeLogMatchCount -Service "visits-service" -Pattern $missingParameterSignal
        try {
            $response = Invoke-WebRequest -Uri $uri -SkipHttpErrorCheck -TimeoutSec 30
        }
        catch {
            $response = $null
        }
        Start-Sleep -Seconds 1
        $afterCount = Get-ComposeLogMatchCount -Service "visits-service" -Pattern $missingParameterSignal

        if (($null -ne $response) -and ([int]$response.StatusCode -eq 200) -and ($afterCount -gt $beforeCount)) {
            Write-CommandRecord -Command "gateway discovery preflight reached mutated visits-service on attempt $attempt" -ExitCode 0
            return $response
        }
        Start-Sleep -Seconds $DelaySeconds
    }

    throw "Gateway did not route to the mutated visits-service within the allowed attempts"
}

function Record-Request {
    param(
        [string]$Id,
        [string]$Snapshot,
        [string]$Uri
    )

    $startedAt = Get-Date -Format "o"
    try {
        $response = Invoke-WebRequest -Uri $Uri -SkipHttpErrorCheck -TimeoutSec 30
        $record = [ordered]@{
            id = $Id
            snapshot = $Snapshot
            timestamp = $startedAt
            method = "GET"
            uri = $Uri
            exit_code = 0
            http_status = [int]$response.StatusCode
            body = [string]$response.Content
        }
    }
    catch {
        $record = [ordered]@{
            id = $Id
            snapshot = $Snapshot
            timestamp = $startedAt
            method = "GET"
            uri = $Uri
            exit_code = 1
            http_status = $null
            body = $null
            error = $_.Exception.Message
        }
    }

    Add-Content -LiteralPath $requestsPath -Value ($record | ConvertTo-Json -Compress -Depth 8) -Encoding utf8
    return [pscustomobject]$record
}

function Save-ComposeLogs {
    param([string]$Snapshot)
    foreach ($service in @("config-server", "discovery-server", "customers-service", "visits-service", "api-gateway")) {
        $logPath = Join-Path $OutputRoot "logs/$Snapshot-$service.log"
        & docker compose -p $projectName -f $composeFile logs --no-color --timestamps $service 2>&1 |
            Set-Content -LiteralPath $logPath -Encoding utf8
        Write-CommandRecord -Command "docker compose logs $service ($Snapshot)" -ExitCode $LASTEXITCODE
    }
}

$environment = [ordered]@{
    started_at = Get-Date -Format "o"
    project_name = $projectName
    repository = "https://github.com/spring-petclinic/spring-petclinic-microservices"
    baseline_commit = "3858f9c630cf989bb6809a86edf47c2be78dc9f1"
    config_revision = $expectedConfigRevision
    patch_sha256 = "42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21"
    baseline_visits_image = $baselineVisitsImage
    mutated_visits_image = $mutatedVisitsImage
    gateway_image = "p01/api-gateway:baseline-3858f9c"
    fixture = [ordered]@{
        owner_id = 6
        pet_ids = @(7, 8)
        negative_pet_id = 7
    }
}

try {
    $dockerVersion = (& docker version --format "client={{.Client.Version}} server={{.Server.Version}}").Trim()
    Write-CommandRecord -Command "docker version" -ExitCode $LASTEXITCODE
    $composeVersion = (& docker compose version --short).Trim()
    Write-CommandRecord -Command "docker compose version --short" -ExitCode $LASTEXITCODE
    $environment.docker_version = $dockerVersion
    $environment.compose_version = $composeVersion

    foreach ($image in @(
        "p01/config-server:3858f9c",
        "p01/discovery-server:3858f9c",
        "p01/customers-service:3858f9c",
        $baselineVisitsImage,
        $mutatedVisitsImage,
        "p01/api-gateway:baseline-3858f9c"
    )) {
        $identity = (& docker image inspect $image --format "{{.Id}}").Trim()
        $environment[($image.Replace("/", "_").Replace(":", "_"))] = $identity
    }

    $environment | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $OutputRoot "environment.json") -Encoding utf8

    $env:P01_VISITS_IMAGE = $baselineVisitsImage
    Invoke-DockerCompose -Arguments @("up", "-d", "config-server")
    $configResponse = Wait-Http -Uri "http://localhost:28888/api-gateway/docker"
    $configPayload = $configResponse.Content | ConvertFrom-Json
    if ($configPayload.version -ne $expectedConfigRevision) {
        throw "Config revision mismatch. Expected=$expectedConfigRevision Actual=$($configPayload.version)"
    }
    $configResponse.Content | Set-Content -LiteralPath (Join-Path $OutputRoot "config-api-gateway-docker.json") -Encoding utf8

    Invoke-DockerCompose -Arguments @("up", "-d", "discovery-server")
    $null = Wait-Http -Uri "http://localhost:28761/"

    Invoke-DockerCompose -Arguments @("up", "-d", "customers-service", "visits-service")
    $null = Wait-Http -Uri "http://localhost:28081/owners/6"
    $null = Wait-Http -Uri "http://localhost:28082/pets/visits?petId=7,8"
    $baselineVisitsIp = Get-ComposeServiceIp -Service "visits-service"
    $baselineEureka = Wait-EurekaInstance -Application "VISITS-SERVICE" -ExpectedIp $baselineVisitsIp
    $baselineEureka.Content | Set-Content -LiteralPath (Join-Path $OutputRoot "eureka-visits-baseline.json") -Encoding utf8

    Invoke-DockerCompose -Arguments @("up", "-d", "api-gateway")
    $null = Wait-Http -Uri "http://localhost:28080/api/gateway/owners/6"

    $baselineDirect = Record-Request -Id "baseline_direct" -Snapshot "baseline" -Uri "http://localhost:28082/pets/visits?petId=7,8"
    $baselineGateway = Record-Request -Id "baseline_gateway" -Snapshot "baseline" -Uri "http://localhost:28080/api/gateway/owners/6"
    $baselineNegative = Record-Request -Id "baseline_negative_overload" -Snapshot "baseline" -Uri "http://localhost:28082/owners/6/pets/7/visits"
    Save-ComposeLogs -Snapshot "baseline"

    $env:P01_VISITS_IMAGE = $mutatedVisitsImage
    $mutatedRestartEpochMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    Invoke-DockerCompose -Arguments @("up", "-d", "--no-deps", "--force-recreate", "visits-service")
    $null = Wait-Http -Uri "http://localhost:28082/pets/visits?petId=7,8&includeDetails=true"
    $mutatedVisitsIp = Get-ComposeServiceIp -Service "visits-service"
    $mutatedEureka = Wait-EurekaInstance -Application "VISITS-SERVICE" -ExpectedIp $mutatedVisitsIp -MinimumUpdatedTimestamp $mutatedRestartEpochMs
    $mutatedEureka.Content | Set-Content -LiteralPath (Join-Path $OutputRoot "eureka-visits-mutated.json") -Encoding utf8
    $gatewayPreflight = Wait-GatewayRoutesToMutatedVisits
    $gatewayPreflight.Content | Set-Content -LiteralPath (Join-Path $OutputRoot "mutated-gateway-discovery-preflight.json") -Encoding utf8

    $mutatedMissing = Record-Request -Id "mutated_direct_missing_parameter" -Snapshot "mutated" -Uri "http://localhost:28082/pets/visits?petId=7,8"
    $mutatedValid = Record-Request -Id "mutated_direct_valid_parameter" -Snapshot "mutated" -Uri "http://localhost:28082/pets/visits?petId=7,8&includeDetails=true"
    $mutatedGateway = Record-Request -Id "mutated_gateway" -Snapshot "mutated" -Uri "http://localhost:28080/api/gateway/owners/6"
    $mutatedNegative = Record-Request -Id "mutated_negative_overload" -Snapshot "mutated" -Uri "http://localhost:28082/owners/6/pets/7/visits"
    Save-ComposeLogs -Snapshot "mutated"

    & docker compose -p $projectName -f $composeFile ps --format json |
        Set-Content -LiteralPath (Join-Path $OutputRoot "compose-ps.jsonl") -Encoding utf8
    Write-CommandRecord -Command "docker compose ps --format json" -ExitCode $LASTEXITCODE

    $summary = [ordered]@{
        completed_at = Get-Date -Format "o"
        decision_input = "runtime_complete_pending_human_review"
        baseline_direct = $baselineDirect
        baseline_gateway = $baselineGateway
        baseline_negative = $baselineNegative
        mutated_missing = $mutatedMissing
        mutated_valid = $mutatedValid
        mutated_gateway = $mutatedGateway
        mutated_negative = $mutatedNegative
    }
    $summary | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutputRoot "summary.json") -Encoding utf8
    Write-Output "P01 runtime evidence: $OutputRoot"
}
finally {
    if (-not $KeepRunning) {
        try {
            Invoke-DockerCompose -Arguments @("down", "--volumes", "--remove-orphans")
        }
        catch {
            Write-Warning "Cleanup failed: $($_.Exception.Message)"
        }
    }
}
