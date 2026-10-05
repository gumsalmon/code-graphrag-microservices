param(
    [ValidateSet("WriteArtifacts", "VerifyArtifacts", "WriteReview", "VerifyReview")]
    [string]$Mode = "VerifyArtifacts",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$artifactManifest = "benchmark/p01/checksums.sha256"
$reviewManifest = "benchmark/p01/checksums.review.v1.sha256"
$reviewLog = "benchmark/p01/review_log.md"
$reviewDecision = "benchmark/p01/review_decision.v1.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Convert-ToRepositoryPath {
    param([string]$FullName)

    $relative = $FullName.Substring($repositoryRoot.Length).TrimStart([char[]]"\/")
    return $relative.Replace("\", "/")
}

function Resolve-RepositoryPath {
    param([string]$RelativePath)

    return Join-Path $repositoryRoot $RelativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
}

function Get-ArtifactPaths {
    $paths = New-Object System.Collections.Generic.List[string]

    $literalPaths = @(
        ".gitattributes",
        "benchmark/p01/scenario.json",
        "benchmark/p01/evidence_manifest.json",
        "benchmark/p01/derived/input_classification.md",
        "benchmark/p01/derived/runtime_rerun_attempt.md",
        "benchmark/p01/derived/runtime_rerun_report.md",
        "benchmark/p01/derived/docker-compose-rerun.yml",
        "scripts/run_p01_runtime.ps1",
        "scripts/run_p01_benchmark.ps1",
        "scripts/export_p01_benchmark_json.ps1",
        "scripts/update_p01_checksums.ps1"
    )

    foreach ($relativePath in $literalPaths) {
        if (-not (Test-Path -LiteralPath (Resolve-RepositoryPath $relativePath) -PathType Leaf)) {
            throw "Missing required artifact: $relativePath"
        }
        $paths.Add($relativePath)
    }

    $fileGroups = @(
        @{ Directory = "benchmark/protocol"; Filter = "benchmark_protocol_v*.md" },
        @{ Directory = "benchmark/p01"; Filter = "labels.v*.json" },
        @{ Directory = "benchmark/p01/raw"; Filter = "*" },
        @{ Directory = "benchmark/p01/derived/results"; Filter = "*" }
    )

    foreach ($group in $fileGroups) {
        $directory = Resolve-RepositoryPath $group.Directory
        if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
            throw "Missing required artifact directory: $($group.Directory)"
        }

        Get-ChildItem -LiteralPath $directory -Filter $group.Filter -File -Recurse |
            ForEach-Object { $paths.Add((Convert-ToRepositoryPath $_.FullName)) }
    }

    return @($paths | Sort-Object -Unique)
}

function Get-ReviewPaths {
    return @($artifactManifest, $reviewLog, $reviewDecision)
}

function Write-Manifest {
    param(
        [string[]]$Paths,
        [string]$OutputPath
    )

    $lines = foreach ($relativePath in ($Paths | Sort-Object -Unique)) {
        $fullPath = Resolve-RepositoryPath $relativePath
        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            throw "Cannot hash missing file: $relativePath"
        }
        $hash = (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant()
        "$hash  $relativePath"
    }

    $outputFullPath = Resolve-RepositoryPath $OutputPath
    [System.IO.File]::WriteAllText($outputFullPath, (($lines -join "`n") + "`n"), $utf8NoBom)
    Write-Output "Wrote $($lines.Count) entries to $OutputPath"
}

function Verify-Manifest {
    param(
        [string]$ManifestPath,
        [string[]]$ExpectedPaths
    )

    $manifestFullPath = Resolve-RepositoryPath $ManifestPath
    if (-not (Test-Path -LiteralPath $manifestFullPath -PathType Leaf)) {
        throw "Missing checksum manifest: $ManifestPath"
    }

    $manifestPaths = New-Object System.Collections.Generic.List[string]
    $errors = New-Object System.Collections.Generic.List[string]

    foreach ($line in [System.IO.File]::ReadAllLines($manifestFullPath)) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        if ($line -notmatch '^([0-9a-fA-F]{64})  (.+)$') {
            $errors.Add("Invalid checksum line: $line")
            continue
        }

        $expectedHash = $matches[1].ToLowerInvariant()
        $relativePath = $matches[2]
        $manifestPaths.Add($relativePath)
        $fullPath = Resolve-RepositoryPath $relativePath

        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            $errors.Add("Missing file: $relativePath")
            continue
        }

        $actualHash = (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -ne $expectedHash) {
            $errors.Add("Hash mismatch: $relativePath expected=$expectedHash actual=$actualHash")
        }
    }

    $expected = @($ExpectedPaths | Sort-Object -Unique)
    $actual = @($manifestPaths | Sort-Object -Unique)
    foreach ($path in $expected) {
        if ($path -notin $actual) {
            $errors.Add("Artifact missing from manifest: $path")
        }
    }
    foreach ($path in $actual) {
        if ($path -notin $expected) {
            $errors.Add("Unexpected manifest entry: $path")
        }
    }

    if ($errors.Count -gt 0) {
        throw ($errors -join [Environment]::NewLine)
    }

    Write-Output "Verified $($actual.Count) entries in $ManifestPath"
}

function Assert-ReviewDecision {
    $decisionPath = Resolve-RepositoryPath $reviewDecision
    if (-not (Test-Path -LiteralPath $decisionPath -PathType Leaf)) {
        throw "Missing review decision: $reviewDecision"
    }

    $decision = Get-Content -LiteralPath $decisionPath -Raw | ConvertFrom-Json
    $allowedDecisions = @("approve", "request_changes", "unable_to_review")
    if ($decision.decision -notin $allowedDecisions) {
        throw "Reviewer must set decision to approve, request_changes, or unable_to_review before writing the review checksum."
    }
    if ([string]::IsNullOrWhiteSpace([string]$decision.reviewer)) {
        throw "Reviewer name is required before writing the review checksum."
    }
    if ([string]::IsNullOrWhiteSpace([string]$decision.reviewed_at)) {
        throw "Review timestamp is required before writing the review checksum."
    }
    $reviewedAt = [System.DateTimeOffset]::MinValue
    if (-not [System.DateTimeOffset]::TryParse([string]$decision.reviewed_at, [ref]$reviewedAt)) {
        throw "Review timestamp must be a valid ISO-8601 value with a UTC offset."
    }
    if ([string]::IsNullOrWhiteSpace([string]$decision.comments)) {
        throw "Reviewer comments are required before writing the review checksum."
    }

    $labelPath = [string]$decision.label_file
    $labelFullPath = Resolve-RepositoryPath $labelPath
    if (-not (Test-Path -LiteralPath $labelFullPath -PathType Leaf)) {
        throw "Review decision references a missing label file: $labelPath"
    }
    $actualLabelHash = (Get-FileHash -LiteralPath $labelFullPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualLabelHash -ne ([string]$decision.label_sha256).ToLowerInvariant()) {
        throw "Review decision label hash does not match $labelPath"
    }

    $label = Get-Content -LiteralPath $labelFullPath -Raw | ConvertFrom-Json
    if ([string]$decision.scenario_id -ne [string]$label.scenario_id) {
        throw "Review decision scenario_id does not match the locked label file."
    }
    if ([string]$decision.label_version -ne [string]$label.label_version) {
        throw "Review decision label_version does not match the locked label file."
    }
    if ([string]$decision.label_protocol_version -ne [string]$label.protocol_version) {
        throw "Review decision label_protocol_version does not match the locked label file."
    }
    $reviewProtocol = [string]$decision.review_protocol_version
    if ([string]::IsNullOrWhiteSpace($reviewProtocol)) {
        throw "Review decision must name the review_protocol_version."
    }
    $reviewProtocolPath = "benchmark/protocol/benchmark_protocol_v$reviewProtocol.md"
    if (-not (Test-Path -LiteralPath (Resolve-RepositoryPath $reviewProtocolPath) -PathType Leaf)) {
        throw "Review protocol does not exist: $reviewProtocolPath"
    }
    if ([string]$decision.reviewer -eq [string]$label.annotator) {
        throw "Reviewer must be a different human from the label annotator."
    }

    if ($decision.decision -eq "approve" -and $decision.audit_decision -ne "accepted") {
        throw "An approve decision must set audit_decision to accepted."
    }
    if ($decision.decision -ne "approve" -and $decision.audit_decision -eq "accepted") {
        throw "Only an approve decision may set audit_decision to accepted."
    }
    if ($decision.decision -ne "approve" -and $decision.audit_decision -ne "pending_review") {
        throw "A non-approve decision must keep audit_decision at pending_review."
    }
}

switch ($Mode) {
    "WriteArtifacts" {
        $reviewManifestPath = Resolve-RepositoryPath $reviewManifest
        if ((Test-Path -LiteralPath $reviewManifestPath) -and -not $Force) {
            throw "A post-review manifest already exists. Use -Force only when intentionally creating a new review version."
        }
        Write-Manifest -Paths (Get-ArtifactPaths) -OutputPath $artifactManifest
        Verify-Manifest -ManifestPath $artifactManifest -ExpectedPaths (Get-ArtifactPaths)
    }
    "VerifyArtifacts" {
        Verify-Manifest -ManifestPath $artifactManifest -ExpectedPaths (Get-ArtifactPaths)
    }
    "WriteReview" {
        Verify-Manifest -ManifestPath $artifactManifest -ExpectedPaths (Get-ArtifactPaths)
        Assert-ReviewDecision
        Write-Manifest -Paths (Get-ReviewPaths) -OutputPath $reviewManifest
        Verify-Manifest -ManifestPath $reviewManifest -ExpectedPaths (Get-ReviewPaths)
    }
    "VerifyReview" {
        Verify-Manifest -ManifestPath $artifactManifest -ExpectedPaths (Get-ArtifactPaths)
        Assert-ReviewDecision
        Verify-Manifest -ManifestPath $reviewManifest -ExpectedPaths (Get-ReviewPaths)
    }
}
