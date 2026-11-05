param([switch]$ReadForRunner, [switch]$Check)

$ErrorActionPreference = 'Stop'
# Use the current shell's modules, not an inherited PowerShell 7 module path in Windows PowerShell 5.
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop
$credentialRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$credentialFile = Join-Path $credentialRepo 'handoff-out/credentials/gemini-api-key.clixml'

if ($Check) {
    @{ CredentialFileExists = (Test-Path -LiteralPath $credentialFile -PathType Leaf) } | ConvertTo-Json -Compress
    exit 0
}

if ($ReadForRunner) {
    # Internal pipe used by Node ONLY. Never invoke this flag in a terminal or tool transcript.
    try {
        $credentialSecure = Import-Clixml -LiteralPath $credentialFile
        if ($credentialSecure -isnot [Security.SecureString]) { throw 'Invalid encrypted credential' }
        $credentialPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credentialSecure)
        try { [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($credentialPointer)) }
        finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($credentialPointer) }
        exit 0
    } catch {
        [Console]::Error.Write('Cannot decrypt the local Gemini credential as this Windows user.')
        exit 1
    }
}

$credentialIgnoredPath = 'handoff-out/credentials/gemini-api-key.clixml'
& git -c "safe.directory=$($credentialRepo.Replace('\', '/'))" -C $credentialRepo check-ignore --quiet -- $credentialIgnoredPath
if ($LASTEXITCODE -ne 0) { throw 'Credential location is not Git ignored; no key will be saved.' }
if (Test-Path -LiteralPath $credentialFile) {
    $credentialReplace = Read-Host 'Key da luu. Nhap REPLACE neu muon thay key (Enter de huy)'
    if ($credentialReplace -cne 'REPLACE') { Write-Host 'Khong thay doi key.'; exit 0 }
}
Write-Host 'Chi su dung key cua project Free Tier; khong bat billing. Khong dan key vao chat.'
$credentialSecure = Read-Host 'Dan Gemini API key (noi dung se duoc an)' -AsSecureString
if ($credentialSecure.Length -eq 0) { throw 'Key is empty; nothing saved.' }
$credentialValidationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credentialSecure)
try {
    $credentialValidationText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($credentialValidationPointer)
    if ($credentialValidationText.Length -gt 4096 -or $credentialValidationText -cnotmatch '^[\x21-\x7e]+$' -or $credentialValidationText -match '^\*+$') {
        throw 'Key contains invalid characters or a masked preview. Use Copy key in AI Studio and paste the actual key. Nothing saved; any existing key is unchanged.'
    }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($credentialValidationPointer)
    $credentialValidationText = $null
}
$credentialDir = Split-Path -Parent $credentialFile
if (-not (Test-Path -LiteralPath $credentialDir)) { New-Item -ItemType Directory -Path $credentialDir | Out-Null }
$credentialSecure | Export-Clixml -LiteralPath $credentialFile -Encoding UTF8
Write-Host 'Da luu key ma hoa bang Windows DPAPI cho tai khoan Windows hien tai, trong thu muc Git ignored.'
Write-Host 'Khong can gui key, file credential hoac anh chup key cho bat ky ai.'
