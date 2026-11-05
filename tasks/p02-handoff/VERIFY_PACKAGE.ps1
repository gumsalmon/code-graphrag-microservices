param([string]$PackageRoot = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
$p02VerifyRoot = (Resolve-Path -LiteralPath $PackageRoot).Path
$p02Expected = @{}
foreach ($p02Line in [System.IO.File]::ReadAllLines((Join-Path $p02VerifyRoot 'SHA256SUMS.txt'))) {
    if ($p02Line -notmatch '^([a-f0-9]{64})  ([A-Za-z0-9_.@/-]+)$') { throw 'Invalid manifest line' }
    $p02Hash = $Matches[1]; $p02Name = $Matches[2]
    if ($p02Name.StartsWith('/') -or ($p02Name.Split('/') | Where-Object { $_ -eq '.' -or $_ -eq '..' -or $_ -eq '' }) -or $p02Expected.ContainsKey($p02Name)) { throw 'Unsafe or duplicate path' }
    $p02Expected[$p02Name] = $p02Hash
}
$p02Files = @(Get-ChildItem -LiteralPath $p02VerifyRoot -Recurse -File -Force | Where-Object { $_.FullName -ne (Join-Path $p02VerifyRoot 'SHA256SUMS.txt') })
if ($p02Files.Count -ne $p02Expected.Count) { throw 'Missing or unmanifested files' }
foreach ($p02File in $p02Files) {
    if ($p02File.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Reparse point not permitted' }
    $p02Name = $p02File.FullName.Substring($p02VerifyRoot.Length + 1).Replace('\', '/')
    $p02Sha = [System.Security.Cryptography.SHA256]::Create()
    $p02Stream = [System.IO.File]::OpenRead($p02File.FullName)
    try { $p02ActualHash = [System.BitConverter]::ToString($p02Sha.ComputeHash($p02Stream)).Replace('-', '').ToLowerInvariant() }
    finally { $p02Stream.Dispose(); $p02Sha.Dispose() }
    if (!$p02Expected.ContainsKey($p02Name) -or $p02ActualHash -ne $p02Expected[$p02Name]) { throw "File differs: $p02Name" }
}
Write-Output "Verified $($p02Expected.Count) files. Byte integrity only; not label approval or runtime rerun."
