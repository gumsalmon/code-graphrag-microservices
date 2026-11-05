param([Parameter(Mandatory=$true)][string]$Source, [Parameter(Mandatory=$true)][string]$Zip, [Parameter(Mandatory=$true)][string]$ExtractTo)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$p02ZipRoot = (Resolve-Path -LiteralPath $Source).Path
if ((Test-Path -LiteralPath $Zip) -or (Test-Path -LiteralPath $ExtractTo)) { throw 'Output already exists; never overwrite' }
$p02Archive = [System.IO.Compression.ZipFile]::Open($Zip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($p02File in (Get-ChildItem -LiteralPath $p02ZipRoot -Recurse -File -Force | Sort-Object FullName)) {
        if ($p02File.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'No reparse points in ZIP' }
        $p02Member = $p02File.FullName.Substring($p02ZipRoot.Length + 1).Replace('\', '/')
        $p02Entry = $p02Archive.CreateEntry($p02Member, [System.IO.Compression.CompressionLevel]::Optimal)
        $p02Input = [System.IO.File]::OpenRead($p02File.FullName); $p02Output = $p02Entry.Open()
        try { $p02Input.CopyTo($p02Output) } finally { $p02Input.Dispose(); $p02Output.Dispose() }
    }
} finally { $p02Archive.Dispose() }
$p02Inspection = [System.IO.Compression.ZipFile]::OpenRead($Zip); $p02Names = @{}
try {
    foreach ($p02Entry in $p02Inspection.Entries) {
        if ($p02Entry.FullName -notmatch '^[A-Za-z0-9_.@/-]+$' -or $p02Entry.FullName.StartsWith('/') -or ($p02Entry.FullName.Split('/') | Where-Object { $_ -eq '..' -or $_ -eq '.' -or $_ -eq '' }) -or $p02Names.ContainsKey($p02Entry.FullName)) { throw 'Unsafe/nonportable ZIP member' }
        $p02Names[$p02Entry.FullName] = $true
    }
} finally { $p02Inspection.Dispose() }
[System.IO.Compression.ZipFile]::ExtractToDirectory($Zip, $ExtractTo)
Write-Output "ZIP created and extracted for verification: $Zip"
