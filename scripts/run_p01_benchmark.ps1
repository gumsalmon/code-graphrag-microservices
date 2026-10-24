param(
    [string]$OutputRoot = "",
    [string]$OutputPath = "",
    [switch]$KeepRunning,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputRoot = Join-Path $repositoryRoot "benchmark/p01/raw/rerun-$timestamp"
}
elseif (-not [System.IO.Path]::IsPathRooted($OutputRoot)) {
    $OutputRoot = Join-Path $repositoryRoot $OutputRoot
}

$runtimeScript = Join-Path $PSScriptRoot "run_p01_runtime.ps1"
$exportScript = Join-Path $PSScriptRoot "export_p01_benchmark_json.ps1"

Write-Output "Running P01 baseline and patched snapshots..."
& $runtimeScript -OutputRoot $OutputRoot -KeepRunning:$KeepRunning

$exportArguments = @{
    RunDirectory = $OutputRoot
    Force = $Force
}
if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
    $exportArguments.OutputPath = $OutputPath
}

Write-Output "Exporting machine-readable benchmark result..."
& $exportScript @exportArguments

