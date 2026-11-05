param([string]$OutputRoot = '')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $repoRoot 'handoff-out' }
$testRoot = Join-Path $OutputRoot ('package-tests-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path -LiteralPath $testRoot) { throw 'Refusing to overwrite test output' }
$null = New-Item -ItemType Directory -Path $testRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$passed = @()
foreach ($case in @('valid', 'changed', 'missing', 'extra', 'duplicate', 'escape', 'empty')) {
    $folder = Join-Path $testRoot $case
    $null = New-Item -ItemType Directory -Path $folder
    Copy-Item -LiteralPath (Join-Path $repoRoot 'tasks/p01-reviewer/VERIFY_PACKAGE.ps1') -Destination $folder
    $payload = Join-Path $folder 'payload.txt'
    [System.IO.File]::WriteAllText($payload, 'original bytes', $utf8)
    $lines = @('payload.txt', 'VERIFY_PACKAGE.ps1') | ForEach-Object {
        "$((Get-FileHash -LiteralPath (Join-Path $folder $_) -Algorithm SHA256).Hash.ToLowerInvariant())  $_"
    }
    switch ($case) {
        'changed' { [System.IO.File]::WriteAllText($payload, 'tampered', $utf8) }
        'missing' { Move-Item -LiteralPath $payload -Destination (Join-Path $testRoot 'missing-payload.txt') }
        'extra' { [System.IO.File]::WriteAllText((Join-Path $folder 'injected.txt'), 'unexpected', $utf8) }
        'duplicate' { $lines += $lines[0] }
        'escape' { $lines += ('0' * 64) + '  ../outside.txt' }
        'empty' { $lines = @() }
    }
    [System.IO.File]::WriteAllText((Join-Path $folder 'SHA256SUMS.txt'), ($lines -join "`n"), $utf8)
    $ErrorActionPreference = 'Continue'
    $output = @(& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $folder 'VERIFY_PACKAGE.ps1') 2>&1)
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    [System.IO.File]::WriteAllText((Join-Path $testRoot "$case.log"), ($output -join "`n"), $utf8)
    if ($case -eq 'valid' -and $exitCode -ne 0) { throw "Valid package rejected: $output" }
    if ($case -ne 'valid' -and $exitCode -eq 0) { throw "Invalid package accepted: $case" }
    $expectedFailure = switch ($case) {
        'changed' { 'Hash mismatch' }; 'missing' { 'Missing file' }; 'extra' { 'Unexpected file' }
        'duplicate' { 'Duplicate manifest' }; 'escape' { 'Unsafe or self-referencing' }; 'empty' { 'Empty manifest' }
    }
    if ($case -ne 'valid' -and ($output -join "`n") -notmatch [regex]::Escape($expectedFailure)) {
        throw "Wrong failure reason for $case : $output"
    }
    $passed += [ordered]@{ case = $case; exit_code = $exitCode; expected_outcome = $true }
}
[System.IO.File]::WriteAllText((Join-Path $testRoot 'results.json'), ($passed | ConvertTo-Json), $utf8)
Write-Output "7/7 package verifier cases passed. Logs: $testRoot"
