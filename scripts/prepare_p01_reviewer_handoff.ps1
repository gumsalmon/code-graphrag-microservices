param(
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$BenchmarkCommit = '5f9204d66253604edf9101c2f888fc7e75aa0be7',
    [string]$PetclinicRepository = 'E:/NCKH/petclinic-pilot/spring-petclinic-microservices',
    [string]$ConfigRepository = 'E:/NCKH/petclinic-pilot/spring-petclinic-microservices-config',
    [string]$OutputRoot = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$templates = Join-Path $repositoryRoot 'tasks/p01-reviewer'
$baselineCommit = '3858f9c630cf989bb6809a86edf47c2be78dc9f1'
$configCommit = '323993ce2519c6d02df63e08bf4458d123d3b611'
$labelHash = '3cc4784c9827f2ac8a034cfe44bbdb838b21ebb7f8a7f9ac49864c70162e2bce'
$patchHash = '42394ca361d07db58ba6a73cfc1ddb8bd1d9aeddb59292873552573adfa5cc21'
$utf8 = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Invoke-Git {
    param([string]$Repo, [string[]]$Arguments)
    $safePath = [System.IO.Path]::GetFullPath($Repo).Replace('\', '/')
    $result = @(& git -c "safe.directory=$safePath" -C $Repo @Arguments)
    if ($LASTEXITCODE -ne 0) { throw "Git failed in $Repo : $($Arguments -join ' ')" }
    return $result
}

function Get-Hash {
    param([string]$File)
    return (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Write-Json {
    param([string]$File, [object]$Value)
    [System.IO.File]::WriteAllText($File, (($Value | ConvertTo-Json -Depth 15) + "`n"), $utf8)
}

function Export-Snapshot {
    param([string]$Repo, [string]$Commit, [string]$Name)
    $resolved = @(Invoke-Git $Repo @('rev-parse', '--verify', "$Commit^{commit}"))
    if ($resolved[0] -ne $Commit) { throw "Commit did not resolve exactly: $Commit" }
    $paths = @(Invoke-Git $Repo @('ls-tree', '-r', '--name-only', $Commit))
    foreach ($path in $paths) {
        if ($path -match '(^|/)(\.git|\.env|\.envrc|credentials|id_rsa|id_ed25519)(/|$)' -or
            $path -match '\.(pem|key|pfx)$') { throw "Sensitive-looking tracked path: $path" }
    }
    $archive = Join-Path $buildRoot "$Name.snapshot.zip"
    $destination = Join-Path $buildRoot $Name
    $null = Invoke-Git $Repo @('archive', '--format=zip', "--output=$archive", $Commit)
    [System.IO.Compression.ZipFile]::ExtractToDirectory($archive, $destination)
    $actual = @(Get-ChildItem -LiteralPath $destination -Recurse -File -Force |
        ForEach-Object { $_.FullName.Substring($destination.Length + 1).Replace('\', '/') })
    if (@(Compare-Object $paths $actual).Count -ne 0) {
        throw "Archive file set differs from Git tree: $Name (export-ignore/submodules?)"
    }
    return $destination
}

function Copy-FilePreservingBytes {
    param([string]$From, [string]$To)
    $null = New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($To)) -Force
    Copy-Item -LiteralPath $From -Destination $To
    if ((Get-Hash $From) -ne (Get-Hash $To)) { throw "Copy changed bytes: $From" }
}

function Copy-Tree {
    param([string]$From, [string]$To)
    foreach ($file in (Get-ChildItem -LiteralPath $From -Recurse -File -Force)) {
        $relative = $file.FullName.Substring($From.Length + 1)
        Copy-FilePreservingBytes $file.FullName (Join-Path $To $relative)
    }
}

function Install-Template {
    param([string]$Name, [string]$Destination)
    $content = [System.IO.File]::ReadAllText((Join-Path $templates $Name))
    $content = $content.Replace('{{BENCHMARK_SHA}}', $BenchmarkCommit)
    [System.IO.File]::WriteAllText((Join-Path $Destination $Name), $content, $utf8)
}

function Verify-Artifacts {
    param([string]$Snapshot)
    $output = @(& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Snapshot 'scripts/update_p01_checksums.ps1') -Mode VerifyArtifacts 2>&1)
    if ($LASTEXITCODE -ne 0 -or ($output -join "`n") -notmatch 'Verified 117 entries') {
        throw "Original P01 checksum verification failed: $($output -join ' ')"
    }
    return ($output -join "`n")
}

function Seal-Package {
    param([string]$Folder, [string]$Name)
    $lines = @(Get-ChildItem -LiteralPath $Folder -Recurse -File -Force |
        Sort-Object FullName | ForEach-Object {
            $relative = $_.FullName.Substring($Folder.Length + 1).Replace('\', '/')
            "$(Get-Hash $_.FullName)  $relative"
        })
    [System.IO.File]::WriteAllText((Join-Path $Folder 'SHA256SUMS.txt'), (($lines -join "`n") + "`n"), $utf8)
    $beforeZip = @(& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Folder 'VERIFY_PACKAGE.ps1') 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Package verification failed: $beforeZip" }
    $zipPath = Join-Path $buildRoot "$Name.zip"
    # .NET Framework CreateFromDirectory can emit backslash member names on Windows.
    # Use portable forward-slash ZIP names without changing file bytes.
    $archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in (Get-ChildItem -LiteralPath $Folder -Recurse -File -Force | Sort-Object FullName)) {
            $relative = $file.FullName.Substring($Folder.Length + 1).Replace('\', '/')
            $entry = $archive.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
            $inputStream = [System.IO.File]::OpenRead($file.FullName)
            $outputStream = $entry.Open()
            try { $inputStream.CopyTo($outputStream) }
            finally { $inputStream.Dispose(); $outputStream.Dispose() }
        }
    } finally { $archive.Dispose() }
    $inspection = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        foreach ($entry in $inspection.Entries) {
            if ($entry.FullName.Contains('\')) { throw 'Nonportable backslash ZIP member name' }
        }
    } finally { $inspection.Dispose() }
    $unpacked = Join-Path $buildRoot $(if ($Name -eq 'P01-ROUND1-SOURCE-FIRST') { 'v-r1' } else { 'v-r2' })
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $unpacked)
    $afterZip = @(& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $unpacked 'VERIFY_PACKAGE.ps1') 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Extracted ZIP verification failed: $afterZip" }
    # The package manifest is not self-hashed: compare it explicitly after ZIP roundtrip.
    if ((Get-Hash (Join-Path $Folder 'SHA256SUMS.txt')) -ne
        (Get-Hash (Join-Path $unpacked 'SHA256SUMS.txt'))) { throw 'ZIP changed manifest bytes' }
    return [ordered]@{
        file = "$Name.zip"; sha256 = Get-Hash $zipPath
        bytes = (Get-Item -LiteralPath $zipPath).Length; package_files = $lines.Count
        verified_before_zip = $true; verified_after_extract = $true; portable_member_names = $true
    }
}

if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $repositoryRoot 'handoff-out' }
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$buildId = 'p01-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + $BenchmarkCommit.Substring(0, 7)
$buildRoot = Join-Path $OutputRoot $buildId
if (Test-Path -LiteralPath $buildRoot) { throw "Refusing to overwrite existing build: $buildRoot" }
$null = New-Item -ItemType Directory -Path $buildRoot
$startedAt = [DateTimeOffset]::UtcNow.ToString('o')
$benchmark = Export-Snapshot $repositoryRoot $BenchmarkCommit 'benchmark-snapshot'
$upstream = Export-Snapshot $PetclinicRepository $baselineCommit 'petclinic-snapshot'
$config = Export-Snapshot $ConfigRepository $configCommit 'config-snapshot'
$artifactVerification = Verify-Artifacts $benchmark
if ((Get-Hash (Join-Path $benchmark 'benchmark/p01/labels.v3.json')) -ne $labelHash) { throw 'Unexpected labels.v3 hash' }
$originalPatch = Join-Path $benchmark 'benchmark/p01/raw/historical/mutation.patch'
if ((Get-Hash $originalPatch) -ne $patchHash) { throw 'Unexpected mutation.patch hash' }
$decision = Get-Content -LiteralPath (Join-Path $benchmark 'benchmark/p01/review_decision.v1.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($null -ne $decision.decision -or $null -ne $decision.reviewer -or $decision.audit_decision -ne 'pending_review') {
    throw 'Source already has a reviewer decision; prepare a new explicit handoff instead'
}

# Compare snapshot source to full upstream, allowing only CRLF/LF differences.
$sourcePaths = [ordered]@{
    'ApiGatewayController.java' = 'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java'
    'VisitsServiceClient.java' = 'spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/application/VisitsServiceClient.java'
    'VisitResource.java' = 'spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java'
}
$sourceChecks = @(foreach ($name in $sourcePaths.Keys) {
    $snapshotFile = Join-Path $benchmark "benchmark/p01/raw/source_baseline/$name"
    $upstreamFile = Join-Path $upstream $sourcePaths[$name]
    $snapshotText = [System.IO.File]::ReadAllText($snapshotFile).Replace("`r`n", "`n")
    $upstreamText = [System.IO.File]::ReadAllText($upstreamFile).Replace("`r`n", "`n")
    if ($snapshotText -cne $upstreamText) { throw "Source snapshot differs beyond line endings: $name" }
    [ordered]@{ snapshot = $name; upstream = $sourcePaths[$name]; equivalent_after_crlf_to_lf_only = $true
        snapshot_sha256 = Get-Hash $snapshotFile; upstream_sha256 = Get-Hash $upstreamFile }
})

$round1 = Join-Path $buildRoot 'r1'
$round2 = Join-Path $buildRoot 'r2'
$null = New-Item -ItemType Directory -Path $round1, $round2
Copy-Tree $upstream (Join-Path $round1 'petclinic-source')
Copy-Tree $config (Join-Path $round1 'petclinic-config')
$selected = @(Get-ChildItem -LiteralPath (Join-Path $benchmark 'benchmark/p01/raw') -File -Recurse | Where-Object {
    $relative = $_.FullName.Substring($benchmark.Length + 1).Replace('\', '/')
    $relative -match '^benchmark/p01/raw/source_baseline/(ApiGatewayController|VisitsServiceClient|VisitResource)\.java$' -or
    $relative -eq 'benchmark/p01/raw/historical/mutation.patch' -or
    $relative -match '^benchmark/p01/raw/rerun-\d{8}-\d{6}/(commands\.log|environment\.json|compose-ps\.jsonl|config-api-gateway-docker\.json|eureka-visits-(baseline|mutated)\.json|mutated-gateway-discovery-preflight\.json|requests\.jsonl|failure-compose-ps\.jsonl|failure\.json|logs/[^/]+\.log)$'
})
foreach ($file in $selected) {
    $relative = $file.FullName.Substring($benchmark.Length + 1)
    Copy-FilePreservingBytes $file.FullName (Join-Path $round1 "evidence/$relative")
}
foreach ($run in @('rerun-20260923-152742', 'rerun-20260923-214211')) {
    foreach ($required in @('environment.json', 'commands.log', 'requests.jsonl', 'mutated-gateway-discovery-preflight.json')) {
        if (-not (Test-Path -LiteralPath (Join-Path $round1 "evidence/benchmark/p01/raw/$run/$required"))) {
            throw "Required round-one evidence absent: $run/$required"
        }
    }
}
$patchBytes = [System.IO.File]::ReadAllBytes($originalPatch)
if ($patchBytes[0] -ne 255 -or $patchBytes[1] -ne 254) { throw 'Expected UTF-16LE BOM in original patch' }
$patchText = [System.Text.Encoding]::Unicode.GetString($patchBytes, 2, $patchBytes.Length - 2)
$readablePatch = Join-Path $round1 'mutation-readable.utf8.patch'
[System.IO.File]::WriteAllText($readablePatch, $patchText, $utf8)
if ([System.IO.File]::ReadAllText($readablePatch) -cne $patchText) { throw 'Patch encoding conversion changed text' }
# Explicit git-dir/work-tree avoids silently skipping patch paths due to the enclosing research repo.
$upstreamGitDir = @(Invoke-Git $PetclinicRepository @('rev-parse', '--absolute-git-dir'))
$ErrorActionPreference = 'Continue' # Windows PowerShell treats Git's verbose stderr as an ErrorRecord.
$patchCheck = @(& git -c "safe.directory=$($upstream.Replace('\', '/'))" -C $upstream "--git-dir=$($upstreamGitDir[0])" "--work-tree=$upstream" apply --check --verbose $readablePatch 2>&1)
$patchCheckExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($patchCheckExitCode -ne 0 -or ($patchCheck -join "`n") -notmatch 'Checking patch' -or
    ($patchCheck -join "`n") -match 'Skipped patch') { throw "Patch check failed/skipped: $patchCheck" }
Install-Template 'ROUND1_READ_FIRST.md' $round1
Install-Template 'INDEPENDENT_NOTES_TEMPLATE.md' $round1
Install-Template 'VERIFY_PACKAGE.ps1' $round1
Write-Json (Join-Path $round1 'PACKAGE_METADATA.json') ([ordered]@{
    schema_version = '1.0'; stage = 'source_first'; benchmark_commit = $BenchmarkCommit
    created_at_utc = $startedAt; petclinic_commit = $baselineCommit; config_commit = $configCommit
    original_patch_sha256 = $patchHash; readable_patch_sha256 = Get-Hash $readablePatch
    readable_patch_transform = 'UTF-16LE BOM -> UTF-8 without BOM; decoded text unchanged; original preserved'
    readable_patch_git_apply_check_passed = $true
    source_checks = $sourceChecks; selected_evidence_count = $selected.Count
    selected_evidence = @($selected | ForEach-Object {
        [ordered]@{ source_path = $_.FullName.Substring($benchmark.Length + 1).Replace('\', '/'); sha256 = Get-Hash $_.FullName }
    })
    selection_policy = 'Full upstream source/config; three supplied Java snapshots; original patch; all rerun raw observations and diagnostics via allowlist; no summaries'
    limitations = @('Not fully blind: raw request names and fixture were chosen by the evidence producer', 'Upstream/source tests have not been executed by this packaging script', 'Runtime evidence supplied, not independently rerun by packaging')
})
Copy-Tree $benchmark (Join-Path $round2 'repository')
Install-Template 'ROUND2_READ_FIRST.md' $round2
Install-Template 'REVIEW_RETURN_TEMPLATE.md' $round2
Install-Template 'VERIFY_PACKAGE.ps1' $round2
Write-Json (Join-Path $round2 'PACKAGE_METADATA.json') ([ordered]@{
    schema_version = '1.0'; stage = 'compare_and_decide'; benchmark_commit = $BenchmarkCommit
    created_at_utc = $startedAt; pr_url = 'https://github.com/gumsalmon/code-graphrag-microservices/pull/2'
    labels_v3_sha256 = $labelHash; original_p01_artifact_verification = $artifactVerification
    review_state = 'pending_review'; repository_contents = 'Entire tracked Git archive at pinned commit; no .git or untracked local files'
    prerequisite = 'Receive immutable human round-one notes, hash and timestamp before releasing this package'
})
Install-Template 'COORDINATOR.md' $buildRoot
Install-Template 'NEXT_REVIEW_MILESTONE.md' $buildRoot

# Explicit anti-leak guard on supplied benchmark evidence (upstream source is unrelated to research outputs).
$forbidden = @(Get-ChildItem -LiteralPath (Join-Path $round1 'evidence') -Recurse -File | Where-Object {
    $_.Name -match '^(summary\.json|labels\.|scenario\.json|evidence_manifest\.json|PROJECT_CONTEXT\.md|HANDOFF\.md|REVIEW_GUIDE\.md|review_log\.md)' -or
    $_.FullName -match '[/\\](derived|results)[/\\]'
})
if ($forbidden.Count -ne 0) { throw 'Round-one evidence contains draft labels/interpretations' }
$archives = @((Seal-Package $round1 'P01-ROUND1-SOURCE-FIRST'), (Seal-Package $round2 'P01-ROUND2-COMPARE-AND-DECIDE'))
$extractedVerification = Verify-Artifacts (Join-Path $buildRoot 'v-r2/repository')
[System.IO.File]::WriteAllText((Join-Path $buildRoot 'ARCHIVES.sha256'),
    (($archives | ForEach-Object { "$($_.sha256)  $($_.file)" }) -join "`n") + "`n", $utf8)
Write-Json (Join-Path $buildRoot 'BUILD_VERIFICATION.json') ([ordered]@{
    benchmark_commit = $BenchmarkCommit; created_at_utc = $startedAt
    original_p01_artifact_verification = $artifactVerification
    extracted_round2_artifact_verification = $extractedVerification
    round1_supplied_evidence_files = $selected.Count; round1_draft_output_exclusion_passed = $true
    source_checks = $sourceChecks; archives = $archives
    review_state = 'pending_review'; runtime_rerun_performed = $false
    git_checkout_commit_merge_push_performed = $false
    readable_patch_git_apply_check = ($patchCheck -join "`n")
    packaging_script_sha256 = Get-Hash $PSCommandPath
    coordinator_template_sha256 = Get-Hash (Join-Path $templates 'COORDINATOR.md')
})
Write-Output "Prepared both rounds: $buildRoot"
Write-Output 'Send round one only now. Release round two + PR only after receiving human independent notes.'
