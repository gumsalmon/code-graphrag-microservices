param(
    [string]$PilotRoot = "E:\NCKH\petclinic-pilot\spring-petclinic-microservices",
    [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $repositoryRoot "handoff-out"
}

if (-not (Test-Path -LiteralPath $PilotRoot -PathType Container)) {
    throw "Không tìm thấy checkout PetClinic: $PilotRoot"
}

$pilotPath = (Resolve-Path -LiteralPath $PilotRoot).Path
$pilotForGit = $pilotPath.Replace("\", "/")
$expectedCommit = "3858f9c630cf989bb6809a86edf47c2be78dc9f1"
$configRevision = "323993ce2519c6d02df63e08bf4458d123d3b611"

$actualCommit = (& git -c "safe.directory=$pilotForGit" -C $pilotPath rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $actualCommit -ne $expectedCommit) {
    throw "PetClinic HEAD không khớp. Expected=$expectedCommit Actual=$actualCommit"
}

& git -c "safe.directory=$pilotForGit" -C $pilotPath diff --quiet --exit-code
if ($LASTEXITCODE -ne 0) {
    throw "Tracked source PetClinic đang có thay đổi. Hãy dùng checkout sạch trước khi đóng gói."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "phat-p01-independent-input-$timestamp"
$packageDirectory = Join-Path $OutputRoot $packageName
$zipPath = Join-Path $OutputRoot "$packageName.zip"

if ((Test-Path -LiteralPath $packageDirectory) -or (Test-Path -LiteralPath $zipPath)) {
    throw "Output đã tồn tại: $packageName"
}

$null = New-Item -ItemType Directory -Path $packageDirectory
$null = New-Item -ItemType Directory -Path (Join-Path $packageDirectory "docs")
$null = New-Item -ItemType Directory -Path (Join-Path $packageDirectory "evidence/raw")
$null = New-Item -ItemType Directory -Path (Join-Path $packageDirectory "source/baseline")

$evidenceRoot = Join-Path $pilotPath "evidence_p01_runtime"
$copyPlan = @(
    @{ Source = (Join-Path $repositoryRoot "PROJECT_CONTEXT.md"); Destination = "docs/PROJECT_CONTEXT.md" },
    @{ Source = (Join-Path $repositoryRoot "tasks/PHAT_P01_INDEPENDENT_BENCHMARK.md"); Destination = "docs/PHAT_P01_INDEPENDENT_BENCHMARK.md" },
    @{ Source = (Join-Path $repositoryRoot "tasks/P01_INPUT_AUDIT.md"); Destination = "docs/P01_INPUT_AUDIT.md" },
    @{ Source = (Join-Path $evidenceRoot "mutation.patch"); Destination = "evidence/raw/mutation.patch" },
    @{ Source = (Join-Path $evidenceRoot "test_baseline.ps1"); Destination = "evidence/raw/test_baseline.ps1" },
    @{ Source = (Join-Path $evidenceRoot "test_mutated.ps1"); Destination = "evidence/raw/test_mutated.ps1" },
    @{ Source = (Join-Path $pilotPath "build_baseline.log"); Destination = "evidence/raw/build_baseline.log" },
    @{ Source = (Join-Path $evidenceRoot "build_mutated.log"); Destination = "evidence/raw/build_mutated.log" },
    @{ Source = (Join-Path $evidenceRoot "api_gateway_mutated.log"); Destination = "evidence/raw/api_gateway_mutated.log" },
    @{ Source = (Join-Path $evidenceRoot "baseline_results.log"); Destination = "evidence/raw/baseline_results.log" },
    @{ Source = (Join-Path $evidenceRoot "run_baseline_results.txt"); Destination = "evidence/raw/run_baseline_results.txt" },
    @{ Source = (Join-Path $evidenceRoot "run_mutated_results.log"); Destination = "evidence/raw/run_mutated_results.log" },
    @{ Source = (Join-Path $evidenceRoot "run_mutated_results.txt"); Destination = "evidence/raw/run_mutated_results.txt" },
    @{ Source = (Join-Path $pilotPath "docker-compose-test.yml"); Destination = "evidence/raw/docker-compose-test.yml" },
    @{ Source = (Join-Path $pilotPath "spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java"); Destination = "source/baseline/VisitResource.java" },
    @{ Source = (Join-Path $pilotPath "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java"); Destination = "source/baseline/VisitsServiceClient.java" },
    @{ Source = (Join-Path $pilotPath "spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java"); Destination = "source/baseline/ApiGatewayController.java" }
)

foreach ($item in $copyPlan) {
    if (-not (Test-Path -LiteralPath $item.Source -PathType Leaf)) {
        throw "Thiếu input bắt buộc: $($item.Source)"
    }

    $destination = Join-Path $packageDirectory $item.Destination
    $destinationParent = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $destinationParent)) {
        $null = New-Item -ItemType Directory -Path $destinationParent
    }
    Copy-Item -LiteralPath $item.Source -Destination $destination
}

$metadata = [ordered]@{
    package_kind = "p01_independent_benchmark_input"
    created_at = (Get-Date).ToString("o")
    source_repository = "https://github.com/spring-petclinic/spring-petclinic-microservices"
    source_commit = $actualCommit
    config_revision_observed = $configRevision
    tracked_source_clean_at_packaging = $true
    excluded_before_label_freeze = @(
        "evidence_p01_runtime/p01_label.md",
        "evidence_p01_runtime/report.md",
        "parser/Neo4j/GraphRAG/Vector RAG/LLM outputs and scores"
    )
    warning = "Raw evidence includes failed/noisy historical runs. Read docs/P01_INPUT_AUDIT.md; rerun is required before final acceptance."
}

$metadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $packageDirectory "PACKAGE_METADATA.json") -Encoding utf8

$checksumLines = Get-ChildItem -Recurse -File -LiteralPath $packageDirectory |
    Sort-Object FullName |
    ForEach-Object {
        $relativePath = [System.IO.Path]::GetRelativePath($packageDirectory, $_.FullName).Replace("\", "/")
        $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
        "$hash  $relativePath"
    }
$checksumLines | Set-Content -LiteralPath (Join-Path $packageDirectory "checksums.sha256") -Encoding utf8

Compress-Archive -LiteralPath $packageDirectory -DestinationPath $zipPath -CompressionLevel Optimal

Write-Output "Package directory: $packageDirectory"
Write-Output "ZIP: $zipPath"
Write-Output "Included files: $($copyPlan.Count + 2)"
Write-Output "Excluded: p01_label.md, report.md, parser/Neo4j/RAG/LLM outputs"
