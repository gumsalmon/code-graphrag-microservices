param([string]$Root = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$taskRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd('\','/')
$manifestPath = Join-Path $taskRoot 'SHA256SUMS.txt'
$expected = @{}
foreach ($line in [System.IO.File]::ReadAllLines($manifestPath)) {
    if ($line -notmatch '^([0-9a-f]{64})  ([A-Za-z0-9_.@/-]+)$') { throw 'Invalid manifest line' }
    $hash = $Matches[1]; $member = $Matches[2]
    if ($member.StartsWith('/') -or @($member.Split('/') | Where-Object { $_ -eq '' -or $_ -eq '.' -or $_ -eq '..' }).Count -gt 0 -or $expected.ContainsKey($member)) { throw 'Unsafe or duplicate member' }
    $expected[$member] = $hash
}
if ($expected.Count -lt 1 -or $expected.Count -gt 10000) { throw 'Unexpected manifest size' }
$actual = @{}
foreach ($file in Get-ChildItem -LiteralPath $taskRoot -Recurse -File -Force) {
    if (($file.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked file not allowed' }
    $member = $file.FullName.Substring($taskRoot.Length + 1).Replace('\','/')
    if ($member -eq 'SHA256SUMS.txt') { continue }
    if (-not $expected.ContainsKey($member)) { throw "Unexpected file: $member" }
    $actual[$member] = $true
    if ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected[$member]) { throw "Checksum mismatch: $member" }
}
if ($actual.Count -ne $expected.Count) { throw 'Missing package file' }
$meta = Get-Content -LiteralPath (Join-Path $taskRoot 'PACKAGE_METADATA.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$indexPath = Join-Path $taskRoot 'EVIDENCE_INDEX.json'
$index = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($meta.schema -ne 'petclinic-review-package/1' -or $meta.review_round -notin @(1,2)) { throw 'Invalid metadata' }
if ($null -ne $meta.review_decision -or $meta.ground_truth_accepted) { throw 'Unexpected review decision' }
if ((Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $meta.evidence_index_sha256) { throw 'Index hash differs' }
if ($meta.review_round -ne $index.review_round) { throw 'Wrong index role' }
foreach ($row in $index.files) {
    if ($row.stored_path -ne ('artifacts/' + $row.sha256 + '.txt') -or $row.case -notin @('P01','P02','P03')) { throw 'Invalid evidence binding' }
    if ($meta.review_round -eq 1 -and $row.logical_path -match '(?i)labels\.|annotation|notes_by|exposure|graph\.native|neo4j') { throw 'Annotation or method output in R1' }
}
[PSCustomObject]@{
    integrity_verified = $true
    package_id = $meta.package_id
    review_round = $meta.review_round
    manifest_sha256 = (Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    physical_files_verified = $expected.Count
    logical_evidence_files = @($index.files).Count
    human_reading_certified = $false
    review_decision_created = $false
    note = 'Integrity only. For retained R1 file-checkpoint verification use VERIFY_PACKAGE.py; follow START_HERE.md.'
} | ConvertTo-Json -Depth 4
