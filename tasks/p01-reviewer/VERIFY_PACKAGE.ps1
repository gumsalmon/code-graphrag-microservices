# Verifies immutable handoff files; keep completed reviewer notes outside the package.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$packageRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $packageRoot.TrimEnd([char[]]'\/') + [System.IO.Path]::DirectorySeparatorChar
$manifest = Join-Path $packageRoot 'SHA256SUMS.txt'
if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) { throw 'Missing SHA256SUMS.txt' }
$listed = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
foreach ($line in [System.IO.File]::ReadAllLines($manifest)) {
    if ($line -notmatch '^([0-9a-f]{64})  (.+)$') { throw 'Invalid checksum manifest line' }
    $expectedHash = $matches[1]
    $relative = $matches[2]
    if ($relative -eq 'SHA256SUMS.txt' -or $relative.Contains('\') -or
        $relative.Contains(':') -or $relative -match '(^/|(^|/)\.\.?(/|$))') {
        throw "Unsafe or self-referencing manifest path: $relative"
    }
    if (-not $listed.Add($relative)) { throw "Duplicate manifest path: $relative" }
    $file = [System.IO.Path]::GetFullPath((Join-Path $packageRoot $relative))
    if (-not $file.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path escapes package: $relative"
    }
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing file: $relative" }
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
        throw "Hash mismatch: $relative"
    }
}
if ($listed.Count -eq 0) { throw 'Empty manifest' }
foreach ($item in (Get-ChildItem -LiteralPath $packageRoot -Recurse -Force)) {
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Symlink/reparse point not allowed: $($item.FullName)"
    }
    if ($item.PSIsContainer) { continue }
    $relative = $item.FullName.Substring($rootPrefix.Length).Replace('\', '/')
    if ($relative -ne 'SHA256SUMS.txt' -and -not $listed.Contains($relative)) {
        throw "Unexpected file: $relative"
    }
}
Write-Output "Verified $($listed.Count) package files. This checks bytes, not scientific acceptance."
